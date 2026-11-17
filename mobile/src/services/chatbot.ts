/**
 * Assistant de pré-analyse (moteur de règles local).
 * Fournit une ORIENTATION, pas un diagnostic — l'avis final revient au vétérinaire.
 * À terme : remplaçable par un appel LLM côté backend.
 */
export type Urgency = 'LOW' | 'MEDIUM' | 'HIGH';

export interface PreAnalysis {
  id?: string;
  pathologies: string[];
  urgency: Urgency;
  advice: string;
  recommendTeleconsult: boolean;
}

export interface Symptom {
  key: string;
  label: string;
}

export const SYMPTOMS: Symptom[] = [
  { key: 'fever', label: 'Fièvre' },
  { key: 'appetite', label: "Perte d'appétit" },
  { key: 'lameness', label: 'Boiterie' },
  { key: 'salivation', label: 'Salivation excessive' },
  { key: 'diarrhea', label: 'Diarrhée' },
  { key: 'cough', label: 'Toux' },
  { key: 'lesions', label: 'Lésions / vésicules' },
  { key: 'abortion', label: 'Avortement' },
  { key: 'weakness', label: 'Faiblesse / abattement' },
  { key: 'swelling', label: 'Gonflement' },
];

export function analyze(selected: string[]): PreAnalysis {
  const s = new Set(selected);
  const pathologies: string[] = [];

  if (s.has('fever') && s.has('salivation') && s.has('lesions'))
    pathologies.push('Fièvre aphteuse');
  if (s.has('fever') && s.has('weakness') && s.has('appetite'))
    pathologies.push('Theilériose / piroplasmose');
  if (s.has('diarrhea') && s.has('weakness')) pathologies.push('Parasitisme gastro-intestinal');
  if (s.has('cough') && s.has('fever')) pathologies.push('Pasteurellose (pneumonie)');
  if (s.has('abortion')) pathologies.push('Brucellose (suspicion)');
  if (s.has('swelling') && s.has('fever')) pathologies.push('Charbon symptomatique');
  if (pathologies.length === 0) pathologies.push('Affection non spécifique');

  const high = s.has('lesions') || s.has('abortion') || s.has('salivation') || selected.length >= 4;
  const medium = selected.length >= 2;
  const urgency: Urgency = high ? 'HIGH' : medium ? 'MEDIUM' : 'LOW';

  const advice =
    urgency === 'HIGH'
      ? "Isolez immédiatement l'animal et téléconsultez un vétérinaire sans tarder. Certaines pathologies sont contagieuses."
      : urgency === 'MEDIUM'
        ? 'Surveillez attentivement, isolez si possible et envisagez une téléconsultation.'
        : "Surveillez l'évolution et appliquez les mesures de prévention habituelles.";

  return { pathologies, urgency, advice, recommendTeleconsult: urgency !== 'LOW' };
}

export const URGENCY_LABEL: Record<Urgency, string> = {
  LOW: 'Faible',
  MEDIUM: 'Modérée',
  HIGH: 'Élevée',
};

import { Platform } from 'react-native';
import { API_BASE_URL } from './config';

/**
 * Pré-analyse réelle via le backend (Claude vision). Envoie le texte des symptômes
 * et une photo optionnelle. En cas d'échec (réseau, API non configurée), retombe
 * sur le moteur de règles local pour ne jamais bloquer l'utilisateur.
 */
export async function preAnalyzeRemote(params: {
  species: string;
  symptoms: string;
  photoUri?: string;
  selectedKeys: string[];
  token: string | null;
}): Promise<PreAnalysis> {
  try {
    const form = new FormData();
    form.append('species', params.species);
    form.append('symptoms', params.symptoms);

    if (params.photoUri) {
      const filename = params.photoUri.split('/').pop() || 'photo.jpg';
      const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
      // Voir credentials.ts::uploadCredential — même correctif web/natif.
      if (Platform.OS === 'web') {
        const blob = await (await fetch(params.photoUri)).blob();
        form.append('photo', blob, filename);
      } else {
        form.append('photo', {
          uri: params.photoUri,
          name: filename,
          type: mimeType,
        } as unknown as Blob);
      }
    }

    const headers: Record<string, string> = {};
    if (params.token) headers['Authorization'] = `Bearer ${params.token}`;

    const res = await fetch(`${API_BASE_URL}/ai/pre-analysis`, {
      method: 'POST',
      headers,
      body: form,
    });

    if (!res.ok) throw new Error(`AI ${res.status}`);

    const json = await res.json();
    const data = json.data;

    return {
      id: data.id,
      pathologies: data.suspectedConditions?.length ? data.suspectedConditions : ['Affection non spécifique'],
      urgency: data.urgency || 'LOW',
      advice: [data.orientation, data.recommendation].filter(Boolean).join(' '),
      recommendTeleconsult: data.urgency !== 'LOW',
    };
  } catch (_err) {
    console.warn('[chatbot] Remote AI failed, falling back to local rules');
    return analyze(params.selectedKeys);
  }
}

export const SPECIES_OPTIONS = ['Bovins', 'Ovins', 'Caprins', 'Porcins', 'Volailles', 'Autre'];

export interface ChatbotHistoryItem {
  id: string;
  species: string | null;
  symptoms: string;
  suspectedConditions: string[];
  urgency: Urgency;
  orientation: string;
  confidence?: number | null;
  reviewStatus?: string;
  vetReviewStatus?: 'PENDING' | 'VALIDATED' | 'REJECTED' | null;
  vetReviewNote?: string | null;
  createdAt: string;
}

/** Historique des pré-analyses de l'éleveur, plus récentes d'abord. */
export async function getChatbotHistory(token: string | null): Promise<ChatbotHistoryItem[]> {
  const res = await fetch(`${API_BASE_URL}/ai/history`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json.data ?? [];
}

/** Partage un résultat de pré-analyse avec un vétérinaire déjà consulté. */
export async function shareWithVet(historyId: string, vetProfileId: string, token: string | null): Promise<boolean> {
  const res = await fetch(`${API_BASE_URL}/ai/history/${historyId}/share`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ vetProfileId }),
  });
  return res.ok;
}

export interface SharedPreAnalysis extends ChatbotHistoryItem {
  eleveurName: string;
  eleveurId: string;
}

/** File des pré-analyses partagées avec le vétérinaire connecté. */
export async function getSharedPreAnalyses(token: string | null): Promise<SharedPreAnalysis[]> {
  const res = await fetch(`${API_BASE_URL}/vets/me/shared-preanalyses`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json.data ?? [];
}

/** Décision du vétérinaire sur une pré-analyse partagée. */
export async function reviewSharedPreAnalysis(
  historyId: string,
  decision: 'VALIDATED' | 'REJECTED',
  note: string,
  token: string | null
): Promise<boolean> {
  const res = await fetch(`${API_BASE_URL}/ai/history/${historyId}/vet-review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ decision, note }),
  });
  return res.ok;
}
