import { api } from './api';

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  region?: string;
}

export interface Product {
  id: string;
  supplierId: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  imageUrl?: string;
  supplier?: Supplier;
}

export interface OrderItem {
  id: string;
  productId: string;
  qty: number;
  unitPrice: number;
  product?: Product;
}

export interface Order {
  id: string;
  supplierId: string;
  status: 'PENDING' | 'CONFIRMED' | 'DELIVERED' | 'CANCELLED';
  totalAmount: number;
  createdAt: string;
  items?: OrderItem[];
  supplier?: Supplier;
}

export const listSuppliers = (region?: string) => {
  const q = region ? `?region=${region}` : '';
  return api.get<{ success: boolean; data: Supplier[] }>(`/marketplace/suppliers${q}`);
};

export const listProducts = (filters?: { supplierId?: string; category?: string }) => {
  const params = new URLSearchParams();
  if (filters?.supplierId) params.append('supplierId', filters.supplierId);
  if (filters?.category) params.append('category', filters.category);
  return api.get<{ success: boolean; data: Product[] }>(
    `/marketplace/products${params.size ? `?${params}` : ''}`
  );
};

export const createOrder = (supplierId: string, items: { productId: string; qty: number }[]) =>
  api.post<{ success: boolean; data: Order }>('/marketplace/orders', { supplierId, items }, true);

export const listOrders = () =>
  api.get<{ success: boolean; data: Order[] }>('/marketplace/orders', true);
