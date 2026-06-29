import { create } from 'zustand';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN';
}

interface AdminState {
  user: AdminUser | null;
  token: string | null;
  login: (user: AdminUser, token: string) => void;
  logout: () => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  user: null,
  token: localStorage.getItem('admin_token') ? JSON.parse(localStorage.getItem('admin_data') || '{}') : null,

  login: (user, token) => {
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_data', JSON.stringify(user));
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_data');
    set({ user: null, token: null });
  },
}));
