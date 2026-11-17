import { useEffect, useState } from 'react';
import { adminApi } from '../lib/api';

interface DisputeRow {
  id: string;
  appointmentId: string;
  reason: string;
  description: string | null;
  status: 'OPEN' | 'RESOLVED_ELEVEUR' | 'RESOLVED_VET' | 'ESCALATED';
  openedByRole: 'ELEVEUR' | 'VETERINAIRE';
  resolutionNote: string | null;
  createdAt: string;
  eleveurName: string;
  eleveurPhone: string;
  vetName: string;
  startsAt: string;
  amount: number;
}

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Ouvert',
  RESOLVED_ELEVEUR: 'Résolu — en faveur de l\'éleveur',
  RESOLVED_VET: 'Résolu — en faveur du vétérinaire',
  ESCALATED: 'Escaladé',
};
const STATUS_COLOR: Record<string, string> = {
  OPEN: '#A73B2E',
  RESOLVED_ELEVEUR: '#2E7D34',
  RESOLVED_VET: '#2E7D34',
  ESCALATED: '#9A6A16',
};

/**
 * Gestion des litiges (SFD-ADMIN §5.2). Sans WebRTC ni enregistrement vidéo
 * (hébergement mutualisé sans process persistant), la résolution s'appuie sur
 * le rendez-vous, le motif déclaré et une note de décision de l'admin — pas
 * de relecture de session. Un remboursement décidé en faveur de l'éleveur
 * reste une action manuelle côté paiement, non automatisée ici.
 */
export default function DisputesPage() {
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    adminApi.getDisputes(statusFilter || undefined).then((res) => {
      setDisputes(res.data.data || []);
      setLoading(false);
    });
  };

  useEffect(load, [statusFilter]);

  const resolve = async (d: DisputeRow, status: 'RESOLVED_ELEVEUR' | 'RESOLVED_VET' | 'ESCALATED') => {
    const note = window.prompt('Note de résolution (obligatoire) :');
    if (!note) return;
    setBusyId(d.id);
    try {
      await adminApi.resolveDispute(d.id, { status, resolutionNote: note });
      load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {(['', 'OPEN', 'RESOLVED_ELEVEUR', 'RESOLVED_VET', 'ESCALATED'] as const).map((s) => (
            <button
              key={s || 'all'}
              onClick={() => setStatusFilter(s)}
              className="px-4 py-2 rounded text-sm font-medium"
              style={
                statusFilter === s
                  ? { background: '#3DB54A', color: 'white' }
                  : { background: 'white', color: '#5B4F44', border: '1px solid #E3E3E8' }
              }
            >
              {s === '' ? 'Tous' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <span className="text-sm" style={{ color: '#8A8A8E' }}>{disputes.length} litige(s)</span>
      </div>

      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="p-6 text-center text-sm" style={{ color: '#8A8A8E' }}>Chargement…</div>
        ) : disputes.length === 0 ? (
          <div className="p-6 text-center text-sm bg-white rounded-lg shadow-sm" style={{ color: '#8A8A8E' }}>
            Aucun litige.
          </div>
        ) : (
          disputes.map((d) => (
            <div key={d.id} className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: `${STATUS_COLOR[d.status]}1a`, color: STATUS_COLOR[d.status] }}
                    >
                      {STATUS_LABEL[d.status]}
                    </span>
                    <span className="text-xs" style={{ color: '#8A8A8E' }}>
                      Ouvert par {d.openedByRole === 'ELEVEUR' ? "l'éleveur" : 'le vétérinaire'} · {new Date(d.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <p className="font-medium">{d.reason}</p>
                  {d.description && <p className="text-sm mt-1" style={{ color: '#8A8A8E' }}>{d.description}</p>}
                  <p className="text-sm mt-2" style={{ color: '#5B4F44' }}>
                    RDV du {new Date(d.startsAt).toLocaleDateString('fr-FR')} · {d.eleveurName} ({d.eleveurPhone}) ↔ {d.vetName} · {d.amount} FCFA
                  </p>
                  {d.resolutionNote && (
                    <p className="text-sm mt-2 p-2 rounded" style={{ background: '#F6F5F2', color: '#5B4F44' }}>
                      Décision : {d.resolutionNote}
                    </p>
                  )}
                </div>
                {d.status === 'OPEN' && (
                  <div className="flex flex-col gap-2 shrink-0 ml-4">
                    <button
                      disabled={busyId === d.id}
                      onClick={() => resolve(d, 'RESOLVED_ELEVEUR')}
                      className="text-xs font-medium px-3 py-1.5 rounded"
                      style={{ color: '#2E7D34', border: '1px solid #2E7D3440' }}
                    >
                      En faveur de l'éleveur
                    </button>
                    <button
                      disabled={busyId === d.id}
                      onClick={() => resolve(d, 'RESOLVED_VET')}
                      className="text-xs font-medium px-3 py-1.5 rounded"
                      style={{ color: '#2E7D34', border: '1px solid #2E7D3440' }}
                    >
                      En faveur du vétérinaire
                    </button>
                    <button
                      disabled={busyId === d.id}
                      onClick={() => resolve(d, 'ESCALATED')}
                      className="text-xs font-medium px-3 py-1.5 rounded"
                      style={{ color: '#9A6A16', border: '1px solid #9A6A1640' }}
                    >
                      Escalader
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
