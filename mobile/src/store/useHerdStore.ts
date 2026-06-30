import { create } from 'zustand';
import { api } from '../services/api';
import { offlineQueue } from '../services/offlineQueue';

export interface HealthEvent {
  id: string;
  type: 'VACCIN' | 'VERMIFUGE' | 'TRAITEMENT' | 'AUTRE';
  label: string;
  date: string;
  nextDueAt?: string;
  ficheId?: string;
}

export interface Animal {
  id: string;
  userId: string;
  farmId?: string;
  name: string;
  species: string;
  breed: string;
  sex: 'M' | 'F';
  age: string;
  robe: string;
  healthEvents?: HealthEvent[];
}

export interface Farm {
  id: string;
  userId: string;
  name: string;
  region: string;
  isDefault: boolean;
}

interface State {
  animals: Animal[];
  farms: Farm[];
  currentFarmId: string | null;

  hydrate: () => Promise<void>;
  loadAnimals: (farmId?: string) => Promise<void>;
  loadFarms: () => Promise<void>;
  setCurrentFarm: (farmId: string | null) => void;

  add: (a: Omit<Animal, 'id' | 'userId'>) => Promise<void>;
  addEvent: (animalId: string, e: Omit<HealthEvent, 'id'>) => Promise<void>;
  get: (id: string) => Animal | undefined;
}

export const useHerdStore = create<State>((set, get) => ({
  animals: [],
  farms: [],
  currentFarmId: null,

  hydrate: async () => {
    await get().loadFarms();
    if (get().farms.length > 0) {
      const defaultFarm = get().farms.find((f) => f.isDefault);
      set({ currentFarmId: defaultFarm?.id || get().farms[0].id });
      await get().loadAnimals(defaultFarm?.id || get().farms[0].id);
    }
    await offlineQueue.startSyncListener();
  },

  loadFarms: async () => {
    try {
      const response = await api.get<{
        success: boolean;
        data: Farm[];
      }>('/farms', true);
      if (response.data) {
        set({ farms: response.data });
      }
    } catch (_err) {
      console.warn('[useHerdStore] Failed to load farms');
    }
  },

  loadAnimals: async (farmId?: string) => {
    try {
      const targetFarmId = farmId || get().currentFarmId;
      const query = targetFarmId ? `?farmId=${targetFarmId}` : '';
      const response = await api.get<{
        success: boolean;
        data: Animal[];
      }>(`/animals${query}`, true);
      if (response.data) {
        set({ animals: response.data });
      }
    } catch (_err) {
      console.warn('[useHerdStore] Failed to load animals');
    }
  },

  setCurrentFarm: (farmId: string | null) => {
    set({ currentFarmId: farmId });
    if (farmId) {
      get().loadAnimals(farmId);
    }
  },

  add: async (a) => {
    const payload = {
      ...a,
      farmId: get().currentFarmId || undefined,
    };

    try {
      const response = await api.post<{ success: boolean; data: Animal }>(
        '/animals',
        payload,
        true
      );
      if (response.data) {
        set({ animals: [response.data, ...get().animals] });
      }
    } catch (_err) {
      console.warn('[useHerdStore] Failed to create animal, queueing offline');
      await offlineQueue.add('CREATE_ANIMAL', payload);
    }
  },

  addEvent: async (animalId, e) => {
    const payload = {
      ...e,
      type: e.type,
      label: e.label,
      date: e.date,
      nextDueAt: e.nextDueAt,
      ficheId: e.ficheId,
    };

    try {
      const response = await api.post<{ success: boolean; data: HealthEvent }>(
        `/animals/${animalId}/health-events`,
        payload,
        true
      );
      if (response.data) {
        const animals = get().animals.map((a) =>
          a.id === animalId
            ? { ...a, healthEvents: [response.data, ...(a.healthEvents || [])] }
            : a
        );
        set({ animals });
      }
    } catch (_err) {
      console.warn('[useHerdStore] Failed to add health event, queueing offline');
      await offlineQueue.add('ADD_HEALTH_EVENT', { animalId, ...payload });
    }
  },

  get: (id) => get().animals.find((a) => a.id === id),
}));
