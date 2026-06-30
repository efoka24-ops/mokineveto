/**
 * Farms API routes (multi-élevage)
 * - GET /farms - list user's farms
 * - POST /farms - create farm
 * - PATCH /farms/:id - rename / change region / set default
 * - DELETE /farms/:id - delete farm (animals become unassigned)
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

export const farmsRouter = Router();

farmsRouter.get('/', requireAuth, async (req, res) => {
  try {
    const farms = await prisma.farm.findMany({
      where: { userId: req.user!.id },
      include: { _count: { select: { animals: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: farms });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to list farms' });
  }
});

farmsRouter.post('/', requireAuth, async (req, res) => {
  const { name, region, isDefault } = req.body;
  try {
    if (!name || !region) {
      return res.status(400).json({ success: false, error: 'Missing required fields: name, region' });
    }

    if (isDefault) {
      await prisma.farm.updateMany({ where: { userId: req.user!.id }, data: { isDefault: false } });
    }

    const existingCount = await prisma.farm.count({ where: { userId: req.user!.id } });

    const farm = await prisma.farm.create({
      data: {
        userId: req.user!.id,
        name,
        region,
        isDefault: isDefault ?? existingCount === 0,
      },
    });
    res.json({ success: true, data: farm });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to create farm' });
  }
});

farmsRouter.patch('/:id', requireAuth, async (req, res) => {
  const { name, region, isDefault } = req.body;
  try {
    const farm = await prisma.farm.findUnique({ where: { id: req.params.id } });
    if (!farm) return res.status(404).json({ success: false, error: 'Farm not found' });
    if (farm.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    if (isDefault) {
      await prisma.farm.updateMany({ where: { userId: farm.userId }, data: { isDefault: false } });
    }

    const updated = await prisma.farm.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(region && { region }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to update farm' });
  }
});

farmsRouter.delete('/:id', requireAuth, async (req, res) => {
  try {
    const farm = await prisma.farm.findUnique({ where: { id: req.params.id } });
    if (!farm) return res.status(404).json({ success: false, error: 'Farm not found' });
    if (farm.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    await prisma.farm.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to delete farm' });
  }
});
