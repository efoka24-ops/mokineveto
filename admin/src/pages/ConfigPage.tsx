import { useEffect, useState } from 'react';
import { adminApi } from '../lib/api';

interface ConfigRow {
  key: string;
  value: string;
  updatedAt: string;
}

interface AdminRow {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  adminRole: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
}

const CONFIG_LABEL: Record<string, string> = {
  commissionRate: 'Commission plateforme (%)',
  tarifMinFcfa: 'Tarif minimum consultation (FCFA)',
  tarifMaxFcfa: 'Tarif maximum consultation (FCFA)',
  slaVetResponseMinutes: "Délai d'alerte avant vétérinaire (minutes)",
  slaDisputeHours: 'Délai de traitement d\'un litige avant escalade (heures)',
  slaVetValidationHours: 'Délai de validation d\'un vétérinaire avant rappel (heures ouvrées)',
  priceCallFcfa: 'Tarif consultation par appel (FCFA)',
  priceVideoFcfa: 'Tarif consultation vidéo (FCFA)',
  pricePerKmFcfa: 'Tarif consultation terrain — par km parcouru (FCFA)',
};

const ADMIN_ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super administrateur',
  operations: 'Opérations',
  finance: 'Finance',
  ia: 'IA / Chatbot',
  tech: 'Technique',
  auditor: 'Auditeur (lecture seule)',
};

/**
 * Configuration de plateforme (SFD-ADMIN §15) + gestion des administrateurs
 * délégués (SFD-ADMIN §3.5). Regroupés ici : les deux sont réservés au rôle
 * super_admin côté API.
 */
export default function ConfigPage() {
  const [config, setConfig] = useState<ConfigRow[]>([]);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showNewAdmin, setShowNewAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name: '', phone: '', email: '', password: '', adminRole: 'operations' });
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([adminApi.getConfig(), adminApi.getAdmins()]).then(([c, a]) => {
      setConfig(c.data.data || []);
      setAdmins(a.data.data || []);
      setLoading(false);
    });
  };

  useEffect(load, []);

  const saveConfig = async (key: string) => {
    await adminApi.updateConfig(key, editValue);
    setEditingKey(null);
    load();
  };

  const createAdmin = async () => {
    setError('');
    try {
      await adminApi.createAdmin(newAdmin);
      setShowNewAdmin(false);
      setNewAdmin({ name: '', phone: '', email: '', password: '', adminRole: 'operations' });
      load();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || "Échec de la création.");
    }
  };

  const toggleAdminStatus = async (a: AdminRow) => {
    await adminApi.setAdminStatus(a.id, a.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE');
    load();
  };

  if (loading) {
    return <div className="p-8 text-sm" style={{ color: '#8A8A8E' }}>Chargement…</div>;
  }

  return (
    <div className="p-8 flex flex-col gap-8">
      <section>
        <h2 className="text-lg font-semibold mb-1" style={{ color: '#33180F' }}>Configuration de la plateforme</h2>
        <p className="text-sm mb-4" style={{ color: '#8A8A8E' }}>
          Modifiable sans redéploiement. Toute modification est journalisée dans le journal d'audit.
        </p>
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {config.map((c) => (
                <tr key={c.key} style={{ borderTop: '1px solid #E3E3E8' }}>
                  <td className="p-3">{CONFIG_LABEL[c.key] ?? c.key}</td>
                  <td className="p-3 w-40">
                    {editingKey === c.key ? (
                      <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveConfig(c.key)}
                        className="w-full border rounded px-2 py-1 text-sm"
                        style={{ borderColor: '#E3E3E8' }}
                      />
                    ) : (
                      <span className="font-mono">{c.value}</span>
                    )}
                  </td>
                  <td className="p-3 text-right w-24">
                    {editingKey === c.key ? (
                      <button onClick={() => saveConfig(c.key)} className="text-xs font-medium" style={{ color: '#2E7D34' }}>
                        Enregistrer
                      </button>
                    ) : (
                      <button
                        onClick={() => { setEditingKey(c.key); setEditValue(c.value); }}
                        className="text-xs font-medium hover:underline"
                        style={{ color: '#3DB54A' }}
                      >
                        Modifier
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: '#33180F' }}>Administrateurs délégués</h2>
            <p className="text-sm" style={{ color: '#8A8A8E' }}>Comptes à accès restreint par module (super_admin uniquement).</p>
          </div>
          <button
            onClick={() => setShowNewAdmin((v) => !v)}
            className="px-4 py-2 rounded text-sm font-medium"
            style={{ background: '#3DB54A', color: 'white' }}
          >
            + Nouvel administrateur
          </button>
        </div>

        {showNewAdmin && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4 flex flex-col gap-3">
            {error && <p className="text-sm" style={{ color: '#A73B2E' }}>{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Nom" value={newAdmin.name} onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })} className="border rounded px-3 py-2 text-sm" style={{ borderColor: '#E3E3E8' }} />
              <input placeholder="Téléphone" value={newAdmin.phone} onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value })} className="border rounded px-3 py-2 text-sm" style={{ borderColor: '#E3E3E8' }} />
              <input placeholder="Email (optionnel)" value={newAdmin.email} onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })} className="border rounded px-3 py-2 text-sm" style={{ borderColor: '#E3E3E8' }} />
              <input type="password" placeholder="Mot de passe (min. 8 caractères)" value={newAdmin.password} onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })} className="border rounded px-3 py-2 text-sm" style={{ borderColor: '#E3E3E8' }} />
              <select value={newAdmin.adminRole} onChange={(e) => setNewAdmin({ ...newAdmin, adminRole: e.target.value })} className="border rounded px-3 py-2 text-sm col-span-2" style={{ borderColor: '#E3E3E8' }}>
                {Object.entries(ADMIN_ROLE_LABEL).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={createAdmin} className="px-4 py-2 rounded text-sm font-medium" style={{ background: '#3DB54A', color: 'white' }}>
                Créer
              </button>
              <button onClick={() => setShowNewAdmin(false)} className="px-4 py-2 rounded text-sm font-medium" style={{ background: 'white', color: '#5B4F44', border: '1px solid #E3E3E8' }}>
                Annuler
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead style={{ background: '#F6F5F2' }}>
              <tr>
                <th className="text-left p-3">Nom</th>
                <th className="text-left p-3">Contact</th>
                <th className="text-left p-3">Rôle</th>
                <th className="text-left p-3">Statut</th>
                <th className="text-right p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {admins.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center" style={{ color: '#8A8A8E' }}>Aucun administrateur délégué.</td></tr>
              ) : (
                admins.map((a) => (
                  <tr key={a.id} style={{ borderTop: '1px solid #E3E3E8' }}>
                    <td className="p-3 font-medium">{a.name}</td>
                    <td className="p-3" style={{ color: '#8A8A8E' }}>{a.phone}{a.email ? ` · ${a.email}` : ''}</td>
                    <td className="p-3">{ADMIN_ROLE_LABEL[a.adminRole] ?? a.adminRole}</td>
                    <td className="p-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ background: a.status === 'ACTIVE' ? '#2E7D341a' : '#A73B2E1a', color: a.status === 'ACTIVE' ? '#2E7D34' : '#A73B2E' }}
                      >
                        {a.status === 'ACTIVE' ? 'Actif' : 'Désactivé'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button onClick={() => toggleAdminStatus(a)} className="text-xs font-medium hover:underline" style={{ color: a.status === 'ACTIVE' ? '#A73B2E' : '#2E7D34' }}>
                        {a.status === 'ACTIVE' ? 'Désactiver' : 'Réactiver'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
