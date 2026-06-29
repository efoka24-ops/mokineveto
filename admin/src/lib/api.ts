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
};
