import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Role = 'ELEVEUR' | 'VETERINAIRE';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  avatarUrl?: string;
  birthDate?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  signIn: (user: User, token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const STORAGE_KEY = 'mokinevet.auth';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const { user, token } = JSON.parse(raw);
        set({ user, token, hydrated: true });
        return;
      }
    } catch {
      // ignore corrupted storage
    }
    set({ hydrated: true });
  },

  signIn: async (user, token) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }));
    set({ user, token });
  },

  signOut: async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    set({ user: null, token: null });
  },
}));
