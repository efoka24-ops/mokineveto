/**
 * Météo locale et risque épizootique (SFD §4.2).
 *
 * La clé du fournisseur reste côté serveur : l'application interroge le backend,
 * jamais OpenWeather directement. Aucun secret ne doit être extractible du
 * binaire livré.
 *
 * Tout est best-effort : localisation refusée, panne réseau ou fournisseur
 * indisponible renvoient `available: false` sans jamais lever d'erreur.
 */
import { api } from './api';

export type EpizooticRisk = 'LOW' | 'MODERATE' | 'HIGH';

export interface Weather {
  available: boolean;
  place?: string;
  temperature?: number;
  feelsLike?: number;
  humidity?: number;
  rain1h?: number;
  description?: string;
  icon?: string;
  risk: EpizooticRisk;
  reasons: string[];
}

const UNAVAILABLE: Weather = { available: false, risk: 'LOW', reasons: [] };

export const RISK_LABEL: Record<EpizooticRisk, string> = {
  LOW: 'Risque faible',
  MODERATE: 'Vigilance',
  HIGH: 'Risque élevé',
};

/**
 * Récupère la position de l'appareil.
 * `expo-location` est chargé paresseusement : il peut être absent du binaire
 * selon le profil de build, et son absence ne doit pas casser l'accueil.
 */
async function getCoords(): Promise<{ lat: number; lon: number } | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Location = require('expo-location');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const pos = await Location.getLastKnownPositionAsync()
      ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    if (!pos) return null;

    return { lat: pos.coords.latitude, lon: pos.coords.longitude };
  } catch (_err) {
    return null;
  }
}

/**
 * Météo du lieu où se trouve l'éleveur.
 * `fallback` permet de fournir des coordonnées connues (siège de l'exploitation)
 * lorsque la localisation de l'appareil est indisponible.
 */
export async function getLocalWeather(fallback?: { lat: number; lon: number }): Promise<Weather> {
  const coords = (await getCoords()) ?? fallback;
  if (!coords) return UNAVAILABLE;

  try {
    const res = await api.get<{ data: Weather }>(
      `/weather?lat=${coords.lat}&lon=${coords.lon}`,
      true
    );
    return res.data ?? UNAVAILABLE;
  } catch (_err) {
    return UNAVAILABLE;
  }
}
