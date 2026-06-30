import { api } from './api';

export interface Vet {
  id: string;
  name: string;
  specialty: string;
  gender: 'femme' | 'homme';
  rating: number;
  reviews: number;
  experienceYears: number;
  schedule: string;
  hourlyRate: number;
  photo: string;
  professional: boolean;
  focus: string;
  ordreNumber: string;
}

export async function listVets(filters?: {
  gender?: string;
  specialty?: string;
  topRated?: boolean;
}): Promise<Vet[]> {
  const query = new URLSearchParams();
  if (filters?.gender) query.append('gender', filters.gender);
  if (filters?.specialty) query.append('specialty', filters.specialty);
  if (filters?.topRated) query.append('topRated', 'true');

  const response = await api.get<{ success: boolean; data: Vet[] }>(
    `/vets${query.size > 0 ? `?${query}` : ''}`
  );
  return response.data || [];
}

export async function getVet(id: string): Promise<Vet | undefined> {
  const response = await api.get<{ success: boolean; data: Vet }>(`/vets/${id}`);
  return response.data;
}

export function getVetSync(_id: string): Vet | undefined {
  return undefined;
}

export async function listByGender(gender: 'femme' | 'homme'): Promise<Vet[]> {
  return listVets({ gender });
}

export async function listTopRated(): Promise<Vet[]> {
  return listVets({ topRated: true });
}

export async function listSpecialties(): Promise<string[]> {
  const response = await api.get<{ success: boolean; data: string[] }>('/vets/specialties');
  return response.data || [];
}

export const SPECIALTIES = [
  'Médecine bovine',
  'Aviculture',
  'Médecine des petits ruminants',
  'Reproduction animale',
  'Pathologie porcine',
  'Santé du troupeau',
];
