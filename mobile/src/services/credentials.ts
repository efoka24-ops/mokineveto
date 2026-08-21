/**
 * Dépôt des pièces justificatives du praticien (SFD §4.1.2).
 * Diplôme vétérinaire et carte d'ordre, JPG/PNG/PDF, 5 Mo maximum.
 */
import { API_BASE_URL } from './config';
import { api, ApiError } from './api';

export type CredentialType = 'DIPLOMA' | 'ORDER_CARD';

export interface VetCredential {
  id: string;
  type: CredentialType;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  originalName?: string;
  createdAt: string;
}

export const CREDENTIAL_LABEL: Record<CredentialType, string> = {
  DIPLOMA: 'Diplôme vétérinaire',
  ORDER_CARD: "Carte de l'Ordre",
};

/** Plafond imposé par la SFD §4.1.2, vérifié côté client pour éviter un envoi inutile. */
export const MAX_CREDENTIAL_BYTES = 5 * 1024 * 1024;

export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

/**
 * Dépose une pièce. Un dépôt du même type remplace le précédent côté serveur.
 * `token` est passé explicitement : l'inscription dépose ses pièces juste après
 * la création du compte, avant que le store ne soit nécessairement hydraté.
 */
export async function uploadCredential(
  type: CredentialType,
  file: PickedFile,
  token: string
): Promise<VetCredential> {
  if (file.size !== undefined && file.size > MAX_CREDENTIAL_BYTES) {
    throw new Error('Fichier trop volumineux : 5 Mo maximum.');
  }

  const form = new FormData();
  form.append('type', type);
  form.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  } as unknown as Blob);

  const res = await fetch(`${API_BASE_URL}/vet-credentials`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body);
  return (body as { data: VetCredential }).data;
}

export async function listCredentials(): Promise<VetCredential[]> {
  const res = await api.get<{ data: VetCredential[] }>('/vet-credentials', true);
  return res.data ?? [];
}
