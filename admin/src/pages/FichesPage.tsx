import { useEffect, useState } from 'react';
import { adminApi } from '../lib/api';

interface Fiche {
  id: string;
  name: string;
  species: string[];
  contagious: boolean;
  description: string;
  fieldObs?: string;
  prevention?: string;
  vetInfo?: string;
}

const EMPTY = {
  name: '',
  species: '',
  contagious: false,
  description: '',
  fieldObs: '',
  prevention: '',
  vetInfo: '',
};

export default function FichesPage() {
  const [fiches, setFiches] = useState<Fiche[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    const res = await adminApi.getFiches();
    setFiches(res.data.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setShowForm(true);
  };

  const openEdit = (f: Fiche) => {
    setEditing(f.id);
    setForm({
      name: f.name,
      species: f.species.join(', '),
      contagious: f.contagious,
      description: f.description,
      fieldObs: f.fieldObs || '',
      prevention: f.prevention || '',
      vetInfo: f.vetInfo || '',
    });
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      species: form.species.split(',').map((s) => s.trim()).filter(Boolean),
    };
    if (editing) {
      await adminApi.updateFiche(editing, payload);
    } else {
      await adminApi.createFiche(payload);
    }
    setShowForm(false);
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm('Supprimer cette fiche ?')) return;
    await adminApi.deleteFiche(id);
    await load();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Fiches techniques ({fiches.length})</h1>
        <button onClick={openCreate} className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded">
          + Nouvelle fiche
        </button>
      </div>

      {showForm ? (
        <form onSubmit={submit} className="bg-white rounded-lg shadow p-6 space-y-3 mb-6">
          <h2 className="font-bold">{editing ? 'Modifier' : 'Créer'} une fiche</h2>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Nom de la pathologie" className="w-full border rounded px-3 py-2" />
          <input value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value })} placeholder="Espèces (séparées par virgule)" className="w-full border rounded px-3 py-2" />
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.contagious} onChange={(e) => setForm({ ...form, contagious: e.target.checked })} />
            <span className="text-sm">Contagieux</span>
          </label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required placeholder="Description" rows={2} className="w-full border rounded px-3 py-2" />
          <textarea value={form.fieldObs} onChange={(e) => setForm({ ...form, fieldObs: e.target.value })} placeholder="Observations terrain" rows={2} className="w-full border rounded px-3 py-2" />
          <textarea value={form.prevention} onChange={(e) => setForm({ ...form, prevention: e.target.value })} placeholder="Prévention" rows={2} className="w-full border rounded px-3 py-2" />
          <textarea value={form.vetInfo} onChange={(e) => setForm({ ...form, vetInfo: e.target.value })} placeholder="Information vétérinaire" rows={2} className="w-full border rounded px-3 py-2" />
          <div className="flex gap-2">
            <button type="submit" className="bg-green-700 text-white px-4 py-2 rounded">Enregistrer</button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 px-4 py-2 rounded">Annuler</button>
          </div>
        </form>
      ) : null}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Nom</th>
              <th className="text-left p-3">Espèces</th>
              <th className="text-left p-3">Contagieux</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {fiches.map((f) => (
              <tr key={f.id} className="border-t">
                <td className="p-3 font-medium">{f.name}</td>
                <td className="p-3 text-gray-600">{f.species.join(', ')}</td>
                <td className="p-3">{f.contagious ? '⚠️ Oui' : 'Non'}</td>
                <td className="p-3 text-right">
                  <button onClick={() => openEdit(f)} className="text-blue-600 hover:underline mr-3">Modifier</button>
                  <button onClick={() => remove(f.id)} className="text-red-600 hover:underline">Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
