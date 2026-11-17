import { api } from './api';

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  region?: string;
  address?: string;
  schedule?: string;
  logoUrl?: string;
  active?: boolean;
}

export interface Product {
  id: string;
  supplierId: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  imageUrl?: string;
  active?: boolean;
  supplier?: Supplier;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName?: string;
  unit?: string;
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
  buyerName?: string;
  buyerPhone?: string;
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

// ─── Espace fournisseur (compte connecté, rôle FOURNISSEUR) ─────────────────

export const getMySupplierProfile = () =>
  api.get<{ success: boolean; data: Supplier }>('/marketplace/me/supplier', true);

export const updateMySupplierProfile = (data: Partial<Pick<Supplier, 'name' | 'address' | 'schedule' | 'logoUrl'>>) =>
  api.patch<{ success: boolean; data: Supplier }>('/marketplace/me/supplier', data, true);

export const listMyProducts = () =>
  api.get<{ success: boolean; data: Product[] }>('/marketplace/me/products', true);

export const createMyProduct = (data: { name: string; category: string; price: number; unit: string; imageUrl?: string }) =>
  api.post<{ success: boolean; data: Product }>('/marketplace/me/products', data, true);

export const updateMyProduct = (id: string, data: Partial<{ name: string; category: string; price: number; unit: string; imageUrl: string; active: boolean }>) =>
  api.patch<{ success: boolean; data: Product }>(`/marketplace/me/products/${id}`, data, true);

export const deleteMyProduct = (id: string) =>
  api.delete<{ success: boolean; data: { id: string; active: boolean } }>(`/marketplace/me/products/${id}`, true);

export const listMyReceivedOrders = () =>
  api.get<{ success: boolean; data: Order[] }>('/marketplace/me/orders', true);

export const updateOrderStatus = (id: string, status: Order['status']) =>
  api.patch<{ success: boolean; data: { id: string; status: string } }>(`/marketplace/orders/${id}`, { status }, true);
