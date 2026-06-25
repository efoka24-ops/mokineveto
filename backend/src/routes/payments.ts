import { Router } from 'express';
import { z } from 'zod';
import { createCashout, verifyTransaction, getAccount, verifyWebhookSignature } from '../services/camoo.js';

export const paymentsRouter = Router();

const cashoutSchema = z.object({
  amount: z.number().positive(),
  phone_number: z.string().min(6),
  external_reference: z.string().optional(),
  shopping_cart_details: z.record(z.unknown()).optional(),
});

paymentsRouter.post('/cashout', async (req, res) => {
  const parsed = cashoutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
  try {
    const { status, data } = await createCashout(parsed.data);
    return res.status(status).json({ success: status < 400, data });
  } catch (e) {
    console.error('[payments] cashout échoué', e);
    return res.status(502).json({ success: false, error: { code: 'CAMOO_UNREACHABLE' } });
  }
});

paymentsRouter.get('/verify', async (req, res) => {
  const id = String(req.query.id ?? '');
  if (!id) return res.status(400).json({ success: false, error: { code: 'ID_REQUIRED' } });
  const { status, data } = await verifyTransaction(id);
  return res.status(status).json({ success: status < 400, data });
});

paymentsRouter.get('/account', async (_req, res) => {
  const { status, data } = await getAccount();
  return res.status(status).json({ success: status < 400, data });
});

/**
 * Webhook Camoo (HTTP GET signé). Doit être idempotent et renvoyer 200.
 * Vérifie la signature `sig` (HMAC-SHA256) avant de traiter.
 */
paymentsRouter.get('/webhook', (req, res) => {
  const url = new URL(req.originalUrl, 'http://localhost');
  const sig = url.searchParams.get('sig') ?? '';
  url.searchParams.delete('sig');
  const queryWithoutSig = url.searchParams.toString();

  if (!verifyWebhookSignature(queryWithoutSig, sig)) {
    return res.status(401).send('invalid signature');
  }

  const status = (url.searchParams.get('status') ?? '').toLowerCase();
  const reference = url.searchParams.get('external_reference') ?? url.searchParams.get('id');
  // TODO: idempotence + mise à jour de la transaction/rendez-vous en base.
  console.log(`[webhook] paiement ${reference} -> ${status}`);
  return res.status(200).send('ok');
});
