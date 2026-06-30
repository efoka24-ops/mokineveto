/**
 * Alerts API routes
 * - GET /alerts - list alerts relevant to me (my farms' regions + national), non expirées
 * - POST /alerts (ADMIN) - diffuser une alerte (région ciblée ou nationale) : fan-out
 *   Notification personnelle + push + e-mail vers tous les utilisateurs concernés.
 */
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { notifyUser } from '../lib/notify.js';

export const alertsRouter = Router();

alertsRouter.get('/', requireAuth, async (req, res) => {
  try {
    const farms = await prisma.farm.findMany({ where: { userId: req.user!.id } });
    const regions = farms.map((f) => f.region);

    const alerts = await prisma.alert.findMany({
      where: {
        AND: [
          { OR: [{ region: null }, ...(regions.length ? [{ region: { in: regions } }] : [])] },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: alerts });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to list alerts' });
  }
});

alertsRouter.post('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { type, title, body, region, ficheId, severity, expiresAt } = req.body;

  try {
    if (!title || !body) {
      return res.status(400).json({ success: false, error: 'Missing required fields: title, body' });
    }

    const alert = await prisma.alert.create({
      data: {
        type: type || 'EPIDEMIC',
        title,
        body,
        region: region || null,
        ficheId: ficheId || null,
        severity: severity || 'INFO',
        createdById: req.user!.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    // Fan-out : utilisateurs dont une ferme est dans la région ciblée, ou tous si nationale.
    const targets = region
      ? await prisma.user.findMany({ where: { farms: { some: { region } } } })
      : await prisma.user.findMany();

    await Promise.allSettled(
      targets.map((u) => notifyUser(u.id, 'alert', title, body, { alertId: alert.id, region: alert.region })),
    );

    res.json({ success: true, data: alert, notified: targets.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to create alert' });
  }
});
