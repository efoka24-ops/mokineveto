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
  hydrated: boolean;
  hydrate: () => void;
  login: (user: AdminUser, token: string) => void;
  logout: () => void;
}

// Hydrate from localStorage on page load
const getInitialState = () => {
  if (typeof window === 'undefined') return { user: null, token: null };
  const token = localStorage.getItem('admin_token');
  const userData = localStorage.getItem('admin_data');
  return {
    token,
    user: userData ? JSON.parse(userData) : null,
  };
};

export const useAdminStore = create<AdminState>((set) => {
  const initial = getInitialState();
  return {
    user: initial.user,
    token: initial.token,
    hydrated: !!initial.token,

    hydrate: () => {
      const state = getInitialState();
      set({ user: state.user, token: state.token, hydrated: !!state.token });
    },

    login: (user, token) => {
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_data', JSON.stringify(user));
      set({ user, token, hydrated: true });
    },

    logout: () => {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_data');
      set({ user: null, token: null, hydrated: false });
    },
  };
});
