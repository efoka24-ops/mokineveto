import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface FavoritesState {
  ids: string[];
  hydrate: () => Promise<void>;
  toggle: (id: string) => void;
  has: (id: string) => boolean;
}

const KEY = 'mokinevet.favorites';

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  ids: [],
  hydrate: async () => {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) set({ ids: JSON.parse(raw) });
  },
  toggle: (id) => {
    const ids = get().ids.includes(id) ? get().ids.filter((x) => x !== id) : [...get().ids, id];
    set({ ids });
    AsyncStorage.setItem(KEY, JSON.stringify(ids));
  },
  has: (id) => get().ids.includes(id),
}));
