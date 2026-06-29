import { useEffect, useState } from 'react';
import { adminApi } from '../lib/api';

interface VetProfile {
  id: string;
  user: { id: string; name: string; email: string };
  specialty: string;
  verification: string;
}

export default function VetQueuePage() {
  const [vets, setVets] = useState<VetProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);

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
    setApproving(vetId);
    try {
      await adminApi.verifyVet(vetId, status);
      setVets(vets.filter((v) => v.id !== vetId));
    } finally {
      setApproving(null);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-bold text-gray-800 mb-8">Pending Vet Verifications</h1>

      {vets.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center text-gray-600">
          No pending vets to verify
        </div>
      ) : (
        <div className="space-y-4">
          {vets.map((vet) => (
            <div key={vet.id} className="bg-white p-6 rounded-lg shadow flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold">{vet.user.name}</h3>
                <p className="text-gray-600">{vet.specialty}</p>
                <p className="text-sm text-gray-500">{vet.user.email}</p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => handleVerify(vet.id, 'APPROVED')}
                  disabled={approving === vet.id}
                  className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => handleVerify(vet.id, 'REJECTED')}
                  disabled={approving === vet.id}
                  className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  ✗ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
