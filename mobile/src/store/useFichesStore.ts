import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface State {
  unlocked: string[]; // ids de fiches déjà payées (consultation en ligne)
  hydrate: () => Promise<void>;
  unlock: (id: string) => void;
  isUnlocked: (id: string) => boolean;
}

const KEY = 'mokinevet.fiches.unlocked';

export const useFichesStore = create<State>((set, get) => ({
  unlocked: [],
  hydrate: async () => {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) set({ unlocked: JSON.parse(raw) });
  },
  unlock: (id) => {
    if (get().unlocked.includes(id)) return;
    const unlocked = [...get().unlocked, id];
    set({ unlocked });
    AsyncStorage.setItem(KEY, JSON.stringify(unlocked));
  },
  isUnlocked: (id) => get().unlocked.includes(id),
}));
