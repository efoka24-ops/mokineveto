import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { adminApi } from '../lib/api';
import { REGION_CENTROIDS, CAMEROON_CENTER } from '../lib/cameroonRegions';

interface RegionData {
  total: number;
  high: number;
  byFiche: Record<string, number>;
}

type Aggregate = Record<string, RegionData>;

function colorFor(high: number, total: number): string {
  if (total === 0) return '#22c55e';
  const ratio = high / total;
  if (ratio >= 0.5) return '#dc2626'; // red — high urgency dominant
  if (ratio >= 0.2) return '#f59e0b'; // amber
  return '#22c55e'; // green
}

export default function EpidemioMapPage() {
  const [data, setData] = useState<Aggregate>({});
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(90);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        const res = await adminApi.getEpidemioAggregate(since);
        setData(res.data.data || {});
      } catch (err) {
        console.error('Failed to load epidemio data', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [days]);

  const totalCases = Object.values(data).reduce((s, r) => s + r.total, 0);
  const totalHigh = Object.values(data).reduce((s, r) => s + r.high, 0);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Base épidémiologique</h1>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="border rounded px-3 py-2"
        >
          <option value={30}>30 derniers jours</option>
          <option value={90}>90 derniers jours</option>
          <option value={365}>12 derniers mois</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Signalements totaux</div>
          <div className="text-3xl font-bold">{totalCases}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Cas urgence élevée</div>
          <div className="text-3xl font-bold text-red-600">{totalHigh}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Régions touchées</div>
          <div className="text-3xl font-bold">{Object.keys(data).length}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden" style={{ height: 500 }}>
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-400">Chargement…</div>
        ) : (
          <MapContainer center={CAMEROON_CENTER} zoom={6} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {Object.entries(REGION_CENTROIDS).map(([key, region]) => {
              const rd = data[key];
              if (!rd || rd.total === 0) return null;
              const radius = Math.min(8 + rd.total * 4, 40);
              return (
                <CircleMarker
                  key={key}
                  center={[region.lat, region.lng]}
                  radius={radius}
                  pathOptions={{
                    color: colorFor(rd.high, rd.total),
                    fillColor: colorFor(rd.high, rd.total),
                    fillOpacity: 0.5,
                  }}
                >
                  <Tooltip>
                    <div className="text-sm">
                      <strong>{region.name}</strong>
                      <br />
                      {rd.total} signalement(s) · {rd.high} urgents
                    </div>
                  </Tooltip>
                </CircleMarker>
              );
            })}
          </MapContainer>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-2">
        Carte indicative — positions régionales approximatives, données anonymisées (aucune
        donnée personnelle). Taille du cercle ∝ nombre de signalements ; couleur selon la part
        d'urgences élevées.
      </p>

      {/* Region breakdown table */}
      <div className="bg-white rounded-lg shadow mt-4 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Région</th>
              <th className="text-right p-3">Total</th>
              <th className="text-right p-3">Urgents</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(data)
              .sort((a, b) => b[1].total - a[1].total)
              .map(([key, rd]) => (
                <tr key={key} className="border-t">
                  <td className="p-3">{REGION_CENTROIDS[key]?.name || key}</td>
                  <td className="text-right p-3">{rd.total}</td>
                  <td className="text-right p-3 text-red-600">{rd.high}</td>
                </tr>
              ))}
            {Object.keys(data).length === 0 ? (
              <tr>
                <td colSpan={3} className="p-6 text-center text-gray-400">
                  Aucun signalement sur la période.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
