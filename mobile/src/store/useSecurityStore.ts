import { create } from 'zustand';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const secureStorage = Platform.OS === 'web'
  ? { setItemAsync: AsyncStorage.setItem, getItemAsync: AsyncStorage.getItem, deleteItemAsync: AsyncStorage.removeItem }
  : SecureStore;

const PIN_KEY = 'mokinevet.pin';
const BIO_KEY = 'mokinevet.biometric';

/** Hash léger du PIN (pas un secret serveur — protège juste l'accès local à l'app). */
async function hashPin(pin: string): Promise<string> {
  // djb2-like hash, suffisant pour un PIN local non transmis
  let h = 5381;
  for (let i = 0; i < pin.length; i++) h = (h * 33) ^ pin.charCodeAt(i);
  return (h >>> 0).toString(16);
}

interface State {
  hasPin: boolean;
  biometricEnabled: boolean;
  hydrate: () => Promise<void>;
  setPin: (pin: string) => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  clearPin: () => Promise<void>;
  setBiometric: (enabled: boolean) => Promise<void>;
}

export const useSecurityStore = create<State>((set, get) => ({
  hasPin: false,
  biometricEnabled: false,

  hydrate: async () => {
    const pin = await secureStorage.getItemAsync(PIN_KEY);
    const bio = await AsyncStorage.getItem(BIO_KEY);
    set({ hasPin: !!pin, biometricEnabled: bio === 'true' });
  },

  setPin: async (pin) => {
    const hashed = await hashPin(pin);
    await secureStorage.setItemAsync(PIN_KEY, hashed);
    set({ hasPin: true });
  },

  verifyPin: async (pin) => {
    const stored = await secureStorage.getItemAsync(PIN_KEY);
    if (!stored) return false;
    const hashed = await hashPin(pin);
    return hashed === stored;
  },

  clearPin: async () => {
    await secureStorage.deleteItemAsync(PIN_KEY);
    await AsyncStorage.setItem(BIO_KEY, 'false');
    set({ hasPin: false, biometricEnabled: false });
  },

  setBiometric: async (enabled) => {
    await AsyncStorage.setItem(BIO_KEY, enabled ? 'true' : 'false');
    set({ biometricEnabled: enabled });
  },
}));
