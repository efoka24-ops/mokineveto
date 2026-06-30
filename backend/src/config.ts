import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    console.warn(`[config] variable d'environnement manquante: ${name}`);
    return '';
  }
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 8000),
  appName: 'MokineVeto API',
  nodeEnv: process.env.NODE_ENV ?? 'development',

  // Database
  database: {
    url: required('DATABASE_URL'),
  },

  // Auth
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '30d',
  },

  // SMTP (compte mokineveto@trugroup.cm)
  smtp: {
    host: required('SMTP_HOST', 'mx-dc03.ewodi.net'),
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: (process.env.SMTP_SECURE ?? 'true') === 'true',
    user: required('SMTP_USER', 'mokineveto@trugroup.cm'),
    pass: required('SMTP_PASS'),
    from: process.env.SMTP_FROM ?? 'MokineVeto <mokineveto@trugroup.cm>',
  },

  // Camoo Payment API
  camoo: {
    baseUrl: process.env.CAMOO_BASE_URL ?? 'https://api.camoo.cm/v1/payment',
    apiKey: required('CAMOO_API_KEY'),
    apiSecret: required('CAMOO_API_SECRET'),
    notificationUrl: process.env.CAMOO_NOTIFICATION_URL ?? '',
  },

  otp: {
    ttlSeconds: Number(process.env.OTP_TTL_SECONDS ?? 300),
    maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS ?? 3),
    length: 4,
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY ?? '',
    model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5-20250929',
  },

  uploads: {
    dir: process.env.UPLOAD_DIR ?? 'uploads',
  },
} as const;
