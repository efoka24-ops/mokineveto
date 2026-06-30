import { useEffect, useState } from 'react';
import { adminApi, CAMEROON_REGIONS } from '../lib/api';

export default function AlertsPage() {
  const [type, setType] = useState('EPIDEMIC');
  const [severity, setSeverity] = useState('WARNING');
  const [region, setRegion] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [ficheId, setFicheId] = useState('');
  const [fiches, setFiches] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    adminApi.getFiches().then((res) => setFiches(res.data.data || [])).catch(() => {});
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
      setFeedback('✅ Alerte diffusée avec succès (push + e-mail + in-app).');
      setTitle('');
      setBody('');
      setFicheId('');
    } catch (err) {
      setFeedback('❌ Échec de la diffusion. Vérifiez les champs.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Diffuser une alerte</h1>
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
            {CAMEROON_REGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
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
    </div>
  );
}
