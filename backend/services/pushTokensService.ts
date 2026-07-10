import { db } from '../config/firebase';

function tokensCollection(uid: string) {
  return db.collection('users').doc(uid).collection('pushTokens');
}

export async function savePushToken(uid: string, expoPushToken: string): Promise<void> {
  await tokensCollection(uid).doc(expoPushToken).set({
    token: expoPushToken,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function removePushToken(uid: string, expoPushToken: string): Promise<void> {
  await tokensCollection(uid).doc(expoPushToken).delete();
}

export async function getPushTokens(uid: string): Promise<string[]> {
  const snap = await tokensCollection(uid).get();
  return snap.docs.map((d) => d.data().token as string).filter(Boolean);
}

export async function sendPushNotification(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (tokens.length === 0) return;

  const messages = tokens.map((to) => ({
    to,
    title,
    body,
    data: data ?? {},
    sound: 'default' as const,
    priority: 'high' as const,
  }));

  const chunks: typeof messages[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(chunk),
    }).catch(() => {});
  }
}
