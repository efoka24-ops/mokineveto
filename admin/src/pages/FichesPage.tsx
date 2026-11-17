import { useEffect, useState } from 'react';
import { adminApi } from '../lib/api';

interface FicheSummary {
  id: string;
  name: string;
  species: string[];
  contagious: boolean;
  description: string;
  status: 'ACTIVE' | 'ARCHIVED';
}

interface FicheDetail extends FicheSummary {
  fieldObs?: string;
  prevention?: string;
  vetInfo?: string;
  nameEn?: string | null;
  nameRw?: string | null;
  oieCode?: string | null;
  transmissionMode?: string | null;
  incubationPeriod?: string | null;
  mortalityRate?: string | null;
  vaccinesAvailable?: string | null;
  withdrawalPeriodDays?: number | null;
  sources?: string | null;
  version?: number;
}

interface VersionEntry {
  id: string;
  version: number;
  snapshot: Record<string, unknown>;
  editedByName: string | null;
  createdAt: string;
}

interface DuplicatePair {
  a: { id: string; name: string };
  b: { id: string; name: string };
  similarity: number;
}

const EMPTY = {
  name: '', nameEn: '', nameRw: '', oieCode: '',
  species: '', contagious: false, description: '',
  fieldObs: '', prevention: '', vetInfo: '',
  transmissionMode: '', incubationPeriod: '', mortalityRate: '',
  vaccinesAvailable: '', withdrawalPeriodDays: '', sources: '',
};

export default function FichesPage() {
  const [fiches, setFiches] = useState<FicheSummary[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [versionsFor, setVersionsFor] = useState<string | null>(null);
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicatePair[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ARCHIVED' | ''>('');

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

  const openEdit = async (id: string) => {
    const res = await adminApi.getFiche(id);
    const f: FicheDetail = res.data.data;
    setEditing(id);
    setForm({
      name: f.name,
      nameEn: f.nameEn || '',
      nameRw: f.nameRw || '',
      oieCode: f.oieCode || '',
      species: f.species.join(', '),
      contagious: f.contagious,
      description: f.description,
      fieldObs: f.fieldObs || '',
      prevention: f.prevention || '',
      vetInfo: f.vetInfo || '',
      transmissionMode: f.transmissionMode || '',
      incubationPeriod: f.incubationPeriod || '',
      mortalityRate: f.mortalityRate || '',
      vaccinesAvailable: f.vaccinesAvailable || '',
      withdrawalPeriodDays: f.withdrawalPeriodDays != null ? String(f.withdrawalPeriodDays) : '',
      sources: f.sources || '',
    });
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      species: form.species.split(',').map((s) => s.trim()).filter(Boolean),
      withdrawalPeriodDays: form.withdrawalPeriodDays ? Number(form.withdrawalPeriodDays) : undefined,
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
    if (!confirm('Supprimer définitivement cette fiche ?')) return;
    await adminApi.deleteFiche(id);
    await load();
  };

  const toggleArchive = async (f: FicheSummary) => {
    await adminApi.setFicheStatus(f.id, f.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE');
    await load();
  };

  const showVersions = async (id: string) => {
    const res = await adminApi.getFicheVersions(id);
    setVersions(res.data.data || []);
    setVersionsFor(id);
  };

  const exportCsv = async () => {
    const res = await adminApi.exportFiches();
    const rows: Record<string, unknown>[] = res.data.data || [];
    if (rows.length === 0) return;
    const header = Object.keys(rows[0]);
    const csv = [header, ...rows.map((r) => header.map((h) => String(r[h] ?? '')))]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `base-connaissances-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async () => {
    const text = window.prompt('Colle un tableau JSON de fiches (même structure que l\'export) :');
    if (!text) return;
    try {
      const rows = JSON.parse(text);
      if (!Array.isArray(rows)) throw new Error('not an array');
      const res = await adminApi.importFiches(rows);
      window.alert(`${res.data.data.imported} fiche(s) importée(s), ${res.data.data.skipped} ignorée(s).`);
      await load();
    } catch {
      window.alert('JSON invalide.');
    }
  };

  const findDuplicates = async () => {
    const res = await adminApi.getFicheDuplicates();
    setDuplicates(res.data.data || []);
  };

  const visibleFiches = statusFilter ? fiches.filter((f) => f.status === statusFilter) : fiches;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          {(['', 'ACTIVE', 'ARCHIVED'] as const).map((s) => (
            <button
              key={s || 'all'}
              onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 rounded text-sm font-medium"
              style={statusFilter === s ? { background: '#3DB54A', color: 'white' } : { background: 'white', color: '#5B4F44', border: '1px solid #E3E3E8' }}
            >
              {s === '' ? 'Toutes' : s === 'ACTIVE' ? 'Actives' : 'Archivées'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={findDuplicates} className="bg-white border px-3 py-2 rounded text-sm" style={{ borderColor: '#E3E3E8', color: '#5B4F44' }}>Détecter doublons</button>
          <button onClick={exportCsv} className="bg-white border px-3 py-2 rounded text-sm" style={{ borderColor: '#E3E3E8', color: '#5B4F44' }}>Exporter CSV</button>
          <button onClick={importJson} className="bg-white border px-3 py-2 rounded text-sm" style={{ borderColor: '#E3E3E8', color: '#5B4F44' }}>Importer JSON</button>
          <button onClick={openCreate} className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded text-sm">+ Nouvelle fiche</button>
        </div>
      </div>

      {duplicates && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm">Doublons potentiels (similarité lexicale sur le nom)</h3>
            <button onClick={() => setDuplicates(null)} className="text-xs" style={{ color: '#8A8A8E' }}>Fermer ✕</button>
          </div>
          {duplicates.length === 0 ? (
            <p className="text-sm" style={{ color: '#8A8A8E' }}>Aucun doublon détecté.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {duplicates.map((p, i) => (
                <div key={i} className="text-sm p-2 rounded" style={{ background: '#F6F5F2' }}>
                  <strong>{p.a.name}</strong> ↔ <strong>{p.b.name}</strong>
                  <span className="ml-2" style={{ color: '#9A6A16' }}>{Math.round(p.similarity * 100)}% de mots communs</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {versionsFor && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm">Historique des versions</h3>
            <button onClick={() => setVersionsFor(null)} className="text-xs" style={{ color: '#8A8A8E' }}>Fermer ✕</button>
          </div>
          {versions.length === 0 ? (
            <p className="text-sm" style={{ color: '#8A8A8E' }}>Aucune modification antérieure.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {versions.map((v) => (
                <div key={v.id} className="text-sm p-2 rounded" style={{ background: '#F6F5F2' }}>
                  Version {v.version} · {v.editedByName || 'système'} · {new Date(v.createdAt).toLocaleString('fr-FR')}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showForm ? (
        <form onSubmit={submit} className="bg-white rounded-lg shadow p-6 space-y-3 mb-6">
          <h2 className="font-bold">{editing ? 'Modifier' : 'Créer'} une fiche</h2>
          <div className="grid grid-cols-3 gap-3">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Nom (FR)" className="border rounded px-3 py-2" />
            <input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} placeholder="Nom (EN)" className="border rounded px-3 py-2" />
            <input value={form.nameRw} onChange={(e) => setForm({ ...form, nameRw: e.target.value })} placeholder="Nom (Kinyarwanda)" className="border rounded px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input value={form.oieCode} onChange={(e) => setForm({ ...form, oieCode: e.target.value })} placeholder="Code OIE" className="border rounded px-3 py-2" />
            <input value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value })} placeholder="Espèces (séparées par virgule)" className="border rounded px-3 py-2" />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.contagious} onChange={(e) => setForm({ ...form, contagious: e.target.checked })} />
            <span className="text-sm">Contagieux</span>
          </label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required placeholder="Description" rows={2} className="w-full border rounded px-3 py-2" />
          <textarea value={form.fieldObs} onChange={(e) => setForm({ ...form, fieldObs: e.target.value })} placeholder="Observations terrain" rows={2} className="w-full border rounded px-3 py-2" />
          <textarea value={form.prevention} onChange={(e) => setForm({ ...form, prevention: e.target.value })} placeholder="Prévention" rows={2} className="w-full border rounded px-3 py-2" />
          <textarea value={form.vetInfo} onChange={(e) => setForm({ ...form, vetInfo: e.target.value })} placeholder="Information vétérinaire" rows={2} className="w-full border rounded px-3 py-2" />

          <div className="grid grid-cols-2 gap-3">
            <input value={form.transmissionMode} onChange={(e) => setForm({ ...form, transmissionMode: e.target.value })} placeholder="Mode de transmission" className="border rounded px-3 py-2" />
            <input value={form.incubationPeriod} onChange={(e) => setForm({ ...form, incubationPeriod: e.target.value })} placeholder="Période d'incubation" className="border rounded px-3 py-2" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <input value={form.mortalityRate} onChange={(e) => setForm({ ...form, mortalityRate: e.target.value })} placeholder="Taux de mortalité estimé" className="border rounded px-3 py-2" />
            <input value={form.vaccinesAvailable} onChange={(e) => setForm({ ...form, vaccinesAvailable: e.target.value })} placeholder="Vaccins disponibles" className="border rounded px-3 py-2" />
            <input type="number" value={form.withdrawalPeriodDays} onChange={(e) => setForm({ ...form, withdrawalPeriodDays: e.target.value })} placeholder="Délai d'attente abattage (jours)" className="border rounded px-3 py-2" />
          </div>
          <textarea value={form.sources} onChange={(e) => setForm({ ...form, sources: e.target.value })} placeholder="Sources scientifiques (DOI, liens FAO/OIE — une par ligne)" rows={2} className="w-full border rounded px-3 py-2" />

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
              <th className="text-left p-3">Statut</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleFiches.map((f) => (
              <tr key={f.id} className="border-t" style={{ opacity: f.status === 'ARCHIVED' ? 0.55 : 1 }}>
                <td className="p-3 font-medium">{f.name}</td>
                <td className="p-3 text-gray-600">{f.species.join(', ')}</td>
                <td className="p-3">{f.contagious ? '⚠️ Oui' : 'Non'}</td>
                <td className="p-3">{f.status === 'ACTIVE' ? 'Active' : 'Archivée'}</td>
                <td className="p-3 text-right space-x-3">
                  <button onClick={() => openEdit(f.id)} className="text-blue-600 hover:underline">Modifier</button>
                  <button onClick={() => showVersions(f.id)} className="text-gray-600 hover:underline">Historique</button>
                  <button onClick={() => toggleArchive(f)} className="text-amber-700 hover:underline">
                    {f.status === 'ACTIVE' ? 'Archiver' : 'Désarchiver'}
                  </button>
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
