/**
 * Centroïdes approximatifs des 10 régions du Cameroun (lat, lng).
 * Usage : visualisation épidémiologique (cercles proportionnels), pas un tracé géodésique.
 */
export const REGION_CENTROIDS: Record<string, { name: string; lat: number; lng: number }> = {
  ADAMAOUA: { name: 'Adamaoua', lat: 6.5, lng: 12.5 },
  CENTRE: { name: 'Centre', lat: 4.6, lng: 11.8 },
  EST: { name: 'Est', lat: 4.0, lng: 14.0 },
  EXTREME_NORD: { name: 'Extrême-Nord', lat: 10.6, lng: 14.3 },
  LITTORAL: { name: 'Littoral', lat: 4.2, lng: 9.9 },
  NORD: { name: 'Nord', lat: 8.5, lng: 13.8 },
  NORD_OUEST: { name: 'Nord-Ouest', lat: 6.2, lng: 10.4 },
  OUEST: { name: 'Ouest', lat: 5.5, lng: 10.4 },
  SUD: { name: 'Sud', lat: 2.9, lng: 11.5 },
  SUD_OUEST: { name: 'Sud-Ouest', lat: 4.9, lng: 9.3 },
};

export const CAMEROON_CENTER: [number, number] = [6.5, 12.0];
