import { useEffect, useState } from 'react';
import { adminApi } from '../lib/api';

interface Animal {
  id: string;
  name: string;
  species: string;
  breed: string;
  sex: string;
  age: string;
  createdAt: string;
}

interface Consultation {
  id: string;
  startsAt: string;
  status: 'UPCOMING' | 'COMPLETED' | 'CANCELLED';
  amount: number;
  reason: string;
  vetName: string;
}

interface Detail {
  user: { id: string; name: string; phone: string; email: string | null; country: string; createdAt: string };
  animals: Animal[];
  consultations: Consultation[];
  stats: { animalsCount: number; consultationsCount: number; totalPaid: number; reviewsGiven: number };
}

const STATUS_LABEL: Record<string, string> = { UPCOMING: 'À venir', COMPLETED: 'Terminée', CANCELLED: 'Annulée' };
const STATUS_COLOR: Record<string, string> = { UPCOMING: '#9A6A16', COMPLETED: '#2E7D34', CANCELLED: '#A73B2E' };

/** Fiche éleveur détaillée (SFD-ADMIN §3.1.2) — panneau latéral au clic sur une ligne. */
export default function UserDetailDrawer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi.getUserDetail(userId).then((res) => {
      setDetail(res.data.data);
      setLoading(false);
    });
  };

  useEffect(load, [userId]);

  const resetPassword = async () => {
    setBusy(true);
    try {
      const res = await adminApi.resetUserPassword(userId);
      window.alert(`Mot de passe temporaire : ${res.data.data.temporaryPassword}\n\nAucune passerelle SMS n'est configurée — transmettez-le manuellement à l'éleveur.`);
    } finally {
      setBusy(false);
    }
  };

  const editProfile = async () => {
    if (!detail) return;
    const name = window.prompt('Nouveau nom :', detail.user.name);
    if (!name || name === detail.user.name) return;
    const justification = window.prompt('Justification de la modification (obligatoire) :');
    if (!justification) return;
    setBusy(true);
    try {
      await adminApi.editUserProfile(userId, { name, justification });
      load();
    } finally {
      setBusy(false);
    }
  };

  const contact = async () => {
    const message = window.prompt('Message à envoyer (notification in-app) :');
    if (!message) return;
    setBusy(true);
    try {
      await adminApi.notifyUser(userId, message);
      window.alert('Notification envoyée.');
    } finally {
      setBusy(false);
    }
  };

  const anonymize = async () => {
    const justification = window.prompt("Justification (demande écrite du titulaire, obligatoire) :");
    if (!justification) return;
    if (!window.confirm('Anonymiser et bannir définitivement ce compte ? Action irréversible.')) return;
    setBusy(true);
    try {
      await adminApi.anonymizeUser(userId, justification);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={onClose}>
      <div className="w-full max-w-md bg-white h-full overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold" style={{ color: '#33180F' }}>Fiche éleveur</h2>
          <button onClick={onClose} className="text-sm" style={{ color: '#8A8A8E' }}>Fermer ✕</button>
        </div>

        {loading || !detail ? (
          <p className="text-sm" style={{ color: '#8A8A8E' }}>Chargement…</p>
        ) : (
          <>
            <div className="mb-6">
              <div className="font-semibold text-base">{detail.user.name}</div>
              <div className="text-sm" style={{ color: '#8A8A8E' }}>
                {detail.user.phone}{detail.user.email ? ` · ${detail.user.email}` : ''}
              </div>
              <div className="text-sm" style={{ color: '#8A8A8E' }}>
                {detail.user.country} · inscrit le {new Date(detail.user.createdAt).toLocaleDateString('fr-FR')}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              <ActionButton label="Réinitialiser mot de passe" onClick={resetPassword} disabled={busy} />
              <ActionButton label="Modifier le profil" onClick={editProfile} disabled={busy} />
              <ActionButton label="Contacter" onClick={contact} disabled={busy} />
              <ActionButton label="Anonymiser (RGPD)" onClick={anonymize} disabled={busy} color="#A73B2E" />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <StatBox label="Animaux" value={String(detail.stats.animalsCount)} />
              <StatBox label="Consultations" value={String(detail.stats.consultationsCount)} />
              <StatBox label="Total payé" value={detail.stats.totalPaid.toLocaleString('fr-FR') + ' FCFA'} />
              <StatBox label="Avis laissés" value={String(detail.stats.reviewsGiven)} />
            </div>

            <h3 className="text-sm font-semibold mb-2" style={{ color: '#33180F' }}>Historique des consultations</h3>
            {detail.consultations.length === 0 ? (
              <p className="text-sm mb-6" style={{ color: '#8A8A8E' }}>Aucune consultation.</p>
            ) : (
              <div className="flex flex-col gap-2 mb-6">
                {detail.consultations.map((c) => (
                  <div key={c.id} className="p-3 rounded" style={{ background: '#F6F5F2' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{c.vetName}</span>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ background: `${STATUS_COLOR[c.status]}1a`, color: STATUS_COLOR[c.status] }}
                      >
                        {STATUS_LABEL[c.status]}
                      </span>
                    </div>
                    <div className="text-xs mt-1" style={{ color: '#8A8A8E' }}>
                      {new Date(c.startsAt).toLocaleDateString('fr-FR')} · {c.reason} · {c.amount.toLocaleString('fr-FR')} FCFA
                    </div>
                  </div>
                ))}
              </div>
            )}

            <h3 className="text-sm font-semibold mb-2" style={{ color: '#33180F' }}>Animaux enregistrés</h3>
            {detail.animals.length === 0 ? (
              <p className="text-sm" style={{ color: '#8A8A8E' }}>Aucun animal.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {detail.animals.map((a) => (
                  <div key={a.id} className="p-3 rounded flex items-center justify-between" style={{ background: '#F6F5F2' }}>
                    <span className="text-sm font-medium">{a.name}</span>
                    <span className="text-xs" style={{ color: '#8A8A8E' }}>{a.species} · {a.breed} · {a.sex}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  color = '#3DB54A',
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="text-xs font-medium px-3 py-1.5 rounded"
      style={{ color, border: `1px solid ${color}40` }}
    >
      {label}
    </button>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded" style={{ background: '#F6F5F2' }}>
      <div className="text-xs" style={{ color: '#8A8A8E' }}>{label}</div>
      <div className="text-base font-semibold" style={{ color: '#33180F' }}>{value}</div>
    </div>
  );
}
