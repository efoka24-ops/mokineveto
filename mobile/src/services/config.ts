/**
 * Configuration réseau de l'app MokineVeto.
 * Backend déployé sur Railway (prod) ou localhost:8000 (dev).
 * Surchargeable via EXPO_PUBLIC_API_URL.
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (process.env.NODE_ENV === 'development'
    ? 'http://localhost:8000'
    : 'https://mokineveto-production.up.railway.app');

/** API est maintenant toujours réelle (utilisée par services/auth.ts) */
export const USE_REAL_API = true;
