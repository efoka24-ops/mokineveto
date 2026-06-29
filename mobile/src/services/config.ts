/**
 * Configuration réseau de l'app MokineVeto.
 * Backend déployé sur Railway (prod) ou localhost:8000 (dev).
 * Surchargeable via EXPO_PUBLIC_API_URL.
 */
// Force localhost:8000 in dev, Railway in production
const isProduction = process.env.EXPO_PUBLIC_ENV === 'production';
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (isProduction
    ? 'https://mokineveto-production.up.railway.app'
    : 'http://localhost:8000');

/** API est maintenant toujours réelle (utilisée par services/auth.ts) */
export const USE_REAL_API = true;
