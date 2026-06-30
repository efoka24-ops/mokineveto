/**
 * Notifications API routes
 * - POST /notifications/register-push-token - save Expo push token
 * - GET /notifications - list my personal notifications
 * - PATCH /notifications/:id/read - mark as read
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

export const notificationsRouter = Router();

notificationsRouter.post('/register-push-token', requireAuth, async (req, res) => {
  const { token } = req.body;
  try {
    if (!token) return res.status(400).json({ success: false, error: 'Missing token' });
    await prisma.user.update({ where: { id: req.user!.id }, data: { expoPushToken: token } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to register token' });
  }
});

notificationsRouter.get('/', requireAuth, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: notifications });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to list notifications' });
  }
});

notificationsRouter.patch('/:id/read', requireAuth, async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notification) return res.status(404).json({ success: false, error: 'Notification not found' });
    if (notification.userId !== req.user!.id) return res.status(403).json({ success: false, error: 'Access denied' });

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { readAt: new Date() },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to mark as read' });
  }
});
