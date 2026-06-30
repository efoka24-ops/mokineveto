import { useEffect, useState } from 'react';
import { adminApi, CAMEROON_REGIONS } from '../lib/api';

type Tab = 'products' | 'suppliers' | 'orders';

export default function MarketplacePage() {
  const [tab, setTab] = useState<Tab>('products');

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Marketplace</h1>
      <div className="flex gap-2 mb-4">
        {(['products', 'suppliers', 'orders'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded ${tab === t ? 'bg-green-700 text-white' : 'bg-white'}`}
          >
            {t === 'products' ? 'Produits' : t === 'suppliers' ? 'Fournisseurs' : 'Commandes'}
          </button>
        ))}
      </div>

      {tab === 'suppliers' ? <SuppliersTab /> : null}
      {tab === 'products' ? <ProductsTab /> : null}
      {tab === 'orders' ? <OrdersTab /> : null}
    </div>
  );
}

function SuppliersTab() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', phone: '', region: '' });

  const load = async () => setSuppliers((await adminApi.getSuppliers()).data.data || []);
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await adminApi.createSupplier({ ...form, region: form.region || null });
    setForm({ name: '', phone: '', region: '' });
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm('Supprimer ce fournisseur ?')) return;
    await adminApi.deleteSupplier(id);
    await load();
  };

  return (
    <div>
      <form onSubmit={create} className="bg-white rounded-lg shadow p-4 mb-4 flex gap-2 flex-wrap items-end">
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Nom" className="border rounded px-3 py-2" />
        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Téléphone" className="border rounded px-3 py-2" />
        <select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className="border rounded px-3 py-2">
          <option value="">Région (optionnel)</option>
          {CAMEROON_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button className="bg-green-700 text-white px-4 py-2 rounded">+ Ajouter</button>
      </form>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="text-left p-3">Nom</th><th className="text-left p-3">Téléphone</th><th className="text-left p-3">Région</th><th className="text-right p-3">Actions</th></tr></thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-3 font-medium">{s.name}</td>
                <td className="p-3">{s.phone || '—'}</td>
                <td className="p-3">{s.region || '—'}</td>
                <td className="p-3 text-right"><button onClick={() => remove(s.id)} className="text-red-600 hover:underline">Supprimer</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductsTab() {
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [form, setForm] = useState({ supplierId: '', name: '', category: '', price: '', unit: '' });

  const load = async () => {
    setProducts((await adminApi.getProducts()).data.data || []);
    setSuppliers((await adminApi.getSuppliers()).data.data || []);
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await adminApi.createProduct({ ...form, price: Number(form.price) });
    setForm({ supplierId: '', name: '', category: '', price: '', unit: '' });
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm('Supprimer ce produit ?')) return;
    await adminApi.deleteProduct(id);
    await load();
  };

  return (
    <div>
      <form onSubmit={create} className="bg-white rounded-lg shadow p-4 mb-4 flex gap-2 flex-wrap items-end">
        <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} required className="border rounded px-3 py-2">
          <option value="">Fournisseur</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Nom" className="border rounded px-3 py-2" />
        <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required placeholder="Catégorie" className="border rounded px-3 py-2" />
        <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required type="number" placeholder="Prix (XAF)" className="border rounded px-3 py-2 w-32" />
        <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} required placeholder="Unité" className="border rounded px-3 py-2 w-28" />
        <button className="bg-green-700 text-white px-4 py-2 rounded">+ Ajouter</button>
      </form>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="text-left p-3">Produit</th><th className="text-left p-3">Catégorie</th><th className="text-right p-3">Prix</th><th className="text-left p-3">Unité</th><th className="text-right p-3">Actions</th></tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3">{p.category}</td>
                <td className="p-3 text-right">{p.price.toLocaleString('fr-FR')} XAF</td>
                <td className="p-3">{p.unit}</td>
                <td className="p-3 text-right"><button onClick={() => remove(p.id)} className="text-red-600 hover:underline">Supprimer</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OrdersTab() {
  const [orders, setOrders] = useState<any[]>([]);
  const load = async () => setOrders((await adminApi.getOrders()).data.data || []);
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: string) => {
    await adminApi.updateOrderStatus(id, status);
    await load();
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50"><tr><th className="text-left p-3">Client</th><th className="text-left p-3">Fournisseur</th><th className="text-right p-3">Montant</th><th className="text-left p-3">Statut</th><th className="text-right p-3">Action</th></tr></thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-t">
              <td className="p-3">{o.user?.name || '—'}</td>
              <td className="p-3">{o.supplier?.name || '—'}</td>
              <td className="p-3 text-right">{o.totalAmount.toLocaleString('fr-FR')} XAF</td>
              <td className="p-3">{o.status}</td>
              <td className="p-3 text-right">
                <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)} className="border rounded px-2 py-1">
                  {['PENDING', 'CONFIRMED', 'DELIVERED', 'CANCELLED'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
            </tr>
          ))}
          {orders.length === 0 ? <tr><td colSpan={5} className="p-6 text-center text-gray-400">Aucune commande.</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}
