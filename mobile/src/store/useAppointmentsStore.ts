import { create } from 'zustand';
import {
  listAppointments,
  cancelAppointment as apiCancel,
  type ApiAppointment,
} from '../services/api';

export type AppointmentStatus = 'UPCOMING' | 'COMPLETED' | 'CANCELLED';

export interface Appointment {
  id: string;
  vetId: string;
  vetName: string;
  specialty: string;
  date: string;
  time: string;
  amount: number;
  reason: string;
  method?: string;
  status: AppointmentStatus;
  // Vet-side fields
  eleveurName?: string;
  eleveurPhone?: string;
  hasReview?: boolean;
}

interface State {
  items: Appointment[];
  loading: boolean;
  hydrate: () => Promise<void>;
  load: () => Promise<void>;
  cancel: (id: string, reasonCode: string, note?: string) => Promise<void>;
}

function mapApiAppointment(a: ApiAppointment): Appointment {
  const start = new Date(a.startsAt);
  const date = start.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return {
    id: a.id,
    vetId: a.vetProfileId,
    vetName: a.vetProfile?.user?.name ?? 'Vétérinaire',
    specialty: a.vetProfile?.specialty ?? '',
    date,
    time,
    amount: a.amount,
    reason: a.reason || 'Consultation',
    method: a.method,
    status: a.status,
    eleveurName: a.eleveur?.name,
    eleveurPhone: a.eleveur?.phone,
    hasReview: !!a.review,
  };
}

export const useAppointmentsStore = create<State>((set, get) => ({
  items: [],
  loading: false,

  hydrate: async () => {
    await get().load();
  },

  load: async () => {
    try {
      set({ loading: true });
      const response = await listAppointments();
      if (response.data) {
        set({ items: response.data.map(mapApiAppointment) });
      }
    } catch (_err) {
      console.warn('[useAppointmentsStore] Failed to load appointments');
    } finally {
      set({ loading: false });
    }
  },

  cancel: async (id, reasonCode, note) => {
    try {
      await apiCancel(id, reasonCode, note);
      const items = get().items.map((x) =>
        x.id === id ? { ...x, status: 'CANCELLED' as const } : x
      );
      set({ items });
    } catch (_err) {
      console.warn('[useAppointmentsStore] Failed to cancel appointment');
    }
  },
}));
