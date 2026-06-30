/**
 * Assistant IA - pré-analyse de symptômes (+ photo optionnelle) via l'API Claude (vision).
 * - POST /ai/pre-analysis (multipart: species, symptoms, photo?) - ELEVEUR/VETERINAIRE
 *
 * La photo n'est jamais persistée sur disque : elle est encodée en base64 en mémoire,
 * envoyée à Claude, puis jetée. Seul un signal anonymisé (région + pathologie + urgence)
 * est conservé pour nourrir la base épidémiologique.
 */
import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { runPreAnalysis } from '../lib/anthropic.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

export const aiRouter = Router();

aiRouter.post('/pre-analysis', requireAuth, upload.single('photo'), async (req, res) => {
  const { species, symptoms } = req.body;

  if (!species || !symptoms) {
    return res.status(400).json({ success: false, error: 'Missing required fields: species, symptoms' });
  }

  try {
    const result = await runPreAnalysis({
      species,
      symptoms,
      photoBase64: req.file ? req.file.buffer.toString('base64') : undefined,
      photoMediaType: req.file?.mimetype,
    });

    // Signal épidémiologique anonymisé (pas de userId stocké)
    const farm = await prisma.farm.findFirst({
      where: { userId: req.user!.id },
      orderBy: { isDefault: 'desc' },
    });
    if (farm) {
      await prisma.healthReport.create({
        data: {
          source: 'CHATBOT',
          region: farm.region,
          urgency: result.urgency,
        },
      });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[ai/pre-analysis]', err);
    res.status(502).json({ success: false, error: err instanceof Error ? err.message : 'Pre-analysis failed' });
  }
});
