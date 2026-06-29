/**
 * Animals API routes (ELEVEUR only - manage their herd)
 * - GET /animals - list user's animals
 * - POST /animals - create animal
 * - GET /animals/:id - get animal detail
 * - PATCH /animals/:id - update animal
 * - DELETE /animals/:id - delete animal
 *
 * HealthEvents (under animals):
 * - GET /animals/:id/health-events - list health events
 * - POST /animals/:id/health-events - add health event
 * - DELETE /animals/:id/health-events/:eventId - delete health event
 */
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

export const animalsRouter = Router();

// ─── GET /animals - List user's animals ───────────────────────────────────────
animalsRouter.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const animals = await prisma.animal.findMany({
      where: { userId },
      include: { healthEvents: { orderBy: { createdAt: 'desc' } } },
    });

    res.json({ success: true, data: animals });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to list animals' });
  }
});

// ─── POST /animals - Create animal ────────────────────────────────────────────
animalsRouter.post('/', requireAuth, async (req, res) => {
  const { name, species, breed, sex, age, robe } = req.body;

  try {
    if (!name || !species || !sex) {
      return res.status(400).json({ success: false, error: 'Missing required fields: name, species, sex' });
    }

    const animal = await prisma.animal.create({
      data: {
        userId: req.user!.id,
        name,
        species,
        breed: breed || '',
        sex,
        age: age || '',
        robe: robe || '',
      },
    });

    res.json({ success: true, data: animal });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to create animal' });
  }
});

// ─── GET /animals/:id - Get animal detail ────────────────────────────────────
animalsRouter.get('/:id', requireAuth, async (req, res) => {
  try {
    const animal = await prisma.animal.findUnique({
      where: { id: req.params.id },
      include: { healthEvents: { orderBy: { createdAt: 'desc' } } },
    });

    if (!animal) {
      return res.status(404).json({ success: false, error: 'Animal not found' });
    }

    // Check ownership (or ADMIN)
    if (animal.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.json({ success: true, data: animal });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to get animal' });
  }
});

// ─── PATCH /animals/:id - Update animal ──────────────────────────────────────
animalsRouter.patch('/:id', requireAuth, async (req, res) => {
  const { name, species, breed, sex, age, robe } = req.body;

  try {
    const animal = await prisma.animal.findUnique({ where: { id: req.params.id } });

    if (!animal) {
      return res.status(404).json({ success: false, error: 'Animal not found' });
    }

    if (animal.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const updated = await prisma.animal.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(species && { species }),
        ...(breed && { breed }),
        ...(sex && { sex }),
        ...(age && { age }),
        ...(robe && { robe }),
      },
      include: { healthEvents: { orderBy: { createdAt: 'desc' } } },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to update animal' });
  }
});

// ─── DELETE /animals/:id - Delete animal ─────────────────────────────────────
animalsRouter.delete('/:id', requireAuth, async (req, res) => {
  try {
    const animal = await prisma.animal.findUnique({ where: { id: req.params.id } });

    if (!animal) {
      return res.status(404).json({ success: false, error: 'Animal not found' });
    }

    if (animal.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    await prisma.animal.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to delete animal' });
  }
});

// ─── GET /animals/:id/health-events - List health events ──────────────────────
animalsRouter.get('/:id/health-events', requireAuth, async (req, res) => {
  try {
    const animal = await prisma.animal.findUnique({
      where: { id: req.params.id },
      include: { healthEvents: { orderBy: { createdAt: 'desc' } } },
    });

    if (!animal) {
      return res.status(404).json({ success: false, error: 'Animal not found' });
    }

    if (animal.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.json({ success: true, data: animal.healthEvents });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to list health events' });
  }
});

// ─── POST /animals/:id/health-events - Add health event ───────────────────────
animalsRouter.post('/:id/health-events', requireAuth, async (req, res) => {
  const { type, label, date } = req.body;

  try {
    const animal = await prisma.animal.findUnique({ where: { id: req.params.id } });

    if (!animal) {
      return res.status(404).json({ success: false, error: 'Animal not found' });
    }

    if (animal.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    if (!type || !label) {
      return res.status(400).json({ success: false, error: 'Missing required fields: type, label' });
    }

    const event = await prisma.healthEvent.create({
      data: {
        animalId: req.params.id,
        type,
        label,
        date: date || new Date().toISOString().split('T')[0],
      },
    });

    res.json({ success: true, data: event });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to add health event' });
  }
});

// ─── DELETE /animals/:id/health-events/:eventId - Delete health event ────────
animalsRouter.delete('/:id/health-events/:eventId', requireAuth, async (req, res) => {
  try {
    const event = await prisma.healthEvent.findUnique({ where: { id: req.params.eventId } });

    if (!event) {
      return res.status(404).json({ success: false, error: 'Health event not found' });
    }

    const animal = await prisma.animal.findUnique({ where: { id: event.animalId } });

    if (animal?.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    await prisma.healthEvent.delete({ where: { id: req.params.eventId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to delete health event' });
  }
});
