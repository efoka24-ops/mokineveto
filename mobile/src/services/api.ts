/**
 * Client HTTP vers le backend MokineVeto (Railway).
 * Injecte le JWT du store Zustand dans chaque requête authentifiée.
 */
import { API_BASE_URL } from './config';

export class ApiError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`API ${status}`);
  }
}

async function getAuthToken(): Promise<string | null> {
  // Import dynamique pour éviter les dépendances circulaires
  const { useAuthStore } = await import('../store/useAuthStore');
  return useAuthStore.getState().token;
}

async function request<T>(path: string, init?: RequestInit, requiresAuth = false): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init?.headers as Record<string, string> ?? {}) };

  if (requiresAuth) {
    const token = await getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    // 401 : token expiré/invalide → logout automatique
    if (res.status === 401) {
      const { useAuthStore } = await import('../store/useAuthStore');
      useAuthStore.getState().signOut();
    }
    throw new ApiError(res.status, body);
  }
  return body as T;
}

export const api = {
  get: <T>(path: string, auth = false) => request<T>(path, undefined, auth),
  post: <T>(path: string, data: unknown, auth = false) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data) }, auth),
  patch: <T>(path: string, data: unknown, auth = false) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(data) }, auth),
};

// ─── Auth (signup/login/profile) ──────────────────────────────────
export interface SignupPayload {
  name: string;
  email?: string;
  phone: string;
  password: string;
  birthDate?: string;
  role: 'ELEVEUR' | 'VETERINAIRE';
  // Vet-specific fields (optional)
  specialty?: string;
  gender?: 'homme' | 'femme';
  experienceYears?: number;
  ordreNumber?: string;
  professional?: boolean;
  focus?: string;
}

export interface LoginPayload {
  emailOrPhone: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    name: string;
    email?: string;
    phone: string;
    role: 'ELEVEUR' | 'VETERINAIRE' | 'ADMIN';
    avatarUrl?: string;
    birthDate?: string;
  };
}

export interface UpdateProfilePayload {
  name?: string;
  avatarUrl?: string;
  birthDate?: string;
}

export const signup = (payload: SignupPayload) =>
  api.post<AuthResponse>('/auth/signup', payload);

export const login = (payload: LoginPayload) =>
  api.post<AuthResponse>('/auth/login', payload);

export const getProfile = () =>
  api.get<{ success: boolean; user: AuthResponse['user'] }>('/auth/me', true);

export const updateProfile = (payload: UpdateProfilePayload) =>
  api.patch<{ success: boolean; user: AuthResponse['user'] }>('/auth/me', payload, true);

// ─── Auth (OTP e-mail — legacy, pour password reset futur) ────────
export const requestOtp = (payload: { email?: string; phone?: string }) =>
  api.post<{ success: boolean; channel: string }>('/auth/request-otp', payload);

export const verifyOtpApi = (identifier: string, code: string) =>
  api.post<{ success: boolean; tempToken: string }>('/auth/verify-otp', { identifier, code });

// ─── Paiement (Camoo via backend) ──────────────────────────────────
export const cashout = (payload: {
  amount: number;
  phone_number: string;
  external_reference?: string;
  shopping_cart_details?: Record<string, unknown>;
}) => api.post<{ success: boolean; data: unknown }>('/payments/cashout', payload, true);

export const verifyPayment = (id: string) =>
  api.get<{ success: boolean; data: unknown }>(`/payments/verify?id=${encodeURIComponent(id)}`, true);

// ─── Vets (public) ─────────────────────────────────────────────────
export interface Vet {
  id: string;
  name: string;
  specialty: string;
  gender: 'homme' | 'femme';
  rating: number;
  reviews: number;
  experienceYears: number;
  schedule: string;
  hourlyRate: number;
  photo?: string;
  professional: boolean;
  focus?: string;
  ordreNumber?: string;
}

export const listVets = (filters?: { gender?: string; specialty?: string; topRated?: boolean }) => {
  const query = new URLSearchParams();
  if (filters?.gender) query.append('gender', filters.gender);
  if (filters?.specialty) query.append('specialty', filters.specialty);
  if (filters?.topRated) query.append('topRated', 'true');
  return api.get<{ success: boolean; data: Vet[] }>(`/vets${query.size > 0 ? `?${query}` : ''}`);
};

export const getVet = (id: string) =>
  api.get<{ success: boolean; data: Vet }>(`/vets/${id}`);

export const getVetAvailability = (id: string, date: string) =>
  api.get<{ success: boolean; data: { slots: string[] } }>(`/vets/${id}/availability?date=${date}`);

export const listSpecialties = () =>
  api.get<{ success: boolean; data: string[] }>('/vets/specialties');
