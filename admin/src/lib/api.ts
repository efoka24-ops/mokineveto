import axios from 'axios';
import { useAdminStore } from '../store/useAdminStore';

const API_BASE = 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

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
  verifyVet: (id: string, status: 'APPROVED' | 'REJECTED', note?: string) =>
    api.patch(`/admin/vets/${id}/verify`, { status, note }),

  // Users
  getUsers: (role?: string) => api.get('/admin/users', { params: { role } }),
  getUser: (id: string) => api.get(`/admin/users/${id}`),
  updateUser: (id: string, data: any) => api.patch(`/admin/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),

  // Stats
  getStats: () => api.get('/admin/stats'),

  // Epidemiology
  getEpidemioAggregate: (since?: string) =>
    api.get('/admin/epidemio/aggregate', { params: { since } }),

  // Alerts (broadcast)
  createAlert: (data: {
    type: string;
    title: string;
    body: string;
    region?: string | null;
    ficheId?: string | null;
    severity?: string;
  }) => api.post('/alerts', data),

  // Fiches CRUD
  getFiches: () => api.get('/fiches'),
  createFiche: (data: any) => api.post('/fiches', data),
  updateFiche: (id: string, data: any) => api.patch(`/fiches/${id}`, data),
  deleteFiche: (id: string) => api.delete(`/fiches/${id}`),

  // Marketplace
  getSuppliers: () => api.get('/admin/suppliers'),
  createSupplier: (data: any) => api.post('/admin/suppliers', data),
  updateSupplier: (id: string, data: any) => api.patch(`/admin/suppliers/${id}`, data),
  deleteSupplier: (id: string) => api.delete(`/admin/suppliers/${id}`),
  getProducts: (supplierId?: string) => api.get('/admin/products', { params: { supplierId } }),
  createProduct: (data: any) => api.post('/admin/products', data),
  updateProduct: (id: string, data: any) => api.patch(`/admin/products/${id}`, data),
  deleteProduct: (id: string) => api.delete(`/admin/products/${id}`),
  getOrders: () => api.get('/admin/orders'),
  updateOrderStatus: (id: string, status: string) =>
    api.patch(`/admin/orders/${id}/status`, { status }),
};

export const CAMEROON_REGIONS = [
  'ADAMAOUA', 'CENTRE', 'EST', 'EXTREME_NORD', 'LITTORAL',
  'NORD', 'NORD_OUEST', 'OUEST', 'SUD', 'SUD_OUEST',
];
