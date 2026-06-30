/**
 * Fiches Techniques API routes
 * - GET /fiches - list all fiches (public)
 * - GET /fiches/:id - get fiche detail (if unlocked or free)
 * - GET /fiches/unlocked - list unlocked fiches for user
 * - POST /fiches/:id/unlock - create payment to unlock fiche
 * - CRUD (ADMIN only): POST /fiches, PATCH /fiches/:id, DELETE /fiches/:id
 */
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

export const fichesRouter = Router();

// ─── GET /fiches - List all fiches (public) ──────────────────────────────────
fichesRouter.get('/', async (_req, res) => {
  try {
    const fiches = await prisma.fiche.findMany({
      select: {
        id: true,
        name: true,
        species: true,
        contagious: true,
        description: true,
      },
    });

    res.json({ success: true, data: fiches });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to list fiches' });
  }
});

// ─── GET /fiches/:id - Get fiche detail ──────────────────────────────────────
fichesRouter.get('/:id', requireAuth, async (req, res) => {
  try {
    const fiche = await prisma.fiche.findUnique({
      where: { id: req.params.id },
    });

    if (!fiche) {
      return res.status(404).json({ success: false, error: 'Fiche not found' });
    }

    // Check if user has unlock
    const unlock = await prisma.ficheUnlock.findUnique({
      where: { userId_ficheId: { userId: req.user!.id, ficheId: req.params.id } },
    });

    // Return full content if unlocked or admin
    if (unlock || req.user!.role === 'ADMIN') {
      return res.json({ success: true, data: fiche, unlocked: true });
    }

    // Otherwise show preview only
    return res.json({
      success: true,
      data: {
        id: fiche.id,
        name: fiche.name,
        species: fiche.species,
        contagious: fiche.contagious,
        description: fiche.description.substring(0, 100) + '...',
      },
      unlocked: false,
      message: 'Content locked. Unlock to see full details.',
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to get fiche' });
  }
});

// ─── GET /fiches/unlocked - List user's unlocked fiches ────────────────────────
fichesRouter.get('/unlocked/list', requireAuth, async (req, res) => {
  try {
    const unlocks = await prisma.ficheUnlock.findMany({
      where: { userId: req.user!.id },
      include: { fiche: true },
    });

    const fiches = unlocks.map((u) => u.fiche);
    res.json({ success: true, data: fiches });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to list unlocked fiches' });
  }
});

// ─── POST /fiches/:id/unlock - Initiate unlock payment ────────────────────────
fichesRouter.post('/:id/unlock', requireAuth, async (req, res) => {
  const { method, phone } = req.body;

  try {
    const fiche = await prisma.fiche.findUnique({ where: { id: req.params.id } });

    if (!fiche) {
      return res.status(404).json({ success: false, error: 'Fiche not found' });
    }

    // Check if already unlocked
    const existing = await prisma.ficheUnlock.findUnique({
      where: { userId_ficheId: { userId: req.user!.id, ficheId: req.params.id } },
    });

    if (existing) {
      return res.status(400).json({ success: false, error: 'Already unlocked' });
    }

    // Create payment record (PENDING)
    const payment = await prisma.payment.create({
      data: {
        userId: req.user!.id,
        purpose: 'FICHE_UNLOCK',
        method: method || 'ORANGE_MONEY',
        amount: 100, // 100 FCFA = 0.15 USD
        phone: phone || req.user!.phone,
        status: 'PENDING',
        camooReference: `fiche-${req.params.id}-${Date.now()}`,
      },
    });

    // L'unlock n'est créé qu'à la confirmation du paiement (webhook Camoo) — jamais ici,
    // pour ne pas débloquer un contenu payant avant succès réel du paiement.
    res.json({
      success: true,
      data: {
        paymentId: payment.id,
        paymentRequired: {
          amount: payment.amount,
          method: payment.method,
          reference: payment.camooReference,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to unlock fiche' });
  }
});

// ─── POST /fiches - Create fiche (ADMIN only) ────────────────────────────────
fichesRouter.post('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { name, species, contagious, description, fieldObs, prevention, vetInfo } = req.body;

  try {
    if (!name || !description) {
      return res.status(400).json({ success: false, error: 'Missing required fields: name, description' });
    }

    const fiche = await prisma.fiche.create({
      data: {
        name,
        species: species || [],
        contagious: contagious || false,
        description,
        fieldObs: fieldObs || '',
        prevention: prevention || '',
        vetInfo: vetInfo || '',
      },
    });

    res.json({ success: true, data: fiche });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to create fiche' });
  }
});

// ─── PATCH /fiches/:id - Update fiche (ADMIN only) ───────────────────────────
fichesRouter.patch('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { name, species, contagious, description, fieldObs, prevention, vetInfo } = req.body;

  try {
    const fiche = await prisma.fiche.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(species && { species }),
        ...(contagious !== undefined && { contagious }),
        ...(description && { description }),
        ...(fieldObs && { fieldObs }),
        ...(prevention && { prevention }),
        ...(vetInfo && { vetInfo }),
      },
    });

    res.json({ success: true, data: fiche });
  } catch (err) {
    if (err instanceof Error && err.message.includes('not found')) {
      return res.status(404).json({ success: false, error: 'Fiche not found' });
    }
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to update fiche' });
  }
});

// ─── DELETE /fiches/:id - Delete fiche (ADMIN only) ──────────────────────────
fichesRouter.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    await prisma.fiche.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message.includes('not found')) {
      return res.status(404).json({ success: false, error: 'Fiche not found' });
    }
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to delete fiche' });
  }
});
