import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface HealthEvent {
  id: string;
  type: 'VACCIN' | 'VERMIFUGE' | 'TRAITEMENT' | 'AUTRE';
  label: string;
  date: string;
}

export interface Animal {
  id: string;
  name: string;
  species: string;
  breed: string;
  sex: 'M' | 'F';
  age: string;
  robe: string;
  health: HealthEvent[];
}

interface State {
  animals: Animal[];
  hydrate: () => Promise<void>;
  add: (a: Omit<Animal, 'id' | 'health'>) => void;
  addEvent: (animalId: string, e: Omit<HealthEvent, 'id'>) => void;
  get: (id: string) => Animal | undefined;
}

const KEY = 'mokinevet.herd';

const SEED: Animal[] = [
  {
    id: 'a1', name: 'Bella', species: 'Bovin', breed: 'Zébu', sex: 'F', age: '3 ans', robe: 'Robe blanche',
    health: [
      { id: 'h1', type: 'VACCIN', label: 'Vaccin fièvre aphteuse', date: '12/03/2026' },
      { id: 'h2', type: 'VERMIFUGE', label: 'Vermifuge', date: '02/05/2026' },
    ],
  },
];

export const useHerdStore = create<State>((set, get) => ({
  animals: [],
  hydrate: async () => {
    const raw = await AsyncStorage.getItem(KEY);
    set({ animals: raw ? JSON.parse(raw) : SEED });
  },
  add: (a) => {
    const animal: Animal = { ...a, id: `a-${Date.now().toString(36)}`, health: [] };
    const animals = [animal, ...get().animals];
    set({ animals });
    AsyncStorage.setItem(KEY, JSON.stringify(animals));
  },
  addEvent: (animalId, e) => {
    const animals = get().animals.map((a) =>
      a.id === animalId ? { ...a, health: [{ ...e, id: `h-${Date.now().toString(36)}` }, ...a.health] } : a,
    );
    set({ animals });
    AsyncStorage.setItem(KEY, JSON.stringify(animals));
  },
  get: (id) => get().animals.find((a) => a.id === id),
}));
