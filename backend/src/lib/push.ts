/** Envoi de notifications push via l'API HTTP d'Expo (https://docs.expo.dev/push-notifications/sending-notifications/). */
export async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  const validTokens = tokens.filter((t) => t && t.startsWith('ExponentPushToken'));
  if (validTokens.length === 0) return;

  const messages = validTokens.map((to) => ({ to, title, body, data, sound: 'default' }));

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch (err) {
    console.error('[push] Expo push send failed:', err);
  }
}
