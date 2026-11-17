import { useEffect, useState } from 'react';
import { adminApi } from '../lib/api';

interface Appt {
  id: string;
  startsAt: string;
  status: 'UPCOMING' | 'COMPLETED' | 'CANCELLED';
  amount: number;
  reason: string;
  eleveurName: string;
  eleveurPhone: string;
  vetName: string;
  vetSpecialty: string;
}

const STATUS_LABEL: Record<string, string> = { UPCOMING: 'À venir', COMPLETED: 'Terminé', CANCELLED: 'Annulé' };
const STATUS_COLOR: Record<string, string> = { UPCOMING: '#2F6BFF', COMPLETED: '#2E7D34', CANCELLED: '#A73B2E' };

/** Vue transversale des rendez-vous, tous vétérinaires confondus (SFD §4.14). */
export default function AppointmentsPage() {
  const [rows, setRows] = useState<Appt[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminApi.getAllAppointments(status ? { status } : undefined).then((res) => {
      setRows(res.data.data || []);
      setLoading(false);
    });
  }, [status]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {(['', 'UPCOMING', 'COMPLETED', 'CANCELLED'] as const).map((s) => (
            <button
              key={s || 'all'}
              onClick={() => setStatus(s)}
              className="px-4 py-2 rounded text-sm font-medium"
              style={
                status === s
                  ? { background: '#3DB54A', color: 'white' }
                  : { background: 'white', color: '#5B4F44', border: '1px solid #E3E3E8' }
              }
            >
              {s === '' ? 'Tous' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <span className="text-sm" style={{ color: '#8A8A8E' }}>{rows.length} rendez-vous</span>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead style={{ background: '#F6F5F2' }}>
            <tr>
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Éleveur</th>
              <th className="text-left p-3">Vétérinaire</th>
              <th className="text-left p-3">Motif</th>
              <th className="text-right p-3">Montant</th>
              <th className="text-left p-3">Statut</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-6 text-center" style={{ color: '#8A8A8E' }}>Chargement…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center" style={{ color: '#8A8A8E' }}>Aucun rendez-vous.</td></tr>
            ) : (
              rows.map((a) => (
                <tr key={a.id} style={{ borderTop: '1px solid #E3E3E8' }}>
                  <td className="p-3">{new Date(a.startsAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td className="p-3">{a.eleveurName}<div className="text-xs" style={{ color: '#8A8A8E' }}>{a.eleveurPhone}</div></td>
                  <td className="p-3">{a.vetName}<div className="text-xs" style={{ color: '#8A8A8E' }}>{a.vetSpecialty}</div></td>
                  <td className="p-3" style={{ color: '#8A8A8E' }}>{a.reason}</td>
                  <td className="p-3 text-right">{a.amount.toLocaleString('fr-FR')} XAF</td>
                  <td className="p-3">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: `${STATUS_COLOR[a.status]}1a`, color: STATUS_COLOR[a.status] }}
                    >
                      {STATUS_LABEL[a.status]}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
