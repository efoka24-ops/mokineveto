import { useEffect, useState } from 'react';
import { adminApi } from '../lib/api';

interface ReviewRow {
  id: string;
  stars: number;
  comment: string | null;
  hidden: boolean;
  createdAt: string;
  eleveurName: string;
  vetName: string;
}

/**
 * Modération des avis (SFD §4.14). Masquer, pas supprimer : un avis masqué
 * reste consultable ici en cas de litige, mais sort de la note publique du
 * praticien et de la liste vue par les éleveurs.
 */
export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => adminApi.getReviews().then((res) => { setReviews(res.data.data || []); setLoading(false); });

  useEffect(() => { load(); }, []);

  const toggle = async (r: ReviewRow) => {
    await adminApi.moderateReview(r.id, !r.hidden);
    await load();
  };

  return (
    <div className="p-8">
      <p className="text-sm mb-6" style={{ color: '#8A8A8E', maxWidth: '62ch' }}>
        Masquer un avis le retire de la note publique du vétérinaire et de l'affichage éleveur,
        sans le supprimer définitivement.
      </p>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead style={{ background: '#F6F5F2' }}>
            <tr>
              <th className="text-left p-3">Vétérinaire</th>
              <th className="text-left p-3">Éleveur</th>
              <th className="text-left p-3">Note</th>
              <th className="text-left p-3">Commentaire</th>
              <th className="text-left p-3">Date</th>
              <th className="text-right p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-6 text-center" style={{ color: '#8A8A8E' }}>Chargement…</td></tr>
            ) : reviews.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center" style={{ color: '#8A8A8E' }}>Aucun avis.</td></tr>
            ) : (
              reviews.map((r) => (
                <tr key={r.id} style={{ borderTop: '1px solid #E3E3E8', opacity: r.hidden ? 0.5 : 1 }}>
                  <td className="p-3 font-medium">{r.vetName}</td>
                  <td className="p-3">{r.eleveurName}</td>
                  <td className="p-3">{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</td>
                  <td className="p-3" style={{ color: '#8A8A8E' }}>{r.comment || '—'}</td>
                  <td className="p-3" style={{ color: '#8A8A8E' }}>{new Date(r.createdAt).toLocaleDateString('fr-FR')}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => toggle(r)}
                      className="text-xs font-medium hover:underline"
                      style={{ color: r.hidden ? '#2E7D34' : '#A73B2E' }}
                    >
                      {r.hidden ? 'Réafficher' : 'Masquer'}
                    </button>
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
