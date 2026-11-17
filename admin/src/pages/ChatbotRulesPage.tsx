import { useEffect, useState } from 'react';
import { adminApi } from '../lib/api';

interface Rule {
  id: string;
  conditionName: string;
  keywordsA: string[];
  keywordsB: string[] | null;
  severe: boolean;
  active: boolean;
}

const EMPTY = { conditionName: '', keywordsA: '', keywordsB: '', severe: false };

function toList(csv: string): string[] {
  return csv.split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * Base de règles du moteur de pré-analyse (SFD §4.14 — « gestion du chatbot
 * IA »). Il n'y a pas de modèle à ré-entraîner : ce qui en tient lieu,
 * honnêtement, c'est ajouter ou corriger une corrélation symptômes →
 * pathologie ici, sans toucher au code PHP. Voir php-api/routes/ai.php.
 */
export default function ChatbotRulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    const res = await adminApi.getChatbotRules();
    setRules(res.data.data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await adminApi.createChatbotRule({
        conditionName: form.conditionName,
        keywordsA: toList(form.keywordsA),
        keywordsB: toList(form.keywordsB),
        severe: form.severe,
      });
      setForm(EMPTY);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Échec de la création.');
    }
  };

  const toggleActive = async (rule: Rule) => {
    await adminApi.updateChatbotRule(rule.id, { active: !rule.active });
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm('Supprimer cette règle ?')) return;
    await adminApi.deleteChatbotRule(id);
    await load();
  };

  if (loading) return <div className="p-8" style={{ color: '#8A8A8E' }}>Chargement…</div>;

  return (
    <div className="p-8">
      <p className="text-sm mb-6" style={{ color: '#8A8A8E', maxWidth: '62ch' }}>
        Chaque règle déclenche une pathologie suspectée quand le texte de l'éleveur contient un mot
        du groupe A — et, si renseigné, un mot du groupe B aussi. « Sévère » force le niveau
        d'urgence à Élevé dès que la règle correspond.
      </p>

      <form onSubmit={create} className="bg-white rounded-lg shadow-sm p-5 mb-6 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={form.conditionName}
            onChange={(e) => setForm({ ...form, conditionName: e.target.value })}
            required
            placeholder="Nom de la pathologie"
            className="border rounded px-3 py-2 text-sm"
            style={{ borderColor: '#E3E3E8' }}
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.severe} onChange={(e) => setForm({ ...form, severe: e.target.checked })} />
            Sévère (force l'urgence à Élevé)
          </label>
          <input
            value={form.keywordsA}
            onChange={(e) => setForm({ ...form, keywordsA: e.target.value })}
            required
            placeholder="Groupe A — mots-clés séparés par des virgules"
            className="border rounded px-3 py-2 text-sm md:col-span-2"
            style={{ borderColor: '#E3E3E8' }}
          />
          <input
            value={form.keywordsB}
            onChange={(e) => setForm({ ...form, keywordsB: e.target.value })}
            placeholder="Groupe B (optionnel) — mots-clés séparés par des virgules"
            className="border rounded px-3 py-2 text-sm md:col-span-2"
            style={{ borderColor: '#E3E3E8' }}
          />
        </div>
        {error && <div className="text-sm" style={{ color: '#A73B2E' }}>{error}</div>}
        <button type="submit" className="px-4 py-2 rounded text-white text-sm font-medium" style={{ background: '#3DB54A' }}>
          + Ajouter la règle
        </button>
      </form>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead style={{ background: '#F6F5F2' }}>
            <tr>
              <th className="text-left p-3">Pathologie</th>
              <th className="text-left p-3">Groupe A</th>
              <th className="text-left p-3">Groupe B</th>
              <th className="text-center p-3">Sévère</th>
              <th className="text-center p-3">Active</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid #E3E3E8' }}>
                <td className="p-3 font-medium">{r.conditionName}</td>
                <td className="p-3" style={{ color: '#8A8A8E' }}>{r.keywordsA.join(', ')}</td>
                <td className="p-3" style={{ color: '#8A8A8E' }}>{r.keywordsB?.join(', ') || '—'}</td>
                <td className="p-3 text-center">{r.severe ? '⚠️' : ''}</td>
                <td className="p-3 text-center">
                  <input type="checkbox" checked={r.active} onChange={() => toggleActive(r)} />
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => remove(r.id)} className="hover:underline" style={{ color: '#A73B2E' }}>
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center" style={{ color: '#8A8A8E' }}>Aucune règle.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
