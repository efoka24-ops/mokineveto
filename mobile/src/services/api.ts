/**
 * Client HTTP vers le backend MokineVeto (Railway).
 * Injecte le JWT du store Zustand dans chaque requête authentifiée.
 */
import { API_BASE_URL } from './config';

export class ApiError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`API ${status}`);
    this.name = 'ApiError';
  }

  /** Message clair, en français, présentable à l'utilisateur final. */
  get userMessage(): string {
    return toUserMessage(this);
  }
}

/** Extrait un éventuel message précis renvoyé par le backend. */
function backendMessage(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const err = (body as any).error;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && typeof err.message === 'string') return err.message;
  if (typeof (body as any).message === 'string') return (body as any).message;
  return null;
}

/**
 * Traduit n'importe quelle erreur (ApiError, panne réseau, timeout…) en un message
 * court et compréhensible. On masque volontairement les détails techniques.
 */
export function toUserMessage(err: unknown): string {
  // Panne réseau / serveur injoignable (fetch lève une TypeError)
  if (!(err instanceof ApiError)) {
    return "Impossible de joindre le serveur. Vérifiez votre connexion internet, puis réessayez.";
  }

  const { status, body } = err;

  // Messages métier connus (doublons compte, identifiants, etc.)
  const code = (body as any)?.error?.code;
  if (status === 409 || code === 'USER_EXISTS') {
    return "Un compte existe déjà avec cet e-mail ou ce numéro de téléphone.";
  }
  if (status === 401) {
    return "Identifiants incorrects. Vérifiez votre e-mail/téléphone et votre mot de passe.";
  }
  if (status === 403) {
    return "Accès refusé.";
  }
  if (status === 404) {
    return "Ressource introuvable.";
  }
  if (status === 422 || status === 400) {
    // Validation : on tente d'afficher le message backend s'il est lisible.
    return backendMessage(body) || "Certaines informations sont invalides. Vérifiez le formulaire.";
  }
  if (status === 429) {
    return "Trop de tentatives. Patientez un instant avant de réessayer.";
  }
  // 0 = erreur réseau encapsulée ; 5xx = panne serveur
  if (status === 0 || status >= 500) {
    return "Le service est momentanément indisponible. Réessayez dans quelques instants.";
  }
  return "Une erreur inattendue s'est produite. Réessayez.";
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

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch (_networkErr) {
    // Panne réseau / DNS / serveur injoignable : on encapsule en ApiError(0)
    // pour un message utilisateur homogène (jamais de "TypeError: Network request failed").
    throw new ApiError(0, null);
  }

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

// ─── Appointments ──────────────────────────────────────────────────
export interface ApiAppointment {
  id: string;
  eleveurId: string;
  vetProfileId: string;
  startsAt: string;
  endsAt: string;
  amount: number;
  reason: string;
  method?: string;
  status: 'UPCOMING' | 'COMPLETED' | 'CANCELLED';
  cancelReasonCode?: string;
  cancelNote?: string;
  cancelledAt?: string;
  eleveur?: { id: string; name: string; phone: string; avatarUrl?: string };
  vetProfile?: {
    id: string;
    specialty: string;
    userId: string;
    user: { id: string; name: string; avatarUrl?: string };
  };
  review?: { id: string; stars: number; comment?: string } | null;
}

export const listAppointments = () =>
  api.get<{ success: boolean; data: ApiAppointment[] }>('/appointments', true);

export const getAppointment = (id: string) =>
  api.get<{ success: boolean; data: ApiAppointment }>(`/appointments/${id}`, true);

export const cancelAppointment = (id: string, reasonCode: string, note?: string) =>
  api.patch<{ success: boolean; data: ApiAppointment }>(
    `/appointments/${id}/cancel`,
    { reasonCode, note },
    true
  );

export const completeAppointment = (id: string) =>
  api.patch<{ success: boolean; data: ApiAppointment }>(`/appointments/${id}/complete`, {}, true);

export const reviewAppointment = (id: string, stars: number, comment?: string) =>
  api.post<{ success: boolean; data: unknown }>(
    `/appointments/${id}/review`,
    { stars, comment },
    true
  );

// ─── Notifications & Alerts ────────────────────────────────────────
export interface ApiNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt?: string | null;
  createdAt: string;
}

export interface ApiAlert {
  id: string;
  type: 'EPIDEMIC' | 'REMINDER' | 'SYSTEM';
  title: string;
  body: string;
  region?: string | null;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  createdAt: string;
  expiresAt?: string | null;
}

export const listNotifications = () =>
  api.get<{ success: boolean; data: ApiNotification[] }>('/notifications', true);

export const markNotificationRead = (id: string) =>
  api.patch<{ success: boolean; data: ApiNotification }>(`/notifications/${id}/read`, {}, true);

export const registerPushToken = (token: string) =>
  api.post<{ success: boolean }>('/notifications/register-push-token', { token }, true);

export const listAlerts = () =>
  api.get<{ success: boolean; data: ApiAlert[] }>('/alerts', true);

// ─── Chat ──────────────────────────────────────────────────────────
export interface ApiConversation {
  id: string;
  eleveurId: string;
  vetProfileId: string;
  lastMessageAt?: string;
  messages?: ApiMessage[];
}

export interface ApiMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  author?: { id: string; name: string };
}

export const createConversation = (vetProfileId: string) =>
  api.post<{ success: boolean; data: ApiConversation }>('/chat/conversations', { vetProfileId }, true);

export const getConversation = (id: string) =>
  api.get<{ success: boolean; data: ApiConversation }>(`/chat/conversations/${id}`, true);

export const listConversations = () =>
  api.get<{ success: boolean; data: ApiConversation[] }>('/chat/conversations', true);

export const sendMessageRest = (conversationId: string, text: string) =>
  api.post<{ success: boolean; data: ApiMessage }>(
    `/chat/conversations/${conversationId}/messages`,
    { text },
    true
  );
