import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppointmentStatus = 'UPCOMING' | 'COMPLETED' | 'CANCELLED';

export interface Appointment {
  id: string;
  vetId: string;
  vetName: string;
  specialty: string;
  date: string; // ex: "Lun 24, Juin"
  time: string; // ex: "10H00"
  amount: number; // XAF
  reason: string; // ex: "Bovins"
  method?: string; // ex: "Orange Money"
  status: AppointmentStatus;
}

interface State {
  items: Appointment[];
  hydrate: () => Promise<void>;
  add: (a: Appointment) => void;
  cancel: (id: string) => void;
}

const KEY = 'mokinevet.appointments';

export const useAppointmentsStore = create<State>((set, get) => ({
  items: [],
  hydrate: async () => {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) set({ items: JSON.parse(raw) });
  },
  add: (a) => {
    const items = [a, ...get().items];
    set({ items });
    AsyncStorage.setItem(KEY, JSON.stringify(items));
  },
  cancel: (id) => {
    const items = get().items.map((x) => (x.id === id ? { ...x, status: 'CANCELLED' as const } : x));
    set({ items });
    AsyncStorage.setItem(KEY, JSON.stringify(items));
  },
}));
