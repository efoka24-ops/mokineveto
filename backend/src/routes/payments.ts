import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { createCashout, verifyTransaction, getAccount, verifyWebhookSignature } from '../services/camoo.js';

export const paymentsRouter = Router();

/**
 * Déclenche la requête Mobile Money réelle via Camoo pour un Payment PENDING.
 * Le webhook Camoo (signé) confirmera ensuite SUCCEEDED/FAILED et finalisera la ressource.
 * En cas d'échec réseau Camoo, on logge sans bloquer : le paiement reste PENDING
 * et le mobile affichera l'échec après expiration du polling.
 */
async function triggerCashout(payment: {
  amount: number;
  phone: string | null;
  camooReference: string | null;
}): Promise<void> {
  try {
    if (!payment.camooReference || !payment.phone) return;
    await createCashout({
      amount: payment.amount,
      phone_number: payment.phone,
      external_reference: payment.camooReference,
    });
  } catch (err) {
    console.error('[payments] triggerCashout échoué (paiement reste PENDING):', err);
  }
}

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

// ─── POST /payments/init-fiche-unlock - Initiate fiche unlock payment ──────────
paymentsRouter.post('/init-fiche-unlock', requireAuth, async (req, res) => {
  const { ficheId, method, phone } = req.body;

  try {
    const fiche = await prisma.fiche.findUnique({ where: { id: ficheId } });
    if (!fiche) return res.status(404).json({ success: false, error: 'Fiche not found' });

    // Check if already unlocked
    const existing = await prisma.ficheUnlock.findUnique({
      where: { userId_ficheId: { userId: req.user!.id, ficheId } },
    });
    if (existing) return res.status(400).json({ success: false, error: 'Already unlocked' });

    // Create payment (PENDING)
    const payment = await prisma.payment.create({
      data: {
        userId: req.user!.id,
        purpose: 'FICHE_UNLOCK',
        method: method || 'ORANGE_MONEY',
        amount: 100, // 100 FCFA
        phone: phone || req.user!.phone,
        status: 'PENDING',
        camooReference: `fiche-${ficheId}-${Date.now()}`,
      },
    });

    // Trigger the real Mobile Money request via Camoo (the webhook confirms it later).
    await triggerCashout(payment);

    // Return payment reference for mobile to send to Camoo
    res.json({
      success: true,
      paymentId: payment.id,
      reference: payment.camooReference,
      amount: payment.amount,
      phone: payment.phone,
      method: payment.method,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed' });
  }
});

// ─── POST /payments/init-order - Initiate marketplace order payment ─────────────
paymentsRouter.post('/init-order', requireAuth, async (req, res) => {
  const { orderId, method, phone } = req.body;

  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    if (order.userId !== req.user!.id) return res.status(403).json({ success: false, error: 'Access denied' });
    if (order.status !== 'PENDING') return res.status(400).json({ success: false, error: 'Order is not pending' });

    const payment = await prisma.payment.create({
      data: {
        userId: req.user!.id,
        purpose: 'ORDER',
        method: method || 'ORANGE_MONEY',
        amount: order.totalAmount,
        phone: phone || req.user!.phone,
        status: 'PENDING',
        camooReference: `order-${orderId}-${Date.now()}`,
      },
    });

    await prisma.order.update({ where: { id: orderId }, data: { paymentId: payment.id } });

    await triggerCashout(payment);

    res.json({
      success: true,
      paymentId: payment.id,
      reference: payment.camooReference,
      amount: payment.amount,
      phone: payment.phone,
      method: payment.method,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed' });
  }
});

// ─── POST /payments/init-appointment - Initiate appointment payment ─────────────
paymentsRouter.post('/init-appointment', requireAuth, async (req, res) => {
  const { appointmentId, method, phone } = req.body;

  try {
    const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment) return res.status(404).json({ success: false, error: 'Appointment not found' });
    if (appointment.eleveurId !== req.user!.id) return res.status(403).json({ success: false, error: 'Access denied' });

    // Create payment (PENDING)
    const payment = await prisma.payment.create({
      data: {
        userId: req.user!.id,
        purpose: 'APPOINTMENT',
        method: method || 'ORANGE_MONEY',
        amount: appointment.amount,
        phone: phone || req.user!.phone,
        status: 'PENDING',
        camooReference: `appt-${appointmentId}-${Date.now()}`,
      },
    });

    // Link payment to appointment
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { paymentId: payment.id },
    });

    await triggerCashout(payment);

    res.json({
      success: true,
      paymentId: payment.id,
      reference: payment.camooReference,
      amount: payment.amount,
      phone: payment.phone,
      method: payment.method,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed' });
  }
});

/**
 * Webhook Camoo (HTTP GET signed). Idempotent - returns 200 always.
 * Signature verified via HMAC-SHA256 of query params.
 * Transitions Payment PENDING → SUCCEEDED/FAILED
 * Finalizes FicheUnlock or Appointment payment if successful
 */
paymentsRouter.get('/webhook', async (req, res) => {
  try {
    const url = new URL(req.originalUrl, 'http://localhost');
    const sig = url.searchParams.get('sig') ?? '';
    url.searchParams.delete('sig');
    const queryWithoutSig = url.searchParams.toString();

    // Verify signature
    if (!verifyWebhookSignature(queryWithoutSig, sig)) {
      console.warn('[webhook] Invalid signature');
      return res.status(200).send('ok'); // Always 200 to acknowledge receipt
    }

    const webhookStatus = (url.searchParams.get('status') ?? '').toLowerCase();
    const reference = url.searchParams.get('external_reference') ?? url.searchParams.get('id');

    if (!reference) {
      console.warn('[webhook] No reference in webhook');
      return res.status(200).send('ok');
    }

    // Find payment by camooReference
    const payment = await prisma.payment.findUnique({
      where: { camooReference: reference },
      include: { user: true },
    });

    if (!payment) {
      console.warn(`[webhook] Payment not found: ${reference}`);
      return res.status(200).send('ok'); // Idempotent: return 200 even if not found
    }

    // Skip if already processed
    if (payment.status !== 'PENDING') {
      console.log(`[webhook] Payment already processed: ${reference} (status: ${payment.status})`);
      return res.status(200).send('ok');
    }

    // Map Camoo status to our status
    const paymentStatus = webhookStatus === 'success' ? 'SUCCEEDED' : 'FAILED';

    // Update payment
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: paymentStatus,
        rawWebhookPayload: { status: webhookStatus, timestamp: new Date().toISOString() },
      },
    });

    // If successful, finalize associated resource
    if (paymentStatus === 'SUCCEEDED') {
      if (payment.purpose === 'FICHE_UNLOCK') {
        // Reference format: fiche-${ficheId}-${timestamp}. ficheId (cuid) never contains '-'.
        const ficheId = reference.split('-')[1];
        const existingUnlock = await prisma.ficheUnlock.findFirst({ where: { paymentId: payment.id } });
        if (!existingUnlock && ficheId) {
          await prisma.ficheUnlock.upsert({
            where: { userId_ficheId: { userId: payment.userId, ficheId } },
            update: { paymentId: payment.id },
            create: { userId: payment.userId, ficheId, paymentId: payment.id },
          });
        }
        console.log(`[webhook] Fiche unlocked: ${ficheId} for user ${payment.userId}`);
      } else if (payment.purpose === 'APPOINTMENT') {
        const appointment = await prisma.appointment.findFirst({ where: { paymentId: payment.id } });
        if (appointment) {
          console.log(`[webhook] Appointment payment confirmed: ${appointment.id}`);
        }
      } else if (payment.purpose === 'ORDER') {
        const order = await prisma.order.findFirst({ where: { paymentId: payment.id } });
        if (order) {
          await prisma.order.update({ where: { id: order.id }, data: { status: 'CONFIRMED' } });
          console.log(`[webhook] Order confirmed: ${order.id}`);
        }
      }
    } else {
      console.log(`[webhook] Payment failed: ${reference}`);
      if (payment.purpose === 'ORDER') {
        const order = await prisma.order.findFirst({ where: { paymentId: payment.id } });
        if (order) await prisma.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
      }
    }

    return res.status(200).send('ok');
  } catch (err) {
    console.error('[webhook] Error:', err);
    return res.status(200).send('ok'); // Always 200 to not trigger retries
  }
});

// ─── GET /payments/status/:id - Poll payment status (mobile) ───────────────────
paymentsRouter.get('/status/:id', requireAuth, async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
    if (!payment) return res.status(404).json({ success: false, error: 'Payment not found' });
    if (payment.userId !== req.user!.id) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.json({
      success: true,
      data: {
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        method: payment.method,
        createdAt: payment.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed' });
  }
});
