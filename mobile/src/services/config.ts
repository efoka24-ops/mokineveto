/**
 * Configuration réseau de l'app MokineVeto.
 *
 * Le backend de production est hébergé au Cameroun (Camoo), conformément à
 * l'exigence de localisation africaine des données de la SFD §7.3.
 * Surchargeable via EXPO_PUBLIC_API_URL.
 */
const isProduction = process.env.EXPO_PUBLIC_ENV === 'production';
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (isProduction
    ? 'http://mokineveto-app.trugroup.cm'
    : 'http://localhost:8000');

/** API est maintenant toujours réelle (utilisée par services/auth.ts) */
export const USE_REAL_API = true;
