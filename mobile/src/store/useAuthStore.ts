import { create } from 'zustand';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { signup as signupApi, login as loginApi, updateProfile as updateProfileApi, SignupPayload, LoginPayload, UpdateProfilePayload } from '../services/api';

// expo-secure-store has no web implementation; fall back to AsyncStorage there.
const secureStorage = Platform.OS === 'web'
  ? { setItemAsync: AsyncStorage.setItem, getItemAsync: AsyncStorage.getItem, deleteItemAsync: AsyncStorage.removeItem }
  : SecureStore;

export type Role = 'ELEVEUR' | 'VETERINAIRE' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: Role;
  avatarUrl?: string;
  birthDate?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  hydrated: boolean;
  loading: boolean;
  error: string | null;

  hydrate: () => Promise<void>;
  signup: (payload: SignupPayload) => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<void>;
  signOut: () => Promise<void>;
}

const TOKEN_KEY = 'mokinevet.token';
const USER_KEY = 'mokinevet.user';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  hydrated: false,
  loading: false,
  error: null,

  hydrate: async () => {
    try {
      const token = await secureStorage.getItemAsync(TOKEN_KEY);
      const userJson = await AsyncStorage.getItem(USER_KEY);
      if (token && userJson) {
        const user = JSON.parse(userJson);
        set({ user, token, hydrated: true });
        return;
      }
    } catch {
      // ignore corrupted storage
    }
    set({ hydrated: true });
  },

  signup: async (payload) => {
    set({ loading: true, error: null });
    try {
      const res = await signupApi(payload);
      await secureStorage.setItemAsync(TOKEN_KEY, res.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(res.user));
      set({ user: res.user, token: res.token, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signup failed';
      set({ error: message, loading: false });
      throw err;
    }
  },

  login: async (payload) => {
    set({ loading: true, error: null });
    try {
      const res = await loginApi(payload);
      await secureStorage.setItemAsync(TOKEN_KEY, res.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(res.user));
      set({ user: res.user, token: res.token, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      set({ error: message, loading: false });
      throw err;
    }
  },

  updateProfile: async (payload) => {
    set({ loading: true, error: null });
    try {
      const res = await updateProfileApi(payload);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(res.user));
      set({ user: res.user, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed';
      set({ error: message, loading: false });
      throw err;
    }
  },

  signOut: async () => {
    try {
      await secureStorage.deleteItemAsync(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
    } catch {
      // ignore
    }
    set({ user: null, token: null, error: null });
  },
}));
