/**
 * Pièces justificatives du praticien (SFD §4.1.2).
 *
 * « Upload obligatoire : copie du diplôme vétérinaire + carte d'ordre
 *   (formats JPG/PDF, max 5 Mo). »
 *
 * Sans ces pièces, la validation administrateur prévue par la spécification n'a
 * rien à examiner — c'est la raison d'être de ce module.
 *
 * - POST   /vet-credentials         dépôt d'une pièce (multipart, champ `file`)
 * - GET    /vet-credentials         mes pièces déposées
 * - DELETE /vet-credentials/:id     retrait d'une pièce, tant que le compte est en attente
 */
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { uploadsDir } from './uploads.js';

export const credentialsRouter = Router();

/** Plafond imposé par la SFD §4.1.2. */
const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'application/pdf']);

const credentialsDir = path.join(uploadsDir, 'credentials');
if (!fs.existsSync(credentialsDir)) {
  fs.mkdirSync(credentialsDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, credentialsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.bin';
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('Formats acceptés : JPG, PNG ou PDF.'));
    }
    cb(null, true);
  },
});

/** Récupère le profil praticien de l'appelant, ou null s'il n'en a pas. */
async function myVetProfile(userId: string) {
  return prisma.vetProfile.findUnique({ where: { userId } });
}

credentialsRouter.post(
  '/',
  requireAuth,
  requireRole('VETERINAIRE'),
  (req, res, next) => {
    upload.single('file')(req, res, (err: unknown) => {
      if (err) {
        const message =
          err instanceof Error && err.message.includes('File too large')
            ? 'Fichier trop volumineux : 5 Mo maximum.'
            : err instanceof Error
              ? err.message
              : 'Dépôt impossible.';
        return res.status(400).json({ success: false, error: message });
      }
      next();
    });
  },
  async (req, res) => {
    const type = String(req.body?.type ?? '').toUpperCase();

    if (type !== 'DIPLOMA' && type !== 'ORDER_CARD') {
      return res
        .status(400)
        .json({ success: false, error: 'Type attendu : DIPLOMA ou ORDER_CARD.' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Aucun fichier reçu.' });
    }

    try {
      const profile = await myVetProfile(req.user!.id);
      if (!profile) {
        return res.status(404).json({ success: false, error: 'Profil vétérinaire introuvable.' });
      }

      // Une seule pièce courante par type : le dépôt remplace la précédente.
      const previous = await prisma.vetCredential.findFirst({
        where: { vetProfileId: profile.id, type },
      });
      if (previous) {
        await prisma.vetCredential.delete({ where: { id: previous.id } });
        fs.promises
          .unlink(path.join(uploadsDir, previous.fileUrl.replace(/^\/uploads\//, '')))
          .catch(() => {});
      }

      const credential = await prisma.vetCredential.create({
        data: {
          vetProfileId: profile.id,
          type,
          fileUrl: `/uploads/credentials/${req.file.filename}`,
          mimeType: req.file.mimetype,
          sizeBytes: req.file.size,
          originalName: req.file.originalname,
        },
      });

      res.status(201).json({ success: true, data: credential });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Dépôt impossible.',
      });
    }
  }
);

credentialsRouter.get('/', requireAuth, requireRole('VETERINAIRE'), async (req, res) => {
  try {
    const profile = await myVetProfile(req.user!.id);
    if (!profile) return res.json({ success: true, data: [] });

    const credentials = await prisma.vetCredential.findMany({
      where: { vetProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: credentials });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Lecture impossible.',
    });
  }
});

credentialsRouter.delete('/:id', requireAuth, requireRole('VETERINAIRE'), async (req, res) => {
  try {
    const profile = await myVetProfile(req.user!.id);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profil vétérinaire introuvable.' });
    }

    const credential = await prisma.vetCredential.findUnique({ where: { id: req.params.id } });
    if (!credential || credential.vetProfileId !== profile.id) {
      return res.status(404).json({ success: false, error: 'Pièce introuvable.' });
    }

    // Une fois le compte validé, les pièces qui ont fondé la décision doivent
    // rester consultables : elles ne sont plus retirables par le praticien.
    if (profile.verification === 'APPROVED') {
      return res.status(409).json({
        success: false,
        error: 'Compte déjà validé : les pièces justificatives ne peuvent plus être retirées.',
      });
    }

    await prisma.vetCredential.delete({ where: { id: credential.id } });
    fs.promises
      .unlink(path.join(uploadsDir, credential.fileUrl.replace(/^\/uploads\//, '')))
      .catch(() => {});

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Retrait impossible.',
    });
  }
});
