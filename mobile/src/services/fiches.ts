import { api } from './api';

export const FICHE_PRICE = 100; // FCFA per view

export interface Fiche {
  id: string;
  name: string;
  species: string[];
  contagious: boolean;
  description: string;
  fieldObs: string;
  prevention: string;
  vetInfo: string;
}

export async function listFiches(): Promise<Fiche[]> {
  const response = await api.get<{
    success: boolean;
    data: Fiche[];
  }>('/fiches');
  return response.data || [];
}

export interface FicheDetailResponse {
  fiche?: Fiche;
  unlocked: boolean;
}

export async function getFiche(id: string): Promise<FicheDetailResponse> {
  const response = await api.get<{
    success: boolean;
    data: Fiche;
    unlocked?: boolean;
    message?: string;
  }>(`/fiches/${id}`, true);
  return { fiche: response.data, unlocked: response.unlocked ?? false };
}

export interface NewFiche {
  name: string;
  species: string[];
  contagious: boolean;
  description: string;
  fieldObs?: string;
  prevention?: string;
  vetInfo?: string;
}

export const createFiche = (data: NewFiche) =>
  api.post<{ success: boolean; data: { id: string } }>('/fiches', data, true);

export const deleteFiche = (id: string) =>
  api.delete<{ success: boolean; data: { deleted: boolean } }>(`/fiches/${id}`, true);
