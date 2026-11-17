/**
 * Races proposées par espèce, à l'inscription d'un animal.
 *
 * Liste non exhaustive volontairement : le champ « Autre » reste toujours
 * disponible, faute de quoi une race locale absente de cette liste
 * bloquerait l'enregistrement de l'animal.
 */
export const BREEDS_BY_SPECIES: Record<string, string[]> = {
  Bovin: ['Gudali', 'White Fulani (Bunaji)', 'Ndama', 'Zébu', 'Holstein', 'Montbéliarde'],
  Ovin: ['Djallonké', 'Peul (Ouda)', 'Sahélien', 'Foulbé'],
  Caprin: ['Naine de Guinée', 'Sahélienne', 'Rousse de Maradi'],
  Porcin: ['Large White', 'Landrace', 'Duroc', 'Local croisé'],
  Volaille: ['Locale', 'Leghorn', 'Rhode Island', 'Sussex', 'Pondeuse hybride', 'Chair (broiler)'],
};

export const OTHER_BREED = 'Autre';

export function breedOptions(species: string): string[] {
  return [...(BREEDS_BY_SPECIES[species] ?? []), OTHER_BREED];
}
