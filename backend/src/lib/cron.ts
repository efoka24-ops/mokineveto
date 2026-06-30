import cron from 'node-cron';
import { prisma } from './prisma.js';
import { notifyUser } from './notify.js';

/** Rappels quotidiens : vaccin/vermifuge dont la prochaine échéance (nextDueAt) est dépassée ou imminente (J-3). */
async function runDueReminders(): Promise<void> {
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 3);

  const dueEvents = await prisma.healthEvent.findMany({
    where: { nextDueAt: { not: null, lte: horizon } },
    include: { animal: { include: { user: true } } },
  });

  for (const event of dueEvents) {
    const overdue = event.nextDueAt! < new Date();
    await notifyUser(
      event.animal.userId,
      'REMINDER',
      overdue ? `Rappel en retard : ${event.animal.name}` : `Rappel à venir : ${event.animal.name}`,
      `${event.type === 'VACCIN' ? 'Vaccin' : 'Vermifuge'} (${event.label}) ${overdue ? 'était dû le' : 'est prévu le'} ${event.nextDueAt!.toLocaleDateString('fr-FR')}.`,
      { animalId: event.animalId, healthEventId: event.id },
    );
  }

  if (dueEvents.length > 0) {
    console.log(`[cron] ${dueEvents.length} rappel(s) santé envoyé(s)`);
  }
}

export function startCronJobs(): void {
  // Tous les jours à 7h locales
  cron.schedule('0 7 * * *', () => {
    runDueReminders().catch((err) => console.error('[cron] runDueReminders failed:', err));
  });
  console.log('[cron] daily reminders job scheduled (07:00)');
}
