/**
 * Alertes sanitaires régionales (SFD §4.2, §4.11).
 * Le backend filtre déjà sur les régions des exploitations de l'utilisateur.
 */
import { api } from './api';

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type AlertType = 'EPIDEMIC' | 'VACCINATION' | 'WEATHER' | 'OTHER';

export interface HealthAlert {
  id: string;
  type: AlertType;
  title: string;
  body: string;
  region: string | null;
  severity: AlertSeverity;
  createdAt: string;
  expiresAt: string | null;
}

/**
 * Renvoie les alertes concernant l'utilisateur. Échec silencieux : une panne
 * de ce canal ne doit pas empêcher l'affichage du tableau de bord.
 */
export async function listAlerts(): Promise<HealthAlert[]> {
  try {
    const res = await api.get<{ data: HealthAlert[] }>('/alerts', true);
    return res.data ?? [];
  } catch (_err) {
    return [];
  }
}
