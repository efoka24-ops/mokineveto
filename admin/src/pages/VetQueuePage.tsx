import { useEffect, useState } from 'react';
import { adminApi } from '../lib/api';

interface VetProfile {
  id: string;
  userId: string;
  name: string;
  phone: string;
  email: string | null;
  specialty: string;
  ordreNumber: string;
  interventionZone: string | null;
  hourlyRate: number;
  experienceYears: number;
  createdAt: string;
  credentials: { type: string }[];
  complete: boolean;
}

export default function VetQueuePage() {
  const [vets, setVets] = useState<VetProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadVets();
  }, []);

  const loadVets = async () => {
    try {
      const res = await adminApi.getPendingVets();
      setVets(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (vetId: string, status: 'APPROVED' | 'REJECTED') => {
    let reason: string | undefined;
    if (status === 'REJECTED') {
      // La SFD §4.1.2 impose un refus motivé : le backend le refuse sans motif.
      reason = window.prompt('Motif du refus (obligatoire) :') ?? undefined;
      if (!reason) return;
    }

    setApproving(vetId);
    setError('');
    try {
      await adminApi.verifyVet(vetId, status, reason);
      setVets(vets.filter((v) => v.id !== vetId));
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.response?.data?.error || 'Échec de la validation.');
    } finally {
      setApproving(null);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded mb-4">{error}</div>}

      {vets.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center text-gray-600">
          Aucun vétérinaire en attente.
        </div>
      ) : (
        <div className="space-y-4">
          {vets.map((vet) => {
            const missingDocs = !vet.complete;
            return (
              <div key={vet.id} className="bg-white p-6 rounded-lg shadow flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold">{vet.name}</h3>
                  <p className="text-gray-600">{vet.specialty}</p>
                  <p className="text-sm text-gray-500">{vet.phone}{vet.email ? ` · ${vet.email}` : ''}</p>
                  {missingDocs && (
                    <p className="text-sm text-orange-600 mt-1">
                      Pièces manquantes : diplôme et/ou carte de l'Ordre non déposés.
                    </p>
                  )}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => handleVerify(vet.id, 'APPROVED')}
                    disabled={approving === vet.id || missingDocs}
                    title={missingDocs ? 'Pièces justificatives manquantes' : undefined}
                    className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    ✓ Approuver
                  </button>
                  <button
                    onClick={() => handleVerify(vet.id, 'REJECTED')}
                    disabled={approving === vet.id}
                    className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    ✗ Refuser
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
