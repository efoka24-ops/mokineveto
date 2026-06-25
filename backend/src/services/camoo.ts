import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from '../config.js';

const headers = () => ({
  'Content-Type': 'application/json',
  'X-Api-Key': config.camoo.apiKey,
  'X-Api-Secret': config.camoo.apiSecret,
});

export interface CashoutInput {
  amount: number;
  phone_number: string;
  currency?: string;
  external_reference?: string;
  notification_url?: string;
  shopping_cart_details?: Record<string, unknown>;
}

/** Initie un cashout via l'API Camoo. */
export async function createCashout(input: CashoutInput) {
  const res = await fetch(`${config.camoo.baseUrl}/cashout`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      currency: 'XAF',
      notification_url: config.camoo.notificationUrl || undefined,
      ...input,
    }),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

/** Vérifie le statut d'une transaction. */
export async function verifyTransaction(id: string) {
  const res = await fetch(`${config.camoo.baseUrl}/verify?id=${encodeURIComponent(id)}`, {
    headers: headers(),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

/** Solde du compte marchand. */
export async function getAccount() {
  const res = await fetch(`${config.camoo.baseUrl}/account`, { headers: headers() });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

/**
 * Vérifie la signature HMAC-SHA256 d'une notification (param `sig`).
 * Le payload signé est la query string (hors `sig`), dérivé du secret API.
 */
export function verifyWebhookSignature(rawQueryWithoutSig: string, sig: string): boolean {
  if (!sig) return false;
  const expected = createHmac('sha256', config.camoo.apiSecret).update(rawQueryWithoutSig).digest('hex');
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(sig);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
