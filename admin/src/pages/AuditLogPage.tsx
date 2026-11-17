import { Fragment, useEffect, useState } from 'react';
import { adminApi } from '../lib/api';

interface AuditRow {
  id: string;
  actorName: string | null;
  actorRole: string | null;
  actorIp: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  valueBefore: string | null;
  valueAfter: string | null;
  justification: string | null;
  createdAt: string;
}

/**
 * Journal d'audit (SFD-ADMIN §16) — lecture seule. Chaque action de
 * modération, de résolution de litige ou de changement de configuration
 * passe par `Audit::log()` côté API ; aucune route de modification ou de
 * suppression n'existe pour cette table (append-only).
 */
export default function AuditLogPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    adminApi.getAuditLog().then((res) => {
      setRows(res.data.data || []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-8">
      <p className="text-sm mb-6" style={{ color: '#8A8A8E', maxWidth: '68ch' }}>
        Chaque action de modération, de résolution de litige ou de modification de configuration est
        journalisée ici avec l'auteur, l'IP et l'état avant/après. Lecture seule.
      </p>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead style={{ background: '#F6F5F2' }}>
            <tr>
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Auteur</th>
              <th className="text-left p-3">Action</th>
              <th className="text-left p-3">Ressource</th>
              <th className="text-left p-3">Justification</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-6 text-center" style={{ color: '#8A8A8E' }}>Chargement…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center" style={{ color: '#8A8A8E' }}>Aucune entrée pour l'instant.</td></tr>
            ) : (
              rows.map((r) => (
                <Fragment key={r.id}>
                  <tr
                    style={{ borderTop: '1px solid #E3E3E8', cursor: 'pointer' }}
                    onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                  >
                    <td className="p-3" style={{ color: '#8A8A8E' }}>
                      {new Date(r.createdAt).toLocaleString('fr-FR')}
                    </td>
                    <td className="p-3">{r.actorName ?? 'système'} <span style={{ color: '#8A8A8E' }}>({r.actorRole ?? '—'})</span></td>
                    <td className="p-3 font-mono text-xs">{r.action}</td>
                    <td className="p-3" style={{ color: '#8A8A8E' }}>{r.resourceType}{r.resourceId ? ` · ${r.resourceId.slice(0, 10)}…` : ''}</td>
                    <td className="p-3" style={{ color: '#8A8A8E' }}>{r.justification || '—'}</td>
                  </tr>
                  {expanded === r.id && (
                    <tr style={{ background: '#F6F5F2' }}>
                      <td colSpan={5} className="p-4">
                        <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                          <div>
                            <p className="mb-1 font-sans font-semibold" style={{ color: '#5B4F44' }}>Avant</p>
                            <pre className="whitespace-pre-wrap break-all">{r.valueBefore ? JSON.stringify(JSON.parse(r.valueBefore), null, 2) : '—'}</pre>
                          </div>
                          <div>
                            <p className="mb-1 font-sans font-semibold" style={{ color: '#5B4F44' }}>Après</p>
                            <pre className="whitespace-pre-wrap break-all">{r.valueAfter ? JSON.stringify(JSON.parse(r.valueAfter), null, 2) : '—'}</pre>
                          </div>
                        </div>
                        <p className="mt-2 text-xs" style={{ color: '#8A8A8E' }}>IP : {r.actorIp ?? '—'}</p>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
