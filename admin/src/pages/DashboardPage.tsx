import { useEffect, useState } from 'react';
import { adminApi } from '../lib/api';

interface Stats {
  summary: {
    totalUsers: number;
    totalVets: number;
    pendingVets: number;
    totalAppointments: number;
    totalPayments: number;
  };
  topVets: any[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getStats().then((res) => setStats(res.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-bold text-gray-800 mb-8">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-600 text-sm">Total Users</div>
          <div className="text-3xl font-bold text-green-600">{stats?.summary.totalUsers}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-600 text-sm">Total Vets</div>
          <div className="text-3xl font-bold text-blue-600">{stats?.summary.totalVets}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-600 text-sm">Pending Vets</div>
          <div className="text-3xl font-bold text-yellow-600">{stats?.summary.pendingVets}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-600 text-sm">Appointments</div>
          <div className="text-3xl font-bold text-purple-600">{stats?.summary.totalAppointments}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-600 text-sm">Payments</div>
          <div className="text-3xl font-bold text-pink-600">{stats?.summary.totalPayments}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-bold mb-4">Top Rated Vets</h2>
        <div className="space-y-3">
          {stats?.topVets.map((vet) => (
            <div key={vet.id} className="flex justify-between p-4 bg-gray-50 rounded">
              <div>
                <div className="font-semibold">{vet.user.name}</div>
                <div className="text-sm text-gray-600">{vet.specialty}</div>
              </div>
              <div className="text-yellow-500 font-bold">{vet.ratingAvg?.toFixed(1)} ★</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
