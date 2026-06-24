/**
 * Configuration réseau de l'app MokineVeto.
 * Backend déployé sur Railway. Surchargeable via la variable d'env Expo
 * EXPO_PUBLIC_API_URL (app.config / .env).
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://mokineveto-production.up.railway.app';

/** Active la vraie API quand le backend expose les routes ; sinon couche mockée. */
export const USE_REAL_API = process.env.EXPO_PUBLIC_USE_REAL_API === 'true';
