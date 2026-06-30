import { prisma } from './prisma.js';
import { sendExpoPush } from './push.js';
import { sendAlertEmail } from '../services/mailer.js';

/**
 * Crée une Notification personnelle pour un utilisateur et tente l'envoi push +
 * e-mail (best-effort, double canal). Les échecs d'envoi n'empêchent jamais la
 * création de la notification en base.
 */
export async function notifyUser(
  userId: string,
  type: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  const notification = await prisma.notification.create({
    data: { userId, type, title, body, data: data as any },
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const tasks: Promise<unknown>[] = [];
  if (user.expoPushToken) {
    tasks.push(sendExpoPush([user.expoPushToken], title, body, { notificationId: notification.id, ...data }));
  }
  if (user.email) {
    tasks.push(sendAlertEmail(user.email, title, body).catch((err) => console.error('[notify] email failed:', err)));
  }
  await Promise.allSettled(tasks);
}
