import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '../lib/api';
import UserDetailDrawer from '../components/UserDetailDrawer';

interface UserRow {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  role: 'ELEVEUR' | 'VETERINAIRE' | 'ADMIN';
  country: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  statusReason: string | null;
  createdAt: string;
  detail: {
    farms?: number;
    animals?: number;
    specialty?: string;
    verification?: 'PENDING' | 'APPROVED' | 'REJECTED';
    availability?: 'DISPONIBLE' | 'OCCUPE' | 'ABSENT';
    ratingAvg?: number;
    ratingCount?: number;
  };
}

const VERIF_COLOR: Record<string, string> = { APPROVED: '#2E7D34', PENDING: '#9A6A16', REJECTED: '#A73B2E' };
const VERIF_LABEL: Record<string, string> = { APPROVED: 'Validé', PENDING: 'En attente', REJECTED: 'Refusé' };
const ROLE_LABEL: Record<string, string> = { ELEVEUR: 'Éleveur', VETERINAIRE: 'Vétérinaire', ADMIN: 'Admin' };
const STATUS_COLOR: Record<string, string> = { ACTIVE: '#2E7D34', SUSPENDED: '#9A6A16', BANNED: '#A73B2E' };
const STATUS_LABEL: Record<string, string> = { ACTIVE: 'Actif', SUSPENDED: 'Suspendu', BANNED: 'Banni' };

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [role, setRole] = useState<'' | 'ELEVEUR' | 'VETERINAIRE' | 'ADMIN'>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    adminApi.getUsers(role || undefined).then((res) => {
      setUsers(res.data.data || []);
      setLoading(false);
    });
  };

  useEffect(load, [role]);

  const suspend = async (u: UserRow) => {
    const reason = window.prompt(`Motif de la suspension de ${u.name} :`);
    if (!reason) return;
    const daysInput = window.prompt('Durée en jours (laisser vide = indéfinie) :', '7');
    const days = daysInput ? parseInt(daysInput, 10) : 0;
    setBusyId(u.id);
    try {
      await adminApi.moderateUser(u.id, { status: 'SUSPENDED', reason, days: Number.isFinite(days) ? days : 0 });
      load();
    } finally {
      setBusyId(null);
    }
  };

  const ban = async (u: UserRow) => {
    const reason = window.prompt(`Motif du bannissement définitif de ${u.name} :`);
    if (!reason) return;
    if (!window.confirm(`Confirmer le bannissement définitif de ${u.name} ?`)) return;
    setBusyId(u.id);
    try {
      await adminApi.moderateUser(u.id, { status: 'BANNED', reason });
      load();
    } finally {
      setBusyId(null);
    }
  };

  const reactivate = async (u: UserRow) => {
    setBusyId(u.id);
    try {
      await adminApi.moderateUser(u.id, { status: 'ACTIVE' });
      load();
    } finally {
      setBusyId(null);
    }
  };

  const mergeDuplicates = async () => {
    const primaryPhone = window.prompt('Téléphone du compte PRINCIPAL à conserver :');
    if (!primaryPhone) return;
    const duplicatePhone = window.prompt('Téléphone du compte DOUBLON à fusionner puis supprimer :');
    if (!duplicatePhone) return;

    const primary = users.find((u) => u.phone === primaryPhone.trim() && u.role === 'ELEVEUR');
    const duplicate = users.find((u) => u.phone === duplicatePhone.trim() && u.role === 'ELEVEUR');
    if (!primary || !duplicate) {
      window.alert("Un des deux numéros ne correspond à aucun compte éleveur visible dans la liste actuelle.");
      return;
    }
    if (!window.confirm(`Fusionner ${duplicate.name} (${duplicate.phone}) dans ${primary.name} (${primary.phone}) ? Le compte doublon sera supprimé après réattribution de son historique.`)) {
      return;
    }
    await adminApi.mergeUsers(primary.id, duplicate.id);
    load();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q === '') return users;
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.phone.includes(q) || (u.email ?? '').toLowerCase().includes(q)
    );
  }, [users, search]);

  const exportCsv = () => {
    const header = ['Nom', 'Téléphone', 'Email', 'Rôle', 'Pays', 'Statut', 'Inscrit le'];
    const lines = filtered.map((u) => [
      u.name,
      u.phone,
      u.email ?? '',
      ROLE_LABEL[u.role],
      u.country,
      STATUS_LABEL[u.status],
      new Date(u.createdAt).toLocaleDateString('fr-FR'),
    ]);
    const csv = [header, ...lines]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comptes-${role || 'tous'}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {(['', 'ELEVEUR', 'VETERINAIRE', 'ADMIN'] as const).map((r) => (
            <button
              key={r || 'all'}
              onClick={() => setRole(r)}
              className="px-4 py-2 rounded text-sm font-medium"
              style={
                role === r
                  ? { background: '#3DB54A', color: 'white' }
                  : { background: 'white', color: '#5B4F44', border: '1px solid #E3E3E8' }
              }
            >
              {r === '' ? 'Tous' : ROLE_LABEL[r]}
            </button>
          ))}
        </div>
        <span className="text-sm" style={{ color: '#8A8A8E' }}>{filtered.length} compte(s)</span>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom, téléphone ou e-mail…"
          className="flex-1 border rounded px-3 py-2 text-sm"
          style={{ borderColor: '#E3E3E8' }}
        />
        <button
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="px-4 py-2 rounded text-sm font-medium"
          style={{ background: 'white', color: '#5B4F44', border: '1px solid #E3E3E8' }}
        >
          Exporter CSV
        </button>
        <button
          onClick={mergeDuplicates}
          className="px-4 py-2 rounded text-sm font-medium"
          style={{ background: 'white', color: '#5B4F44', border: '1px solid #E3E3E8' }}
        >
          Fusionner deux comptes éleveur…
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead style={{ background: '#F6F5F2' }}>
            <tr>
              <th className="text-left p-3">Nom</th>
              <th className="text-left p-3">Contact</th>
              <th className="text-left p-3">Rôle</th>
              <th className="text-left p-3">Pays</th>
              <th className="text-left p-3">Détail</th>
              <th className="text-left p-3">Statut</th>
              <th className="text-left p-3">Inscrit le</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="p-6 text-center" style={{ color: '#8A8A8E' }}>Chargement…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="p-6 text-center" style={{ color: '#8A8A8E' }}>Aucun compte.</td></tr>
            ) : (
              filtered.map((u) => (
                <tr
                  key={u.id}
                  style={{ borderTop: '1px solid #E3E3E8', cursor: u.role === 'ELEVEUR' ? 'pointer' : 'default' }}
                  onClick={() => u.role === 'ELEVEUR' && setSelectedId(u.id)}
                >
                  <td className="p-3 font-medium">{u.name}</td>
                  <td className="p-3" style={{ color: '#8A8A8E' }}>{u.phone}{u.email ? ` · ${u.email}` : ''}</td>
                  <td className="p-3">{ROLE_LABEL[u.role]}</td>
                  <td className="p-3">{u.country}</td>
                  <td className="p-3">
                    {u.role === 'ELEVEUR' && (
                      <span style={{ color: '#8A8A8E' }}>{u.detail.farms ?? 0} exploitation(s) · {u.detail.animals ?? 0} animal(aux)</span>
                    )}
                    {u.role === 'VETERINAIRE' && u.detail.verification && (
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: `${VERIF_COLOR[u.detail.verification]}1a`, color: VERIF_COLOR[u.detail.verification] }}
                        >
                          {VERIF_LABEL[u.detail.verification]}
                        </span>
                        <span style={{ color: '#8A8A8E' }}>
                          {u.detail.specialty} · {(u.detail.ratingAvg ?? 0).toFixed(1)}★ ({u.detail.ratingCount ?? 0})
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: `${STATUS_COLOR[u.status]}1a`, color: STATUS_COLOR[u.status] }}
                      title={u.statusReason ?? undefined}
                    >
                      {STATUS_LABEL[u.status]}
                    </span>
                  </td>
                  <td className="p-3" style={{ color: '#8A8A8E' }}>
                    {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    {u.role === 'ADMIN' ? (
                      <span style={{ color: '#8A8A8E' }}>—</span>
                    ) : (
                      <div className="flex gap-2">
                        {u.status !== 'ACTIVE' ? (
                          <button
                            disabled={busyId === u.id}
                            onClick={() => reactivate(u)}
                            className="text-xs font-medium px-2 py-1 rounded"
                            style={{ color: '#2E7D34', border: '1px solid #2E7D3440' }}
                          >
                            Réactiver
                          </button>
                        ) : (
                          <button
                            disabled={busyId === u.id}
                            onClick={() => suspend(u)}
                            className="text-xs font-medium px-2 py-1 rounded"
                            style={{ color: '#9A6A16', border: '1px solid #9A6A1640' }}
                          >
                            Suspendre
                          </button>
                        )}
                        {u.status !== 'BANNED' && (
                          <button
                            disabled={busyId === u.id}
                            onClick={() => ban(u)}
                            className="text-xs font-medium px-2 py-1 rounded"
                            style={{ color: '#A73B2E', border: '1px solid #A73B2E40' }}
                          >
                            Bannir
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedId && <UserDetailDrawer userId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
