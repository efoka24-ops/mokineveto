/**
 * Weather API routes (SFD §4.2)
 * - GET /weather?lat=&lon=  météo locale + niveau de risque épizootique
 *
 * La clé OpenWeather reste côté serveur : l'embarquer dans l'application la
 * rendrait extractible du binaire livré (SC-024).
 *
 * Le service est *best-effort* : sans clé configurée ou en cas de panne du
 * fournisseur, la route répond 200 avec `available: false` plutôt qu'une erreur.
 * Le tableau de bord doit rester utilisable même sans météo.
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { config } from '../config.js';

export const weatherRouter = Router();

export type EpizooticRisk = 'LOW' | 'MODERATE' | 'HIGH';

export interface WeatherPayload {
  available: boolean;
  place?: string;
  temperature?: number;
  feelsLike?: number;
  humidity?: number;
  rain1h?: number;
  description?: string;
  icon?: string;
  risk: EpizooticRisk;
  /** Motifs du niveau de risque, présentables tels quels à l'éleveur. */
  reasons: string[];
}

/**
 * Évalue le risque épizootique à partir des conditions courantes.
 *
 * La SFD §4.2 cite deux facteurs déclencheurs : chaleur extrême et inondation.
 * On y ajoute l'humidité, qui conditionne la prolifération des vecteurs
 * (trypanosomiase, fièvre de la vallée du Rift), pathologies retenues au §4.4.4.
 *
 * Ces seuils sont des heuristiques d'orientation, à réviser avec un vétérinaire
 * épidémiologiste — ils ne constituent pas un avis médical.
 */
export function assessEpizooticRisk(input: {
  temperature?: number;
  humidity?: number;
  rain1h?: number;
}): { risk: EpizooticRisk; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  if (typeof input.temperature === 'number') {
    if (input.temperature >= 40) {
      score += 2;
      reasons.push('Chaleur extrême : risque de stress thermique et de déshydratation du troupeau.');
    } else if (input.temperature >= 35) {
      score += 1;
      reasons.push('Forte chaleur : surveillez l\'abreuvement et l\'ombrage.');
    }
  }

  if (typeof input.rain1h === 'number') {
    if (input.rain1h >= 20) {
      score += 2;
      reasons.push('Pluies intenses : risque d\'inondation et de contamination des points d\'eau.');
    } else if (input.rain1h >= 7) {
      score += 1;
      reasons.push('Pluies soutenues : surveillez l\'état des pâturages et des abreuvoirs.');
    }
  }

  if (typeof input.humidity === 'number' && input.humidity >= 80) {
    score += 1;
    reasons.push('Humidité élevée : conditions favorables aux insectes vecteurs.');
  }

  const risk: EpizooticRisk = score >= 3 ? 'HIGH' : score >= 1 ? 'MODERATE' : 'LOW';
  if (risk === 'LOW') {
    reasons.push('Conditions climatiques sans facteur de risque particulier.');
  }

  return { risk, reasons };
}

weatherRouter.get('/', requireAuth, async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ success: false, error: 'Paramètres lat et lon requis' });
  }

  const unavailable: WeatherPayload = {
    available: false,
    risk: 'LOW',
    reasons: [],
  };

  if (!config.openWeather.apiKey) {
    return res.json({ success: true, data: unavailable });
  }

  try {
    const url = new URL(`${config.openWeather.baseUrl}/weather`);
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lon));
    url.searchParams.set('units', 'metric');
    url.searchParams.set('lang', 'fr');
    url.searchParams.set('appid', config.openWeather.apiKey);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const upstream = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!upstream.ok) throw new Error(`OpenWeather ${upstream.status}`);

    const json: any = await upstream.json();
    const temperature = json?.main?.temp;
    const humidity = json?.main?.humidity;
    const rain1h = json?.rain?.['1h'];

    const { risk, reasons } = assessEpizooticRisk({ temperature, humidity, rain1h });

    const data: WeatherPayload = {
      available: true,
      place: json?.name,
      temperature,
      feelsLike: json?.main?.feels_like,
      humidity,
      rain1h,
      description: json?.weather?.[0]?.description,
      icon: json?.weather?.[0]?.icon,
      risk,
      reasons,
    };

    res.json({ success: true, data });
  } catch (_err) {
    // Panne du fournisseur : on dégrade sans casser le tableau de bord.
    res.json({ success: true, data: unavailable });
  }
});
