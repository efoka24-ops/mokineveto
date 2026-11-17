import axios from 'axios';
import { useAdminStore } from '../store/useAdminStore';

// Backend : détection à l'exécution selon le domaine — aucun réglage Vercel requis.
// - ouvert sur localhost/127.0.0.1 → backend de dev local
// - ouvert sur un vrai domaine (Vercel) → backend Railway
// Surchargeable explicitement via VITE_API_URL.
const isLocalhost =
  typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
const API_BASE =
  import.meta.env.VITE_API_URL ||
  (isLocalhost ? 'http://localhost:8000' : 'https://mokineveto.trugroup.cm/api');

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// L'hébergement bloque PATCH/PUT/DELETE au niveau du serveur web (403 avant
// même d'atteindre PHP) : ces méthodes passent donc en POST avec un en-tête
// de substitution, que l'API restaure côté serveur. Voir php-api/index.php.
const patch = <T = any>(url: string, data?: any) =>
  api.post<T>(url, data, { headers: { 'X-HTTP-Method-Override': 'PATCH' } });
const del = <T = any>(url: string) =>
  api.post<T>(url, {}, { headers: { 'X-HTTP-Method-Override': 'DELETE' } });

// Inject JWT token
api.interceptors.request.use((config) => {
  const token = useAdminStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAdminStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export const adminApi = {
  // Auth
  login: (email: string, password: string) =>
    api.post('/auth/login', { emailOrPhone: email, password }),

  // Vets
  getPendingVets: () => api.get('/admin/vets/pending'),
  getAllVets: () => api.get('/admin/vets'),
  verifyVet: (id: string, status: 'APPROVED' | 'REJECTED', reason?: string) =>
    patch(`/admin/vets/${id}/verification`, { verification: status, reason }),

  // Users
  getUsers: (role?: string) => api.get('/admin/users', { params: { role } }),
  getUserDetail: (id: string) => api.get(`/admin/users/${id}`),
  moderateUser: (id: string, data: { status: 'ACTIVE' | 'SUSPENDED' | 'BANNED'; reason?: string; days?: number }) =>
    patch(`/admin/users/${id}/status`, data),
  resetUserPassword: (id: string) => api.post(`/admin/users/${id}/reset-password`, {}),
  editUserProfile: (id: string, data: { name?: string; email?: string; justification: string }) =>
    patch(`/admin/users/${id}/profile`, data),
  notifyUser: (id: string, message: string) => api.post(`/admin/users/${id}/notify`, { message }),
  anonymizeUser: (id: string, justification: string) => api.post(`/admin/users/${id}/anonymize`, { justification }),
  mergeUsers: (primaryId: string, duplicateId: string) => api.post('/admin/users/merge', { primaryId, duplicateId }),

  // Litiges (SFD-ADMIN §5.2)
  getDisputes: (status?: string) => api.get('/admin/disputes', { params: { status } }),
  resolveDispute: (id: string, data: { status: 'RESOLVED_ELEVEUR' | 'RESOLVED_VET' | 'ESCALATED'; resolutionNote: string }) =>
    patch(`/admin/disputes/${id}`, data),

  // Journal d'audit (SFD-ADMIN §16)
  getAuditLog: (params?: { actorId?: string; action?: string; resourceType?: string; since?: string }) =>
    api.get('/admin/audit-log', { params }),

  // Configuration de plateforme (SFD-ADMIN §15)
  getConfig: () => api.get('/admin/config'),
  updateConfig: (key: string, value: string) => patch(`/admin/config/${key}`, { value }),

  // Journal Mobile Money (SFD-ADMIN §6.2)
  getMobileMoney: (params?: { status?: string; method?: string; purpose?: string; since?: string }) =>
    api.get('/admin/mobile-money', { params }),

  // Administrateurs délégués (SFD-ADMIN §3.5)
  getAdmins: () => api.get('/admin/admins'),
  createAdmin: (data: { name: string; email?: string; phone: string; password: string; adminRole: string }) =>
    api.post('/admin/admins', data),
  setAdminStatus: (id: string, status: 'ACTIVE' | 'SUSPENDED') =>
    patch(`/admin/admins/${id}/status`, { status }),

  // Stats
  getStats: () => api.get('/admin/stats'),

  // Suivi transversal (SFD §4.14)
  getAllAppointments: (params?: { vetProfileId?: string; status?: string }) =>
    api.get('/admin/appointments', { params }),
  getReviews: () => api.get('/admin/reviews'),
  moderateReview: (id: string, hidden: boolean) => patch(`/admin/reviews/${id}`, { hidden }),

  // Chatbot — base de règles (SFD §4.14 : "gestion du chatbot IA")
  getChatbotRules: () => api.get('/admin/chatbot-rules'),
  createChatbotRule: (data: { conditionName: string; keywordsA: string[]; keywordsB: string[]; severe: boolean }) =>
    api.post('/admin/chatbot-rules', data),
  updateChatbotRule: (id: string, data: Partial<{ active: boolean; severe: boolean }>) =>
    patch(`/admin/chatbot-rules/${id}`, data),
  deleteChatbotRule: (id: string) => del(`/admin/chatbot-rules/${id}`),

  // Epidemiology
  getEpidemioAggregate: (since?: string) =>
    api.get('/admin/epidemiology', { params: { since } }),

  // Alerts (broadcast)
  createAlert: (data: {
    type: string;
    title: string;
    body: string;
    region?: string | null;
    ficheId?: string | null;
    severity?: string;
  }) => api.post('/alerts', data),
  getAlerts: () => api.get('/admin/alerts'),
  deleteAlert: (id: string) => del(`/alerts/${id}`),

  // Pays actifs (SFD §4.1.3)
  getCountries: () => api.get('/meta/countries'),

  // Fiches CRUD — base de connaissances (SFD-ADMIN §4.1)
  getFiches: () => api.get('/fiches'),
  getFiche: (id: string) => api.get(`/fiches/${id}`),
  createFiche: (data: any) => api.post('/fiches', data),
  updateFiche: (id: string, data: any) => patch(`/fiches/${id}`, data),
  deleteFiche: (id: string) => del(`/fiches/${id}`),
  setFicheStatus: (id: string, status: 'ACTIVE' | 'ARCHIVED') => patch(`/fiches/${id}/status`, { status }),
  getFicheVersions: (id: string) => api.get(`/fiches/${id}/versions`),
  exportFiches: () => api.get('/fiches/export'),
  importFiches: (rows: any[]) => api.post('/fiches/import', { rows }),
  getFicheDuplicates: () => api.get('/fiches/duplicates'),

  // Q&A vétérinaire (SFD-ADMIN §4.1.1)
  getQnA: () => api.get('/fiches/qna'),
  createQnA: (data: { questionFr: string; questionEn?: string; questionRw?: string; answer: string; tags: string[] }) =>
    api.post('/fiches/qna', data),
  updateQnA: (id: string, data: any) => patch(`/fiches/qna/${id}`, data),
  deleteQnA: (id: string) => del(`/fiches/qna/${id}`),

  // Marketplace — lecture publique dans marketplace.php, écriture admin dans
  // admin.php. "Suppression" = désactivation (active=0) : un fournisseur ou
  // produit déjà référencé par une commande ne peut pas disparaître de la base.
  getSuppliers: () => api.get('/marketplace/suppliers'),
  createSupplier: (data: any) => api.post('/admin/suppliers', data),
  deleteSupplier: (id: string) => del(`/admin/suppliers/${id}`),
  getProducts: (supplierId?: string) => api.get('/marketplace/products', { params: { supplierId } }),
  createProduct: (data: any) => api.post('/admin/products', data),
  deleteProduct: (id: string) => del(`/admin/products/${id}`),
  getOrders: () => api.get('/marketplace/orders'),
  updateOrderStatus: (id: string, status: string) =>
    patch(`/marketplace/orders/${id}`, { status }),
};

export const CAMEROON_REGIONS = [
  'ADAMAOUA', 'CENTRE', 'EST', 'EXTREME_NORD', 'LITTORAL',
  'NORD', 'NORD_OUEST', 'OUEST', 'SUD', 'SUD_OUEST',
];
