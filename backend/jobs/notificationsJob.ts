import cron from 'node-cron';
import { db } from '../config/firebase';
import { logger } from '../config/logger';
import { getPushTokens, sendPushNotification } from '../services/pushTokensService';

function daysUntil(dateKey: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = dateKey.split('-').map(Number);
  return Math.round((new Date(y, m - 1, d).getTime() - today.getTime()) / 86400000);
}

async function getAllUserIds(): Promise<string[]> {
  const snap = await db.collection('users').select().get();
  return snap.docs.map((d) => d.id);
}

async function processUser(uid: string): Promise<void> {
  const tokens = await getPushTokens(uid);
  if (tokens.length === 0) return;

  const today = new Date();
  const todayDay = today.getDate();
  const todayMonth = today.getMonth() + 1;

  const lovedOnesSnap = await db
    .collection('users').doc(uid)
    .collection('lovedOnes')
    .where('isDeleted', '==', false)
    .get();

  for (const lovedOneDoc of lovedOnesSnap.docs) {
    const person = lovedOneDoc.data();

    // Birthday notification
    if (person.day === todayDay && person.month === todayMonth) {
      await sendPushNotification(
        tokens,
        `🎂 Ziua lui ${person.name}!`,
        `Astăzi este ziua de naștere a lui ${person.name}. Ai ales cadoul?`,
        { kind: 'birthday', lovedOneId: lovedOneDoc.id }
      );
    }

    // Deadline notifications for gift plans
    const plansSnap = await db
      .collection('users').doc(uid)
      .collection('lovedOnes').doc(lovedOneDoc.id)
      .collection('giftPlans')
      .where('status', '==', 'planned')
      .get();

    for (const planDoc of plansSnap.docs) {
      const plan = planDoc.data();
      if (plan.deletedAt != null) continue;

      const purchaseDeadline = plan.purchaseDeadlineDate || plan.deadlineDate;
      if (purchaseDeadline) {
        const days = daysUntil(purchaseDeadline);
        if (days === 7 || days === 3 || days === 1 || days === 0) {
          const urgency = days === 0 ? 'Astăzi!' : days === 1 ? 'Mâine!' : `în ${days} zile`;
          await sendPushNotification(
            tokens,
            `⏰ Deadline cadou — ${urgency}`,
            `Trebuie să cumperi cadoul pentru ${person.name} (${plan.purpose}). Deadline: ${urgency.toLowerCase()}.`,
            { kind: 'deadline', lovedOneId: lovedOneDoc.id, giftPlanId: planDoc.id }
          );
        }
      }
    }
  }

  // Price drop notifications (last 24h unread alerts)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const priceAlertsSnap = await db
    .collection('users').doc(uid)
    .collection('priceAlerts')
    .where('readAt', '==', null)
    .where('changeDirection', '==', 'down')
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get();

  const recentDrops = priceAlertsSnap.docs
    .map((d) => d.data())
    .filter((a) => a.deletedAt == null && a.createdAt >= yesterday);

  if (recentDrops.length > 0) {
    const names = recentDrops.map((a) => a.productName).slice(0, 2).join(', ');
    const suffix = recentDrops.length > 2 ? ` +${recentDrops.length - 2} altele` : '';
    await sendPushNotification(
      tokens,
      `📉 Prețuri scăzute la produse din listele tale`,
      `${names}${suffix} — deschide aplicația pentru detalii.`,
      { kind: 'price_alert' }
    );
  }
}

export function startNotificationsJob() {
  // Runs every day at 09:00
  const task = cron.schedule('0 9 * * *', async () => {
    logger.info('[NotificationsJob] Starting daily push notifications...');
    try {
      const userIds = await getAllUserIds();
      await Promise.allSettled(userIds.map(processUser));
      logger.info(`[NotificationsJob] Done. Processed ${userIds.length} users.`);
    } catch (err) {
      logger.error({ err }, '[NotificationsJob] Error');
    }
  }, { timezone: 'Europe/Bucharest' });

  logger.info('[NotificationsJob] Scheduled at 09:00 Europe/Bucharest.');
  return task;
}
