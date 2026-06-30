import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { signAccessToken } from '../lib/jwt.js';
import { requireAuth } from '../middleware/auth.js';
import { generateOtp, verifyOtp } from '../services/otp.js';
import { sendOtpEmail } from '../services/mailer.js';

export const authRouter = Router();

// ─── Sign Up ───────────────────────────────────────────────────────────────

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().min(6),
  password: z.string().min(8),
  role: z.enum(['ELEVEUR', 'VETERINAIRE']),
  birthDate: z.string().optional(),
  // Vet-specific fields (optional)
  specialty: z.string().optional(),
  gender: z.enum(['homme', 'femme']).optional(),
  experienceYears: z.number().min(0).optional(),
  ordreNumber: z.string().optional(),
  professional: z.boolean().optional(),
  focus: z.string().optional(),
  // Eleveur-specific: region of their first farm (multi-élevage)
  region: z.enum([
    'ADAMAOUA', 'CENTRE', 'EST', 'EXTREME_NORD', 'LITTORAL',
    'NORD', 'NORD_OUEST', 'OUEST', 'SUD', 'SUD_OUEST',
  ]).optional(),
});

authRouter.post('/signup', async (req: Request, res: Response) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error.flatten() });
  }

  const {
    name,
    email,
    phone,
    password,
    role,
    birthDate,
    specialty,
    gender,
    experienceYears,
    ordreNumber,
    professional,
    focus,
    region,
  } = parsed.data;

  try {
    // Check if user already exists
    if (email) {
      const existing = await prisma.user.findFirst({
        where: { OR: [{ email }, { phone }] },
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          error: { code: 'USER_EXISTS', message: 'Email or phone already registered' },
        });
      }
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email: email || null,
        phone,
        passwordHash,
        role,
        birthDate: birthDate || null,
        avatarUrl: `https://i.pravatar.cc/300?u=${phone}`,
      },
      include: { vetProfile: true },
    });

    // If VETERINAIRE, create pending VetProfile
    if (role === 'VETERINAIRE') {
      await prisma.vetProfile.create({
        data: {
          userId: user.id,
          specialty: specialty || 'Général',
          gender: (gender as 'homme' | 'femme') || 'homme',
          experienceYears: experienceYears || 0,
          schedule: 'À définir',
          hourlyRate: 7000,
          professional: professional || false,
          focus: focus || 'À définir',
          ordreNumber: ordreNumber || 'En attente de vérification',
          verification: 'PENDING',
        },
      });
    }

    // If ELEVEUR, create a default Farm (multi-élevage base + signal région épidémio)
    if (role === 'ELEVEUR') {
      await prisma.farm.create({
        data: {
          userId: user.id,
          name: `Élevage de ${name}`,
          region: (region as any) || 'CENTRE',
          isDefault: true,
        },
      });
    }

    const token = signAccessToken({
      sub: user.id,
      role: user.role as any,
      email: user.email || undefined,
      phone: user.phone,
    });

    return res.status(201).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
        birthDate: user.birthDate,
      },
      token,
    });
  } catch (error) {
    console.error('[auth/signup]', error);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  }
});

// ─── Login ─────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  emailOrPhone: z.string().min(3),
  password: z.string().min(1),
});

authRouter.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error.flatten() });
  }

  const { emailOrPhone, password } = parsed.data;

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: emailOrPhone }, { phone: emailOrPhone }],
      },
    });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS' },
      });
    }

    const token = signAccessToken({
      sub: user.id,
      role: user.role,
      email: user.email || undefined,
      phone: user.phone,
    });

    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
        birthDate: user.birthDate,
      },
      token,
    });
  } catch (error) {
    console.error('[auth/login]', error);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  }
});

// ─── Get Current User ──────────────────────────────────────────────────────

authRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { vetProfile: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
        birthDate: user.birthDate,
        vetProfile: user.vetProfile || undefined,
      },
    });
  } catch (error) {
    console.error('[auth/me]', error);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  }
});

// ─── Update Profile ───────────────────────────────────────────────────────

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  avatarUrl: z.string().url().optional(),
  birthDate: z.string().optional(),
});

authRouter.patch('/me', requireAuth, async (req: Request, res: Response) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error.flatten() });
  }

  try {
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: parsed.data,
    });

    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
        birthDate: user.birthDate,
      },
    });
  } catch (error) {
    console.error('[auth/update]', error);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  }
});

// ─── OTP Routes (reserved for future password reset) ────────────────────────

const requestSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(6).optional(),
}).refine((d) => d.email || d.phone, { message: 'email ou phone requis' });

authRouter.post('/request-otp', async (req: Request, res: Response) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });

  const { email, phone } = parsed.data;
  const identifier = (email ?? phone)!.toLowerCase();
  const code = generateOtp(identifier);

  try {
    if (email) await sendOtpEmail(email, code);
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

authRouter.post('/verify-otp', (req: Request, res: Response) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });

  const result = verifyOtp(parsed.data.identifier.toLowerCase(), parsed.data.code);
  if (result === 'OK') {
    return res.json({ success: true, tempToken: `tmp-${Date.now().toString(36)}` });
  }
  const codeMap: Record<string, number> = { EXPIRED: 410, INVALID: 401, TOO_MANY_ATTEMPTS: 429, NOT_FOUND: 404 };
  return res.status(codeMap[result] ?? 400).json({ success: false, error: { code: result } });
});
