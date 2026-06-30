import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const vetsRouter = Router();

// ─── List all vets with filters ────────────────────────────────────────────

vetsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { gender, specialty, topRated } = req.query;

    let where: any = { verification: 'APPROVED' };
    if (gender) where.gender = gender as string;
    if (specialty) where.specialty = specialty as string;

    let orderBy: any = { ratingAvg: 'desc' };
    if (topRated !== 'true') orderBy = { createdAt: 'desc' };

    const vets = await prisma.vetProfile.findMany({
      where,
      orderBy,
      include: { user: { select: { id: true, name: true, avatarUrl: true, phone: true } } },
    });

    const result = vets.map((vet) => ({
      id: vet.id,
      name: vet.user.name,
      specialty: vet.specialty,
      gender: vet.gender,
      rating: vet.ratingAvg,
      reviews: vet.ratingCount,
      experienceYears: vet.experienceYears,
      schedule: vet.schedule,
      hourlyRate: vet.hourlyRate,
      photo: vet.user.avatarUrl || `https://i.pravatar.cc/300?u=${vet.user.phone}`,
      professional: vet.professional,
      focus: vet.focus,
      ordreNumber: vet.ordreNumber,
    }));

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('[vets/list]', error);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  }
});

// ─── Get vet by ID ─────────────────────────────────────────────────────────

vetsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const vet = await prisma.vetProfile.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { id: true, name: true, avatarUrl: true, phone: true } } },
    });

    if (!vet || vet.verification !== 'APPROVED') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    }

    const result = {
      id: vet.id,
      name: vet.user.name,
      specialty: vet.specialty,
      gender: vet.gender,
      rating: vet.ratingAvg,
      reviews: vet.ratingCount,
      experienceYears: vet.experienceYears,
      schedule: vet.schedule,
      hourlyRate: vet.hourlyRate,
      photo: vet.user.avatarUrl || `https://i.pravatar.cc/300?u=${vet.user.phone}`,
      professional: vet.professional,
      focus: vet.focus,
      ordreNumber: vet.ordreNumber,
    };

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('[vets/detail]', error);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  }
});

// ─── Get vet availability slots ────────────────────────────────────────────

vetsRouter.get('/:id/availability', async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_DATE' } });
    }

    const vet = await prisma.vetProfile.findUnique({
      where: { id: req.params.id },
      include: { availability: true },
    });

    if (!vet) {
      return res.status(404).json({ success: false, error: { code: 'VET_NOT_FOUND' } });
    }

    // Parse the date (expecting YYYY-MM-DD format)
    const requestedDate = new Date(date as string);
    const dayOfWeek = requestedDate.getDay();
    // Convert JS day (0=Sunday) to our schema (0=Monday)
    const normalizedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const template = vet.availability.find((a) => a.dayOfWeek === normalizedDay);
    if (!template) {
      return res.json({ success: true, data: { slots: [] } });
    }

    // Generate 30-minute slots between start and end time
    const [startH, startM] = template.startTime.split(':').map(Number);
    const [endH, endM] = template.endTime.split(':').map(Number);

    const slots: string[] = [];
    let current = startH * 60 + startM;
    const end = endH * 60 + endM;

    while (current < end) {
      const hour = Math.floor(current / 60).toString().padStart(2, '0');
      const min = (current % 60).toString().padStart(2, '0');
      slots.push(`${hour}:${min}`);
      current += template.slotMinutes;
    }

    // Filter out slots already booked for that day
    const dayStart = new Date(requestedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const booked = await prisma.appointment.findMany({
      where: {
        vetProfileId: req.params.id,
        status: { not: 'CANCELLED' },
        startsAt: { gte: dayStart, lt: dayEnd },
      },
      select: { startsAt: true },
    });

    const bookedTimes = new Set(
      booked.map((a) => `${a.startsAt.getHours().toString().padStart(2, '0')}:${a.startsAt.getMinutes().toString().padStart(2, '0')}`),
    );

    const availableSlots = slots.filter((s) => !bookedTimes.has(s));

    return res.json({ success: true, data: { slots: availableSlots } });
  } catch (error) {
    console.error('[vets/availability]', error);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  }
});

// ─── Get specialties ───────────────────────────────────────────────────────

vetsRouter.get('/specialties', async (_req: Request, res: Response) => {
  try {
    const vets = await prisma.vetProfile.findMany({
      where: { verification: 'APPROVED' },
      distinct: ['specialty'],
      select: { specialty: true },
    });

    const specialties = vets.map((v) => v.specialty);
    return res.json({ success: true, data: specialties });
  } catch (error) {
    console.error('[vets/specialties]', error);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  }
});

// ─── Admin: List pending vet verifications ──────────────────────────────────

vetsRouter.get(
  '/admin/pending',
  requireAuth,
  requireRole('ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const pending = await prisma.vetProfile.findMany({
        where: { verification: 'PENDING' },
        include: { user: { select: { id: true, name: true, email: true, phone: true } } },
      });

      const result = pending.map((v) => ({
        id: v.id,
        userId: v.user.id,
        name: v.user.name,
        email: v.user.email,
        phone: v.user.phone,
        specialty: v.specialty,
        ordreNumber: v.ordreNumber,
        verification: v.verification,
      }));

      return res.json({ success: true, data: result });
    } catch (error) {
      console.error('[vets/admin/pending]', error);
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
  }
);

// ─── Admin: Verify a vet ───────────────────────────────────────────────────

vetsRouter.patch(
  '/:id/verify',
  requireAuth,
  requireRole('ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      if (!['APPROVED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS' } });
      }

      const vet = await prisma.vetProfile.update({
        where: { id: req.params.id },
        data: { verification: status },
        include: { user: { select: { id: true, name: true } } },
      });

      return res.json({
        success: true,
        data: { id: vet.id, verification: vet.verification, vetName: vet.user.name },
      });
    } catch (error) {
      console.error('[vets/verify]', error);
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
  }
);
