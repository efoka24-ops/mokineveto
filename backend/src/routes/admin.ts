/**
 * Admin Dashboard API routes (ADMIN only)
 * - GET /admin/vets/pending - list pending vet verifications
 * - PATCH /admin/vets/:id/verify - approve/reject vet
 * - GET /admin/users - list all users
 * - PATCH /admin/users/:id - update user
 * - DELETE /admin/users/:id - delete user
 * - GET /admin/stats - dashboard statistics
 */
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

export const adminRouter = Router();

// All admin routes require a valid JWT + ADMIN role
adminRouter.use(requireAuth, requireRole('ADMIN'));

// ─── GET /admin/vets/pending - List pending vet verifications ─────────────────
adminRouter.get('/vets/pending', async (_req, res) => {
  try {
    const vets = await prisma.vetProfile.findMany({
      where: { verification: 'PENDING' },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: vets });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed' });
  }
});

// ─── PATCH /admin/vets/:id/verify - Approve or reject vet ─────────────────────
adminRouter.patch('/vets/:id/verify', async (req, res) => {
  const { status, note } = req.body;

  try {
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Status must be APPROVED or REJECTED' });
    }

    const vet = await prisma.vetProfile.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });

    if (!vet) {
      return res.status(404).json({ success: false, error: 'Vet not found' });
    }

    // Update verification status
    const updated = await prisma.vetProfile.update({
      where: { id: req.params.id },
      data: { verification: status },
      include: { user: true },
    });

    // Log action
    console.log(`[admin] Vet ${vet.user.name} (${vet.id}) ${status}`);

    res.json({ success: true, data: updated, note });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed' });
  }
});

// ─── GET /admin/vets - List all vets ──────────────────────────────────────────
adminRouter.get('/vets', async (_req, res) => {
  try {
    const vets = await prisma.vetProfile.findMany({
      include: { user: true },
      orderBy: { verification: 'asc' },
    });

    res.json({ success: true, data: vets });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed' });
  }
});

// ─── GET /admin/users - List all users ────────────────────────────────────────
adminRouter.get('/users', async (req, res) => {
  try {
    const role = req.query.role as string | undefined;
    const users = await prisma.user.findMany({
      where: role ? { role: role as any } : undefined,
      include: { vetProfile: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed' });
  }
});

// ─── GET /admin/users/:id - Get user detail ──────────────────────────────────
adminRouter.get('/users/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        vetProfile: true,
        animals: { include: { healthEvents: true } },
        appointmentsAsEleveur: { include: { vetProfile: true } },
        reviews: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed' });
  }
});

// ─── PATCH /admin/users/:id - Update user ────────────────────────────────────
adminRouter.patch('/users/:id', async (req, res) => {
  const { name, email, phone, avatarUrl, birthDate } = req.body;

  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(phone && { phone }),
        ...(avatarUrl && { avatarUrl }),
        ...(birthDate && { birthDate }),
      },
    });

    res.json({ success: true, data: user });
  } catch (err) {
    if (err instanceof Error && err.message.includes('not found')) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed' });
  }
});

// ─── DELETE /admin/users/:id - Delete user ──────────────────────────────────
adminRouter.delete('/users/:id', async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message.includes('not found')) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed' });
  }
});

// ─── GET /admin/stats - Dashboard statistics ───────────────────────────────────
adminRouter.get('/stats', async (_req, res) => {
  try {
    const [totalUsers, totalVets, pendingVets, totalAppointments, totalPayments] = await Promise.all([
      prisma.user.count(),
      prisma.vetProfile.count(),
      prisma.vetProfile.count({ where: { verification: 'PENDING' } }),
      prisma.appointment.count(),
      prisma.payment.count(),
    ]);

    const appointmentsByStatus = await prisma.appointment.groupBy({
      by: ['status'],
      _count: true,
    });

    const paymentsByStatus = await prisma.payment.groupBy({
      by: ['status'],
      _count: true,
    });

    const topVets = await prisma.vetProfile.findMany({
      take: 5,
      orderBy: { ratingAvg: 'desc' },
      include: { user: true },
    });

    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalUsers,
          totalVets,
          pendingVets,
          totalAppointments,
          totalPayments,
        },
        appointmentsByStatus: Object.fromEntries(
          appointmentsByStatus.map((s) => [s.status, s._count]),
        ),
        paymentsByStatus: Object.fromEntries(
          paymentsByStatus.map((s) => [s.status, s._count]),
        ),
        topVets,
        recentUsers,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed' });
  }
});

// ─── GET /admin/epidemio/aggregate - Anonymized epidemiology aggregate ───────
// Comptage par région + pathologie (ficheId), jamais de userId exposé.
adminRouter.get('/epidemio/aggregate', async (req, res) => {
  try {
    const since = req.query.since
      ? new Date(req.query.since as string)
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 derniers jours par défaut

    const reports = await prisma.healthReport.findMany({
      where: { createdAt: { gte: since } },
      select: { region: true, ficheId: true, urgency: true },
    });

    const byRegion: Record<string, { total: number; high: number; byFiche: Record<string, number> }> = {};
    for (const r of reports) {
      const bucket = (byRegion[r.region] ??= { total: 0, high: 0, byFiche: {} });
      bucket.total += 1;
      if (r.urgency === 'HIGH') bucket.high += 1;
      if (r.ficheId) bucket.byFiche[r.ficheId] = (bucket.byFiche[r.ficheId] ?? 0) + 1;
    }

    res.json({ success: true, data: byRegion });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed' });
  }
});

// ─── Suppliers CRUD (Marketplace) ─────────────────────────────────────────────
adminRouter.get('/suppliers', async (_req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: suppliers });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed' });
  }
});

adminRouter.post('/suppliers', async (req, res) => {
  const { name, phone, region, active } = req.body;
  try {
    if (!name) return res.status(400).json({ success: false, error: 'Missing required field: name' });
    const supplier = await prisma.supplier.create({ data: { name, phone, region, active: active ?? true } });
    res.json({ success: true, data: supplier });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed' });
  }
});

adminRouter.patch('/suppliers/:id', async (req, res) => {
  const { name, phone, region, active } = req.body;
  try {
    const supplier = await prisma.supplier.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(region !== undefined && { region }),
        ...(active !== undefined && { active }),
      },
    });
    res.json({ success: true, data: supplier });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed' });
  }
});

adminRouter.delete('/suppliers/:id', async (req, res) => {
  try {
    await prisma.supplier.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed' });
  }
});

// ─── Products CRUD (Marketplace) ──────────────────────────────────────────────
adminRouter.get('/products', async (req, res) => {
  try {
    const { supplierId } = req.query;
    const products = await prisma.product.findMany({
      where: supplierId ? { supplierId: supplierId as string } : undefined,
      include: { supplier: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed' });
  }
});

adminRouter.post('/products', async (req, res) => {
  const { supplierId, name, category, price, unit, imageUrl, active } = req.body;
  try {
    if (!supplierId || !name || !category || price === undefined || !unit) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    const product = await prisma.product.create({
      data: { supplierId, name, category, price, unit, imageUrl, active: active ?? true },
    });
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed' });
  }
});

adminRouter.patch('/products/:id', async (req, res) => {
  const { name, category, price, unit, imageUrl, active } = req.body;
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(category && { category }),
        ...(price !== undefined && { price }),
        ...(unit && { unit }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(active !== undefined && { active }),
      },
    });
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed' });
  }
});

adminRouter.delete('/products/:id', async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed' });
  }
});

// ─── Orders (Marketplace) - status changes ────────────────────────────────────
adminRouter.get('/orders', async (_req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { items: { include: { product: true } }, supplier: true, user: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed' });
  }
});

adminRouter.patch('/orders/:id/status', async (req, res) => {
  const { status } = req.body;
  try {
    if (!['PENDING', 'CONFIRMED', 'DELIVERED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    const order = await prisma.order.update({ where: { id: req.params.id }, data: { status } });
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed' });
  }
});
