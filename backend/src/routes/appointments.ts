/**
 * Appointments API routes
 * - POST /appointments - create new appointment (with real slot verification)
 * - GET /appointments - list user's appointments (filters by role)
 * - GET /appointments/:id - get appointment detail
 * - PATCH /appointments/:id/cancel - cancel appointment with reason
 * - PATCH /appointments/:id/complete - mark as completed (VETERINAIRE only)
 * - POST /appointments/:id/review - add review (ELEVEUR only, after COMPLETED)
 */
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

export const appointmentsRouter = Router();

// ─── POST /appointments - Create new appointment ───────────────────────────
appointmentsRouter.post('/', requireAuth, async (req, res) => {
  const { vetProfileId, startsAt, endsAt, reason, method } = req.body;
  const eleveurId = req.user!.id;

  try {
    // Verify vet exists and is approved
    const vet = await prisma.vetProfile.findUnique({
      where: { id: vetProfileId },
      include: { user: true },
    });

    if (!vet || vet.verification !== 'APPROVED') {
      return res.status(404).json({ success: false, error: 'Vet not found or not verified' });
    }

    // Verify no conflict with existing appointments
    const conflict = await prisma.appointment.findFirst({
      where: {
        vetProfileId,
        status: { not: 'CANCELLED' },
        OR: [
          { startsAt: { lt: new Date(endsAt), gte: new Date(startsAt) } },
          { endsAt: { gt: new Date(startsAt), lte: new Date(endsAt) } },
        ],
      },
    });

    if (conflict) {
      return res.status(409).json({ success: false, error: 'Slot already booked' });
    }

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        eleveurId,
        vetProfileId,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        amount: vet.hourlyRate, // Simple: hourly rate for 30 min
        reason: reason || '',
        method,
        status: 'UPCOMING',
      },
      include: {
        eleveur: true,
        vetProfile: { include: { user: true } },
      },
    });

    res.json({ success: true, data: appointment });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to create appointment' });
  }
});

// ─── GET /appointments - List appointments (by role) ─────────────────────────
appointmentsRouter.get('/', requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const userRole = req.user!.role;

  try {
    let appointments;

    if (userRole === 'ELEVEUR') {
      // Eleveur sees appointments they booked
      appointments = await prisma.appointment.findMany({
        where: { eleveurId: userId },
        include: {
          eleveur: true,
          vetProfile: { include: { user: true } },
          review: true,
        },
        orderBy: { startsAt: 'desc' },
      });
    } else if (userRole === 'VETERINAIRE') {
      // Vet sees appointments booked with them
      const vetProfile = await prisma.vetProfile.findUnique({ where: { userId } });
      if (!vetProfile) {
        return res.status(404).json({ success: false, error: 'Vet profile not found' });
      }
      appointments = await prisma.appointment.findMany({
        where: { vetProfileId: vetProfile.id },
        include: {
          eleveur: true,
          vetProfile: { include: { user: true } },
          review: true,
        },
        orderBy: { startsAt: 'desc' },
      });
    } else {
      // ADMIN sees all
      appointments = await prisma.appointment.findMany({
        include: {
          eleveur: true,
          vetProfile: { include: { user: true } },
          review: true,
        },
        orderBy: { startsAt: 'desc' },
      });
    }

    res.json({ success: true, data: appointments });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to list appointments' });
  }
});

// ─── GET /appointments/:id - Get appointment detail ───────────────────────────
appointmentsRouter.get('/:id', requireAuth, async (req, res) => {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: {
        eleveur: true,
        vetProfile: { include: { user: true } },
        review: true,
        payment: true,
      },
    });

    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    // Check access: eleveur, vet, or admin
    const hasAccess =
      appointment.eleveurId === req.user!.id ||
      appointment.vetProfile.userId === req.user!.id ||
      req.user!.role === 'ADMIN';

    if (!hasAccess) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.json({ success: true, data: appointment });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to get appointment' });
  }
});

// ─── PATCH /appointments/:id/cancel - Cancel appointment ──────────────────────
appointmentsRouter.patch('/:id/cancel', requireAuth, async (req, res) => {
  const { reasonCode, note } = req.body;

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: { eleveur: true, vetProfile: true },
    });

    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    // Only eleveur or vet can cancel
    if (appointment.eleveurId !== req.user!.id && appointment.vetProfile.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    if (appointment.status === 'CANCELLED') {
      return res.status(400).json({ success: false, error: 'Already cancelled' });
    }

    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: {
        status: 'CANCELLED',
        cancelReasonCode: reasonCode,
        cancelNote: note,
        cancelledAt: new Date(),
      },
      include: {
        eleveur: true,
        vetProfile: { include: { user: true } },
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to cancel' });
  }
});

// ─── PATCH /appointments/:id/complete - Mark as completed ──────────────────────
appointmentsRouter.patch('/:id/complete', requireRole('VETERINAIRE', 'ADMIN'), async (req, res) => {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: { vetProfile: true },
    });

    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    // Only vet or admin can mark complete
    if (appointment.vetProfile.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status: 'COMPLETED' },
      include: {
        eleveur: true,
        vetProfile: { include: { user: true } },
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to complete' });
  }
});

// ─── POST /appointments/:id/review - Add review ───────────────────────────────
appointmentsRouter.post('/:id/review', requireRole('ELEVEUR'), async (req, res) => {
  const { stars, comment } = req.body;

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: { vetProfile: true, review: true },
    });

    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    if (appointment.eleveurId !== req.user!.id) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    if (appointment.status !== 'COMPLETED') {
      return res.status(400).json({ success: false, error: 'Appointment not completed' });
    }

    if (appointment.review) {
      return res.status(400).json({ success: false, error: 'Review already exists' });
    }

    if (!stars || stars < 1 || stars > 5) {
      return res.status(400).json({ success: false, error: 'Stars must be 1-5' });
    }

    // Create review and update vet rating atomically
    const review = await prisma.review.create({
      data: {
        appointmentId: req.params.id,
        vetProfileId: appointment.vetProfileId,
        eleveurId: req.user!.id,
        stars: Math.round(stars),
        comment: comment || null,
      },
    });

    // Recalculate vet rating
    const reviews = await prisma.review.findMany({
      where: { vetProfileId: appointment.vetProfileId },
    });

    const avgRating = reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length;

    await prisma.vetProfile.update({
      where: { id: appointment.vetProfileId },
      data: {
        ratingAvg: avgRating,
        ratingCount: reviews.length,
      },
    });

    res.json({ success: true, data: review });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to add review' });
  }
});
