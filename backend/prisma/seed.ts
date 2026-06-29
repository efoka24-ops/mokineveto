import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(password: string) {
  return bcryptjs.hash(password, 10);
}

async function main() {
  console.log('🌱 Seeding database...');

  // Create ADMIN user
  const adminPassword = await hashPassword('admin123456');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@mokineveto.cm' },
    update: {},
    create: {
      name: 'Administrateur MokineVeto',
      email: 'admin@mokineveto.cm',
      phone: '+237691234567',
      passwordHash: adminPassword,
      role: 'ADMIN',
      avatarUrl: 'https://i.pravatar.cc/300?u=admin-mokineveto',
    },
  });
  console.log('✓ Created ADMIN user:', admin.email);

  // Create ELEVEUR demo user
  const eleveurPassword = await hashPassword('eleveur123456');
  const eleveur = await prisma.user.upsert({
    where: { email: 'herve@mokineveto.cm' },
    update: {},
    create: {
      name: 'Hervé TATINOU',
      email: 'herve@mokineveto.cm',
      phone: '+237656789000',
      passwordHash: eleveurPassword,
      role: 'ELEVEUR',
      birthDate: '29 / 01 / 1990',
      avatarUrl: 'https://i.pravatar.cc/300?u=herve-mokineveto',
    },
  });
  console.log('✓ Created ELEVEUR user:', eleveur.email);

  // Create VETERINAIRE users (6 existing mock vets)
  const vetSpecialties = [
    { name: 'Dr. Moustapha Ali', specialty: 'Médecine bovine', gender: 'homme', ordreNumber: 'No 1234D' },
    { name: 'Dr. Olivia Turner', specialty: 'Aviculture', gender: 'femme', ordreNumber: 'No 2051A' },
    { name: 'Dr. Alexander Bennett', specialty: 'Médecine des petits ruminants', gender: 'homme', ordreNumber: 'No 3098C' },
    { name: 'Dr. Sophia Martinez', specialty: 'Reproduction animale', gender: 'femme', ordreNumber: 'No 4477B' },
    { name: 'Dr. Michael Davidson', specialty: 'Pathologie porcine', gender: 'homme', ordreNumber: 'No 5521E' },
    { name: 'Dr. NGANE', specialty: 'Santé du troupeau', gender: 'homme', ordreNumber: 'No 1234D' },
  ];

  const vets: any[] = [];
  for (const vet of vetSpecialties) {
    const password = await hashPassword('vet123456');
    const email = vet.name.toLowerCase().replace(/\s+/g, '').replace(/\./, '') + '@mokineveto.cm';
    const phone = `+23769${String(vets.length + 1).padStart(8, '0')}`;

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name: vet.name,
        email,
        phone,
        passwordHash: password,
        role: 'VETERINAIRE',
        avatarUrl: `https://i.pravatar.cc/300?u=${vet.name.toLowerCase().replace(/\s+/g, '-')}`,
      },
    });

    const vetProfile = await prisma.vetProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        specialty: vet.specialty,
        gender: vet.gender,
        experienceYears: [18, 20, 15, 12, 16, 22][vets.length],
        schedule: 'Lun-Sam / 9:00AM - 5:00PM',
        hourlyRate: [8000, 7000, 6000, 9000, 7500, 8500][vets.length],
        professional: true,
        focus: 'Suivi professionnel des élevages',
        ordreNumber: vet.ordreNumber,
        verification: 'APPROVED',
        ratingAvg: 4.8 + (vets.length * 0.01),
        ratingCount: 40 + (vets.length * 10),
      },
      include: { user: true },
    });
    vets.push(vetProfile);
    console.log(`✓ Created VETERINAIRE: ${user.name}`);
  }

  // Create Availability templates for vets (weekdays, 9-17)
  for (const vet of vets) {
    for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) {
      // Monday to Friday
      await prisma.availability.upsert({
        where: { vetProfileId_dayOfWeek: { vetProfileId: vet.id, dayOfWeek } },
        update: {},
        create: {
          vetProfileId: vet.id,
          dayOfWeek,
          startTime: '09:00',
          endTime: '17:00',
          slotMinutes: 30,
        },
      });
    }
  }
  console.log('✓ Created Availability templates for vets');

  // Create sample Animals for eleveur
  const animals = [];
  for (const [idx, name] of ['Bella', 'Taurus', 'Reine'].entries()) {
    const animal = await prisma.animal.create({
      data: {
        userId: eleveur.id,
        name,
        species: ['Bovins', 'Bovins', 'Caprins'][idx],
        breed: ['Frisienne', 'Brahman', 'Sahel'][idx],
        sex: ['F', 'M', 'F'][idx] as any,
        age: '3 ans',
        robe: ['Pie rouge', 'Marron', 'Gris'][idx],
      },
    });
    animals.push(animal);
  }
  console.log(`✓ Created ${animals.length} sample animals`);

  // Create sample HealthEvents
  for (const animal of animals) {
    await prisma.healthEvent.create({
      data: {
        animalId: animal.id,
        type: 'VACCIN',
        label: 'Vaccination contre la fièvre aphteuse',
        date: '15/06/2026',
      },
    });
  }
  console.log('✓ Created sample health events');

  // Create sample Fiches (6 existing mock fiches)
  const fiches = [
    {
      name: 'Fièvre aphteuse',
      species: ['Bovins', 'Ovins', 'Caprins', 'Porcins'],
      contagious: true,
      description: 'Maladie virale très contagieuse touchant les ongulés.',
      fieldObs: 'Salivation excessive, boiterie, vésicules sur la langue et les onglons, fièvre.',
      prevention: 'Vaccination, isolement des sujets atteints, contrôle des mouvements d\'animaux.',
      vetInfo: 'Déclaration obligatoire. Diagnostic différentiel avec la stomatite vésiculeuse.',
    },
    {
      name: 'Theilériose',
      species: ['Bovins'],
      contagious: false,
      description: 'Maladie parasitaire transmise par les tiques.',
      fieldObs: 'Fièvre, abattement, ganglions enflés, anémie, perte d\'appétit.',
      prevention: 'Lutte contre les tiques, traitements acaricides réguliers.',
      vetInfo: 'Confirmation par frottis sanguin. Traitement par buparvaquone.',
    },
    {
      name: 'Pasteurellose',
      species: ['Bovins', 'Ovins', 'Volailles'],
      contagious: true,
      description: 'Infection bactérienne respiratoire (pneumonie).',
      fieldObs: 'Toux, jetage, fièvre, difficultés respiratoires.',
      prevention: 'Vaccination, réduction du stress et de la surpopulation.',
      vetInfo: 'Antibiothérapie précoce. Sensible aux conditions d\'élevage.',
    },
    {
      name: 'Brucellose',
      species: ['Bovins', 'Caprins', 'Ovins'],
      contagious: true,
      description: 'Zoonose bactérienne provoquant des avortements.',
      fieldObs: 'Avortements tardifs, rétention placentaire, baisse de fertilité.',
      prevention: 'Dépistage, abattage des positifs, hygiène à la mise bas.',
      vetInfo: 'Zoonose — précautions pour l\'éleveur. Sérologie de confirmation.',
    },
    {
      name: 'Charbon symptomatique',
      species: ['Bovins'],
      contagious: false,
      description: 'Infection clostridiale aiguë des jeunes bovins.',
      fieldObs: 'Gonflement crépitant des masses musculaires, fièvre, boiterie soudaine.',
      prevention: 'Vaccination des veaux en zone d\'endémie.',
      vetInfo: 'Évolution rapide souvent mortelle. Antibiothérapie d\'urgence.',
    },
    {
      name: 'Maladie de Newcastle',
      species: ['Volailles'],
      contagious: true,
      description: 'Maladie virale majeure de la volaille.',
      fieldObs: 'Torticolis, paralysie, diarrhée verdâtre, chute de ponte, mortalité élevée.',
      prevention: 'Vaccination systématique, biosécurité stricte.',
      vetInfo: 'Déclaration obligatoire. Pas de traitement — prophylaxie essentielle.',
    },
  ];

  for (const fiche of fiches) {
    await prisma.fiche.upsert({
      where: { id: fiche.name }, // Use name as id for upsert
      update: {},
      create: {
        name: fiche.name,
        species: fiche.species,
        contagious: fiche.contagious,
        description: fiche.description,
        fieldObs: fiche.fieldObs,
        prevention: fiche.prevention,
        vetInfo: fiche.vetInfo,
      },
    });
  }
  console.log(`✓ Created ${fiches.length} sample fiches`);

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
