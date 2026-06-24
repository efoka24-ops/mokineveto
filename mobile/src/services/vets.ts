/**
 * Couche de données — Annuaire des vétérinaires.
 * Données mockées pour l'instant ; même signature que le futur appel API REST
 * (remplacer l'intérieur des fonctions sans toucher aux écrans).
 */

export interface Vet {
  id: string;
  name: string;
  specialty: string;
  gender: 'femme' | 'homme';
  rating: number;
  reviews: number;
  experienceYears: number;
  schedule: string;
  hourlyRate: number; // XAF
  photo: string;
  professional: boolean;
  focus: string;
  ordreNumber: string;
}

const PHOTO = (seed: string) =>
  `https://i.pravatar.cc/300?u=mokinevet-${seed}`;

const VETS: Vet[] = [
  {
    id: 'v1',
    name: 'Dr. Moustapha Ali',
    specialty: 'Médecine bovine',
    gender: 'homme',
    rating: 5,
    reviews: 60,
    experienceYears: 18,
    schedule: 'Lun-Sam / 9:00AM - 5:00PM',
    hourlyRate: 8000,
    photo: PHOTO('moustapha'),
    professional: true,
    focus: "Suivi sanitaire des troupeaux bovins, reproduction et prévention des épizooties.",
    ordreNumber: 'No 1234D',
  },
  {
    id: 'v2',
    name: 'Dr. Olivia Turner',
    specialty: 'Aviculture',
    gender: 'femme',
    rating: 4.8,
    reviews: 90,
    experienceYears: 20,
    schedule: 'Lun-Sam / 9 AM - 4 PM',
    hourlyRate: 7000,
    photo: PHOTO('olivia'),
    professional: true,
    focus: "Pathologies de la volaille, biosécurité des élevages et vaccination.",
    ordreNumber: 'No 2051A',
  },
  {
    id: 'v3',
    name: 'Dr. Alexander Bennett',
    specialty: 'Médecine des petits ruminants',
    gender: 'homme',
    rating: 5,
    reviews: 40,
    experienceYears: 15,
    schedule: 'Lun-Sam / 9:00AM - 5:00PM',
    hourlyRate: 6000,
    photo: PHOTO('alexander'),
    professional: true,
    focus: "Caprins et ovins : parasitisme, nutrition et conduite de reproduction.",
    ordreNumber: 'No 3098C',
  },
  {
    id: 'v4',
    name: 'Dr. Sophia Martinez',
    specialty: 'Reproduction animale',
    gender: 'femme',
    rating: 4.9,
    reviews: 150,
    experienceYears: 12,
    schedule: 'Lun-Ven / 8 AM - 4 PM',
    hourlyRate: 9000,
    photo: PHOTO('sophia'),
    professional: true,
    focus: "Insémination, suivi de gestation et amélioration génétique du cheptel.",
    ordreNumber: 'No 4477B',
  },
  {
    id: 'v5',
    name: 'Dr. Michael Davidson',
    specialty: 'Pathologie porcine',
    gender: 'homme',
    rating: 4.8,
    reviews: 90,
    experienceYears: 16,
    schedule: 'Lun-Sam / 9 AM - 5 PM',
    hourlyRate: 7500,
    photo: PHOTO('michael'),
    professional: true,
    focus: "Maladies du porc, conduite d'élevage et plans de prophylaxie.",
    ordreNumber: 'No 5521E',
  },
  {
    id: 'v6',
    name: 'Dr. NGANE',
    specialty: 'Santé du troupeau',
    gender: 'homme',
    rating: 5,
    reviews: 40,
    experienceYears: 22,
    schedule: 'Lun-Sam / 9:00AM - 5:00PM',
    hourlyRate: 8500,
    photo: PHOTO('ngane'),
    professional: true,
    focus: "Médecine de troupeau, audits sanitaires et téléconsultation d'urgence.",
    ordreNumber: 'No 1234D',
  },
];

const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));

export async function listVets(): Promise<Vet[]> {
  await wait();
  return VETS;
}

export async function getVet(id: string): Promise<Vet | undefined> {
  await wait();
  return VETS.find((v) => v.id === id);
}

export function getVetSync(id: string): Vet | undefined {
  return VETS.find((v) => v.id === id);
}

export async function listByGender(gender: 'femme' | 'homme'): Promise<Vet[]> {
  await wait();
  return VETS.filter((v) => v.gender === gender);
}

export async function listTopRated(): Promise<Vet[]> {
  await wait();
  return [...VETS].sort((a, b) => b.rating - a.rating);
}

export const SPECIALTIES = [
  'Médecine bovine',
  'Aviculture',
  'Médecine des petits ruminants',
  'Reproduction animale',
  'Pathologie porcine',
  'Santé du troupeau',
];
