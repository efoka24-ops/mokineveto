import { config } from '../config.js';

export interface PreAnalysisInput {
  species: string;
  symptoms: string;
  photoBase64?: string; // raw base64, no data: prefix
  photoMediaType?: string; // e.g. 'image/jpeg'
}

export interface PreAnalysisResult {
  orientation: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
  suspectedConditions: string[];
  recommendation: string;
}

const SYSTEM_PROMPT = `Tu es un assistant de pré-orientation vétérinaire pour des éleveurs au Cameroun.
Tu ne poses jamais de diagnostic définitif et tu rappelles toujours qu'une consultation
vétérinaire reste nécessaire pour confirmer. Réponds UNIQUEMENT en JSON valide avec les clés :
"orientation" (texte court expliquant ce qui pourrait se passer et le geste à faire en attendant),
"urgency" ("LOW", "MEDIUM" ou "HIGH"),
"suspectedConditions" (tableau de 1 à 3 noms de pathologies possibles, en français),
"recommendation" (texte court : consulter un vétérinaire en urgence, dans les jours qui viennent, ou simple surveillance).`;

/** Appelle l'API Claude (avec vision si une photo est fournie) pour une pré-analyse symptômes/photo. */
export async function runPreAnalysis(input: PreAnalysisInput): Promise<PreAnalysisResult> {
  if (!config.anthropic.apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const content: any[] = [
    {
      type: 'text',
      text: `Espèce : ${input.species}\nSymptômes observés : ${input.symptoms}`,
    },
  ];

  if (input.photoBase64) {
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: input.photoMediaType || 'image/jpeg',
        data: input.photoBase64,
      },
    });
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.anthropic.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.anthropic.model,
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Claude API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const text: string = data?.content?.[0]?.text ?? '{}';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);

  return {
    orientation: String(parsed.orientation ?? ''),
    urgency: ['LOW', 'MEDIUM', 'HIGH'].includes(parsed.urgency) ? parsed.urgency : 'LOW',
    suspectedConditions: Array.isArray(parsed.suspectedConditions) ? parsed.suspectedConditions : [],
    recommendation: String(parsed.recommendation ?? ''),
  };
}
