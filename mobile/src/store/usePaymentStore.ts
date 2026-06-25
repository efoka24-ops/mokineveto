import { create } from 'zustand';
import type { PaymentMethod } from '../services/payment';

interface State {
  method: PaymentMethod;
  phone: string;
  setMethod: (m: PaymentMethod) => void;
  setPhone: (p: string) => void;
}

export const usePaymentStore = create<State>((set) => ({
  method: 'ORANGE_MONEY',
  phone: '',
  setMethod: (method) => set({ method }),
  setPhone: (phone) => set({ phone }),
}));
