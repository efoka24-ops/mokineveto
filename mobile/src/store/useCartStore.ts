import { create } from 'zustand';
import type { Product } from '../services/marketplace';

export interface CartLine {
  product: Product;
  qty: number;
}

interface State {
  lines: CartLine[];
  add: (product: Product) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  total: () => number;
  supplierId: () => string | null;
}

export const useCartStore = create<State>((set, get) => ({
  lines: [],
  add: (product) => {
    const lines = get().lines;
    const existing = lines.find((l) => l.product.id === product.id);
    if (existing) {
      set({ lines: lines.map((l) => (l.product.id === product.id ? { ...l, qty: l.qty + 1 } : l)) });
    } else {
      set({ lines: [...lines, { product, qty: 1 }] });
    }
  },
  remove: (productId) => set({ lines: get().lines.filter((l) => l.product.id !== productId) }),
  setQty: (productId, qty) => {
    if (qty <= 0) {
      set({ lines: get().lines.filter((l) => l.product.id !== productId) });
      return;
    }
    set({ lines: get().lines.map((l) => (l.product.id === productId ? { ...l, qty } : l)) });
  },
  clear: () => set({ lines: [] }),
  total: () => get().lines.reduce((s, l) => s + l.product.price * l.qty, 0),
  supplierId: () => get().lines[0]?.product.supplierId ?? null,
}));
