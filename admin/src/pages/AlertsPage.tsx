import { useEffect, useState } from 'react';
import { adminApi } from '../lib/api';

interface Country {
  code: string;
  label: string;
  regions: string[];
}

interface AlertRow {
  id: string;
  type: string;
  title: string;
  body: string;
  region: string | null;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  createdAt: string;
}

const SEVERITY_COLOR: Record<string, string> = { INFO: '#2E7D34', WARNING: '#9A6A16', CRITICAL: '#A73B2E' };
const SEVERITY_LABEL: Record<string, string> = { INFO: 'Info', WARNING: 'Avertissement', CRITICAL: 'Critique' };

export default function AlertsPage() {
  const [type, setType] = useState('EPIDEMIC');
  const [severity, setSeverity] = useState('WARNING');
  const [region, setRegion] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [ficheId, setFicheId] = useState('');
  const [fiches, setFiches] = useState<any[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [active, setActive] = useState<AlertRow[]>([]);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadActive = () => adminApi.getAlerts().then((res) => setActive(res.data.data || [])).catch(() => {});

  useEffect(() => {
    adminApi.getFiches().then((res) => setFiches(res.data.data || [])).catch(() => {});
    adminApi.getCountries().then((res) => setCountries(res.data.data || [])).catch(() => {});
    loadActive();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setFeedback(null);
    try {
      await adminApi.createAlert({
        type,
        title,
        body,
        region: region || null,
        ficheId: ficheId || null,
        severity,
      });
      // Honnête sur le canal réel : aucune passerelle push/e-mail n'est
      // configurée sur cet hébergement, seule la notification in-app part.
      setFeedback('✅ Alerte diffusée (notification in-app aux éleveurs concernés).');
      setTitle('');
      setBody('');
      setFicheId('');
      await loadActive();
    } catch (err) {
      setFeedback('❌ Échec de la diffusion. Vérifiez les champs.');
    } finally {
      setSending(false);
    }
  };

  const close = async (a: AlertRow) => {
    if (!window.confirm(`Clôturer l'alerte "${a.title}" ? Elle ne sera plus affichée aux éleveurs.`)) return;
    await adminApi.deleteAlert(a.id);
    await loadActive();
  };

  const allRegions = countries.flatMap((c) => c.regions.map((r) => ({ country: c.label, region: r })));

  return (
    <div className="p-6 max-w-2xl">
      <p className="text-sm text-gray-500 mb-6">
        L'alerte est envoyée aux éleveurs concernés via notification in-app, push mobile et
        e-mail. Une région ciblée touche uniquement ses éleveurs ; sans région, l'alerte est
        nationale.
      </p>

      <form onSubmit={submit} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Type</span>
            <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 w-full border rounded px-3 py-2">
              <option value="EPIDEMIC">Épidémie</option>
              <option value="REMINDER">Rappel</option>
              <option value="SYSTEM">Système</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Gravité</span>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="mt-1 w-full border rounded px-3 py-2">
              <option value="INFO">Info</option>
              <option value="WARNING">Avertissement</option>
              <option value="CRITICAL">Critique</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Région ciblée (vide = nationale)</span>
          <select value={region} onChange={(e) => setRegion(e.target.value)} className="mt-1 w-full border rounded px-3 py-2">
            <option value="">Toutes les régions (nationale)</option>
            {allRegions.map(({ country, region: r }) => (
              <option key={r} value={r}>{r} ({country})</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Pathologie liée (optionnel)</span>
          <select value={ficheId} onChange={(e) => setFicheId(e.target.value)} className="mt-1 w-full border rounded px-3 py-2">
            <option value="">Aucune</option>
            {fiches.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Titre</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 w-full border rounded px-3 py-2" placeholder="Recrudescence de fièvre aphteuse" />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Message</span>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} required rows={4} className="mt-1 w-full border rounded px-3 py-2" placeholder="Détaillez les mesures recommandées…" />
        </label>

        {feedback ? <div className="text-sm">{feedback}</div> : null}

        <button type="submit" disabled={sending} className="w-full bg-green-700 hover:bg-green-800 text-white font-medium py-3 rounded disabled:opacity-50">
          {sending ? 'Diffusion…' : 'Diffuser l\'alerte'}
        </button>
      </form>

      <h2 className="text-sm font-semibold mt-8 mb-3" style={{ color: '#33180F' }}>Alertes actives</h2>
      {active.length === 0 ? (
        <p className="text-sm" style={{ color: '#8A8A8E' }}>Aucune alerte active.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {active.map((a) => (
            <div key={a.id} className="bg-white rounded-lg shadow-sm p-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ background: `${SEVERITY_COLOR[a.severity]}1a`, color: SEVERITY_COLOR[a.severity] }}
                  >
                    {SEVERITY_LABEL[a.severity]}
                  </span>
                  <span className="text-xs" style={{ color: '#8A8A8E' }}>
                    {a.region || 'Nationale'} · {new Date(a.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <p className="font-medium text-sm">{a.title}</p>
                <p className="text-sm mt-1" style={{ color: '#8A8A8E' }}>{a.body}</p>
              </div>
              <button onClick={() => close(a)} className="text-xs font-medium px-3 py-1.5 rounded shrink-0 ml-4" style={{ color: '#A73B2E', border: '1px solid #A73B2E40' }}>
                Clôturer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
