import { useEffect, useState } from 'react';
import { adminApi } from '../lib/api';

interface TxRow {
  id: string;
  createdAt: string;
  purpose: 'APPOINTMENT' | 'FICHE_UNLOCK' | 'ORDER' | 'OTHER';
  method: 'ORANGE_MONEY' | 'MTN_MOMO' | 'CARD';
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  reference: string | null;
  phone: string | null;
  payerName: string;
  payerPhone: string;
  vetName: string | null;
  grossAmount: number;
  commission: number;
  netAmount: number;
  failureReason: string | null;
}

interface Totals {
  gmv: number;
  commission: number;
  pending: number;
  failed: number;
  succeeded: number;
}

const STATUS_LABEL: Record<string, string> = { PENDING: 'En attente', SUCCEEDED: 'Réussi', FAILED: 'Échoué' };
const STATUS_COLOR: Record<string, string> = { PENDING: '#9A6A16', SUCCEEDED: '#2E7D34', FAILED: '#A73B2E' };
const PURPOSE_LABEL: Record<string, string> = { APPOINTMENT: 'Consultation', FICHE_UNLOCK: 'Fiche', ORDER: 'Commande', OTHER: 'Autre' };
const METHOD_LABEL: Record<string, string> = { ORANGE_MONEY: 'Orange Money', MTN_MOMO: 'MTN MoMo', CARD: 'Carte' };

const fmt = (n: number) => n.toLocaleString('fr-FR') + ' FCFA';

/**
 * Journal des transactions Mobile Money (SFD-ADMIN §6.2). Basé sur la table
 * `Payment` réelle — pas de relance automatique ni de réconciliation
 * programmée : aucun cron persistant confirmé sur cet hébergement, la
 * réconciliation reste une opération manuelle exceptionnelle (voir Sungku).
 */
export default function MobileMoneyPage() {
  const [rows, setRows] = useState<TxRow[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');

  const load = () => {
    setLoading(true);
    adminApi.getMobileMoney({ status: status || undefined, method: method || undefined }).then((res) => {
      setRows(res.data.data.transactions || []);
      setTotals(res.data.data.totals || null);
      setLoading(false);
    });
  };

  useEffect(load, [status, method]);

  return (
    <div className="p-8">
      {totals && (
        <div className="grid grid-cols-5 gap-4 mb-6">
          <StatCard label="GMV (réussi)" value={fmt(totals.gmv)} color="#3DB54A" />
          <StatCard label="Commission perçue" value={fmt(totals.commission)} color="#33180F" />
          <StatCard label="Réussis" value={String(totals.succeeded)} color="#2E7D34" />
          <StatCard label="En attente" value={String(totals.pending)} color="#9A6A16" />
          <StatCard label="Échoués" value={String(totals.failed)} color="#A73B2E" />
        </div>
      )}

      <div className="flex gap-2 mb-6">
        {(['', 'PENDING', 'SUCCEEDED', 'FAILED'] as const).map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setStatus(s)}
            className="px-4 py-2 rounded text-sm font-medium"
            style={status === s ? { background: '#3DB54A', color: 'white' } : { background: 'white', color: '#5B4F44', border: '1px solid #E3E3E8' }}
          >
            {s === '' ? 'Tous statuts' : STATUS_LABEL[s]}
          </button>
        ))}
        <span className="w-px bg-gray-200 mx-1" />
        {(['', 'ORANGE_MONEY', 'MTN_MOMO'] as const).map((m) => (
          <button
            key={m || 'allm'}
            onClick={() => setMethod(m)}
            className="px-4 py-2 rounded text-sm font-medium"
            style={method === m ? { background: '#3DB54A', color: 'white' } : { background: 'white', color: '#5B4F44', border: '1px solid #E3E3E8' }}
          >
            {m === '' ? 'Tous opérateurs' : METHOD_LABEL[m]}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead style={{ background: '#F6F5F2' }}>
            <tr>
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Payeur</th>
              <th className="text-left p-3">Bénéficiaire</th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Opérateur</th>
              <th className="text-right p-3">Brut</th>
              <th className="text-right p-3">Commission</th>
              <th className="text-right p-3">Net</th>
              <th className="text-left p-3">Référence</th>
              <th className="text-left p-3">Statut</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="p-6 text-center" style={{ color: '#8A8A8E' }}>Chargement…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={10} className="p-6 text-center" style={{ color: '#8A8A8E' }}>Aucune transaction.</td></tr>
            ) : (
              rows.map((t) => (
                <tr key={t.id} style={{ borderTop: '1px solid #E3E3E8' }}>
                  <td className="p-3" style={{ color: '#8A8A8E' }}>{new Date(t.createdAt).toLocaleString('fr-FR')}</td>
                  <td className="p-3">
                    <div className="font-medium">{t.payerName}</div>
                    <div style={{ color: '#8A8A8E' }}>{t.phone || t.payerPhone}</div>
                  </td>
                  <td className="p-3" style={{ color: '#8A8A8E' }}>{t.vetName || '—'}</td>
                  <td className="p-3">{PURPOSE_LABEL[t.purpose]}</td>
                  <td className="p-3">{METHOD_LABEL[t.method]}</td>
                  <td className="p-3 text-right font-mono">{fmt(t.grossAmount)}</td>
                  <td className="p-3 text-right font-mono" style={{ color: '#8A8A8E' }}>{t.commission > 0 ? fmt(t.commission) : '—'}</td>
                  <td className="p-3 text-right font-mono font-medium">{fmt(t.netAmount)}</td>
                  <td className="p-3 font-mono text-xs" style={{ color: '#8A8A8E' }}>{t.reference}</td>
                  <td className="p-3">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: `${STATUS_COLOR[t.status]}1a`, color: STATUS_COLOR[t.status] }}
                      title={t.failureReason ?? undefined}
                    >
                      {STATUS_LABEL[t.status]}
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

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="text-xs" style={{ color: '#8A8A8E' }}>{label}</div>
      <div className="text-lg font-semibold mt-1" style={{ color: '#33180F' }}>{value}</div>
    </div>
  );
}
