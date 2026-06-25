import { Router } from 'express';
import { z } from 'zod';
import { generateOtp, verifyOtp } from '../services/otp.js';
import { sendOtpEmail } from '../services/mailer.js';

export const authRouter = Router();

const requestSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(6).optional(),
}).refine((d) => d.email || d.phone, { message: 'email ou phone requis' });

authRouter.post('/request-otp', async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });

  const { email, phone } = parsed.data;
  const identifier = (email ?? phone)!.toLowerCase();
  const code = generateOtp(identifier);

  try {
    if (email) await sendOtpEmail(email, code);
    // TODO: envoi SMS quand un fournisseur sera configuré.
    return res.json({ success: true, channel: email ? 'email' : 'sms', message: 'Code envoyé' });
  } catch (e) {
    console.error('[auth] envoi OTP échoué', e);
    return res.status(502).json({ success: false, error: { code: 'OTP_SEND_FAILED' } });
  }
});

const verifySchema = z.object({
  identifier: z.string().min(3),
  code: z.string().min(4),
});

authRouter.post('/verify-otp', (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });

  const result = verifyOtp(parsed.data.identifier.toLowerCase(), parsed.data.code);
  if (result === 'OK') {
    // TODO: émettre un JWT (access + refresh) lié à l'utilisateur.
    return res.json({ success: true, tempToken: `tmp-${Date.now().toString(36)}` });
  }
  const codeMap: Record<string, number> = { EXPIRED: 410, INVALID: 401, TOO_MANY_ATTEMPTS: 429, NOT_FOUND: 404 };
  return res.status(codeMap[result] ?? 400).json({ success: false, error: { code: result } });
});
