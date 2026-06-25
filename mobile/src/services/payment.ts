/**
 * Couche paiement — mockée côté mobile.
 * La vraie intégration Camoo (cashout/verify, webhooks HMAC) se fait côté backend ;
 * le mobile appellera POST /payments puis interrogera le statut.
 */
export type PaymentMethod = 'CARD' | 'ORANGE_MONEY' | 'MTN_MOMO';

export interface PaymentResult {
  success: boolean;
  reference: string;
  message: string;
}

const wait = (ms = 1400) => new Promise((r) => setTimeout(r, ms));

export async function pay(params: {
  amount: number;
  method: PaymentMethod;
  phone?: string;
}): Promise<PaymentResult> {
  await wait();
  // Démo : échoue si le montant est 0 ou si numéro Mobile Money manquant.
  const needsPhone = params.method !== 'CARD';
  const ok = params.amount > 0 && (!needsPhone || !!params.phone);
  return {
    success: ok,
    reference: `MV-${Date.now().toString(36).toUpperCase()}`,
    message: ok ? 'Paiement réussi' : 'Paiement échoué',
  };
}

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  CARD: 'Carte bancaire',
  ORANGE_MONEY: 'Orange Money',
  MTN_MOMO: 'MTN MoMo',
};
