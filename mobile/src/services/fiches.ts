/**
 * Base de connaissances — fiches techniques pathologiques.
 * Consultation payante (100 FCFA), non téléchargeable. Données d'exemple ;
 * la vraie base (100+ fiches) sera servie par l'API.
 */
export const FICHE_PRICE = 100; // FCFA par consultation

export interface Fiche {
  id: string;
  name: string;
  species: string[];
  contagious: boolean;
  description: string;
  fieldObs: string;
  prevention: string;
  vetInfo: string;
}

const FICHES: Fiche[] = [
  {
    id: 'f1',
    name: 'Fièvre aphteuse',
    species: ['Bovins', 'Ovins', 'Caprins', 'Porcins'],
    contagious: true,
    description: 'Maladie virale très contagieuse touchant les ongulés.',
    fieldObs: 'Salivation excessive, boiterie, vésicules sur la langue et les onglons, fièvre.',
    prevention: 'Vaccination, isolement des sujets atteints, contrôle des mouvements d\'animaux.',
    vetInfo: 'Déclaration obligatoire. Diagnostic différentiel avec la stomatite vésiculeuse.',
  },
  {
    id: 'f2',
    name: 'Theilériose',
    species: ['Bovins'],
    contagious: false,
    description: 'Maladie parasitaire transmise par les tiques.',
    fieldObs: 'Fièvre, abattement, ganglions enflés, anémie, perte d\'appétit.',
    prevention: 'Lutte contre les tiques, traitements acaricides réguliers.',
    vetInfo: 'Confirmation par frottis sanguin. Traitement par buparvaquone.',
  },
  {
    id: 'f3',
    name: 'Pasteurellose',
    species: ['Bovins', 'Ovins', 'Volailles'],
    contagious: true,
    description: 'Infection bactérienne respiratoire (pneumonie).',
    fieldObs: 'Toux, jetage, fièvre, difficultés respiratoires.',
    prevention: 'Vaccination, réduction du stress et de la surpopulation.',
    vetInfo: 'Antibiothérapie précoce. Sensible aux conditions d\'élevage.',
  },
  {
    id: 'f4',
    name: 'Brucellose',
    species: ['Bovins', 'Caprins', 'Ovins'],
    contagious: true,
    description: 'Zoonose bactérienne provoquant des avortements.',
    fieldObs: 'Avortements tardifs, rétention placentaire, baisse de fertilité.',
    prevention: 'Dépistage, abattage des positifs, hygiène à la mise bas.',
    vetInfo: 'Zoonose — précautions pour l\'éleveur. Sérologie de confirmation.',
  },
  {
    id: 'f5',
    name: 'Charbon symptomatique',
    species: ['Bovins'],
    contagious: false,
    description: 'Infection clostridiale aiguë des jeunes bovins.',
    fieldObs: 'Gonflement crépitant des masses musculaires, fièvre, boiterie soudaine.',
    prevention: 'Vaccination des veaux en zone d\'endémie.',
    vetInfo: 'Évolution rapide souvent mortelle. Antibiothérapie d\'urgence.',
  },
  {
    id: 'f6',
    name: 'Maladie de Newcastle',
    species: ['Volailles'],
    contagious: true,
    description: 'Maladie virale majeure de la volaille.',
    fieldObs: 'Torticolis, paralysie, diarrhée verdâtre, chute de ponte, mortalité élevée.',
    prevention: 'Vaccination systématique, biosécurité stricte.',
    vetInfo: 'Déclaration obligatoire. Pas de traitement — prophylaxie essentielle.',
  },
];

const wait = (ms = 200) => new Promise((r) => setTimeout(r, ms));

export async function listFiches(): Promise<Fiche[]> {
  await wait();
  return FICHES;
}

export function getFicheSync(id: string): Fiche | undefined {
  return FICHES.find((f) => f.id === id);
}
