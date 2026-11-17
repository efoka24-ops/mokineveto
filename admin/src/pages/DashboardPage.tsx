import { useEffect, useState } from 'react';
import { adminApi } from '../lib/api';

interface Stats {
  users: { total: number; eleveurs: number; veterinaires: number };
  vets: { pending: number; approved: number; rejected: number };
  animals: number;
  appointments: { total: number; upcoming: number; completed: number };
  revenue: { collected: number; commission: number };
  revenueByVet: { vetName: string; gross: number; paidConsultations: number }[];
  topPathologies: { name: string; n: number }[];
}

/** Widget statistique CoreUI : barre de couleur à gauche, libellé, grand chiffre. */
function StatCard({ label, value, accent }: { label: string; value: number | undefined; accent: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm flex overflow-hidden">
      <div className="w-1.5 shrink-0" style={{ background: accent }} />
      <div className="p-5">
        <div className="text-[13px] font-medium" style={{ color: '#8A8A8E' }}>{label}</div>
        <div className="text-2xl font-bold mt-1" style={{ color: '#1C1C1E' }}>{value ?? '—'}</div>
      </div>
    </div>
  );
}

function Panel({ title, rows }: { title: string; rows: { label: string; value: string }[] }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-[15px] font-bold mb-3" style={{ color: '#1C1C1E' }}>{title}</h2>
      {rows.map((row, i) => (
        <div
          key={row.label}
          className="flex justify-between py-2.5 text-sm"
          style={i > 0 ? { borderTop: '1px solid #E3E3E8' } : undefined}
        >
          <span style={{ color: '#8A8A8E' }}>{row.label}</span>
          <span className="font-semibold" style={{ color: '#1C1C1E' }}>{row.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getStats().then((res) => setStats(res.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8" style={{ color: '#8A8A8E' }}>Chargement…</div>;

  return (
    <div className="p-8">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard label="Utilisateurs" value={stats?.users.total} accent="#3DB54A" />
        <StatCard label="Vétérinaires" value={stats?.users.veterinaires} accent="#2F6BFF" />
        <StatCard label="Vétérinaires en attente" value={stats?.vets.pending} accent="#E2A93B" />
        <StatCard label="Rendez-vous" value={stats?.appointments.total} accent="#4A2317" />
        <StatCard label="Animaux enregistrés" value={stats?.animals} accent="#E23D3D" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel
          title="Rendez-vous"
          rows={[
            { label: 'À venir', value: String(stats?.appointments.upcoming ?? 0) },
            { label: 'Terminés', value: String(stats?.appointments.completed ?? 0) },
          ]}
        />
        <Panel
          title="Revenus (FCFA)"
          rows={[
            { label: 'Encaissé', value: (stats?.revenue.collected ?? 0).toLocaleString('fr-FR') },
            { label: 'Commission (15%)', value: (stats?.revenue.commission ?? 0).toLocaleString('fr-FR') },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-[15px] font-bold mb-3" style={{ color: '#1C1C1E' }}>CA par vétérinaire</h2>
          {(stats?.revenueByVet ?? []).length === 0 ? (
            <p className="text-sm" style={{ color: '#8A8A8E' }}>Aucun encaissement pour l'instant.</p>
          ) : (
            stats!.revenueByVet.map((v, i) => (
              <div
                key={v.vetName + i}
                className="flex justify-between py-2.5 text-sm"
                style={i > 0 ? { borderTop: '1px solid #E3E3E8' } : undefined}
              >
                <span style={{ color: '#1C1C1E' }}>{v.vetName} <span style={{ color: '#8A8A8E' }}>({v.paidConsultations})</span></span>
                <span className="font-semibold">{v.gross.toLocaleString('fr-FR')} FCFA</span>
              </div>
            ))
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-[15px] font-bold mb-3" style={{ color: '#1C1C1E' }}>Maladies les plus diagnostiquées</h2>
          {(stats?.topPathologies ?? []).length === 0 ? (
            <p className="text-sm" style={{ color: '#8A8A8E' }}>Aucun signalement pour l'instant.</p>
          ) : (
            stats!.topPathologies.map((p, i) => (
              <div
                key={p.name + i}
                className="flex justify-between py-2.5 text-sm"
                style={i > 0 ? { borderTop: '1px solid #E3E3E8' } : undefined}
              >
                <span style={{ color: '#1C1C1E' }}>{p.name}</span>
                <span className="font-semibold">{p.n}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
