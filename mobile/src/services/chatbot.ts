/**
 * Assistant de pré-analyse (moteur de règles local).
 * Fournit une ORIENTATION, pas un diagnostic — l'avis final revient au vétérinaire.
 * À terme : remplaçable par un appel LLM côté backend.
 */
export type Urgency = 'LOW' | 'MEDIUM' | 'HIGH';

export interface PreAnalysis {
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
