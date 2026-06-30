import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(password: string) {
  return bcryptjs.hash(password, 10);
}

async function main() {
  console.log('🌱 Seeding database with real users...');

  // ===== CLEANUP: Delete existing seed data =====
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.review.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.ficheUnlock.deleteMany();
  await prisma.fiche.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.healthEvent.deleteMany();
  await prisma.animal.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.healthReport.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.farm.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.savedMoneyAccount.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.vetProfile.deleteMany();
  await prisma.user.deleteMany();
  console.log('✓ Cleaned up database');

  // ===== ADMIN USER =====
  const adminPassword = await hashPassword('admin123456');
  const admin = await prisma.user.create({
    data: {
      name: 'Administrateur MokineVeto',
      email: 'admin@mokineveto.cm',
      phone: '+237691111111',
      passwordHash: adminPassword,
      role: 'ADMIN',
      avatarUrl: 'https://i.pravatar.cc/300?u=admin-mokineveto',
    },
  });
  console.log('✓ Created ADMIN:', admin.email);

  // ===== ELEVEUR USER: MARLY YAYA (GAROUA) =====
  const eleveurPassword = await hashPassword('marly123456');
  const eleveur = await prisma.user.create({
    data: {
      name: 'MARLY YAYA',
      email: 'kowssimamarlyy@gmail.com',
      phone: '+237691234567',
      passwordHash: eleveurPassword,
      role: 'ELEVEUR',
      birthDate: '01 / 01 / 1985',
      avatarUrl: 'https://i.pravatar.cc/300?u=marly-yaya-garoua',
    },
  });
  console.log('✓ Created ELEVEUR:', eleveur.email, '(GAROUA)');

  // ===== DEFAULT FARM FOR MARLY (multi-élevage) =====
  const farm = await prisma.farm.create({
    data: {
      userId: eleveur.id,
      name: 'Élevage de Marly',
      region: 'NORD',
      isDefault: true,
    },
  });
  console.log('✓ Created default Farm for Marly (NORD)');

  // ===== VETERINAIRE USER: EMMANUEL FOKA (GAROUA) =====
  const vetPassword = await hashPassword('foka123456');
  const vetUser = await prisma.user.create({
    data: {
      name: 'Dr. Emmanuel FOKA',
      email: 'emm.foka@gmail.com',
      phone: '+237691222222',
      passwordHash: vetPassword,
      role: 'VETERINAIRE',
      avatarUrl: 'https://i.pravatar.cc/300?u=emmanuel-foka-vet',
    },
  });
  console.log('✓ Created VETERINAIRE:', vetUser.email, '(GAROUA)');

  // ===== VET PROFILE FOR EMMANUEL FOKA =====
  const vetProfile = await prisma.vetProfile.create({
    data: {
      userId: vetUser.id,
      specialty: 'Médecine bovine',
      gender: 'homme',
      experienceYears: 10,
      schedule: 'Lun-Sam / 9:00AM - 5:00PM',
      hourlyRate: 8000,
      professional: true,
      focus: 'Suivi professionnel des élevages camerounais',
      ordreNumber: 'ORVET-2024-001',
      verification: 'APPROVED',
      ratingAvg: 4.9,
      ratingCount: 0,
    },
  });
  console.log('✓ Created VetProfile for Dr. Foka');

  // ===== AVAILABILITY FOR DR. FOKA =====
  for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) {
    // Monday to Friday
    await prisma.availability.create({
      data: {
        vetProfileId: vetProfile.id,
        dayOfWeek,
        startTime: '09:00',
        endTime: '17:00',
        slotMinutes: 30,
      },
    });
  }
  console.log('✓ Created Availability templates for Dr. Foka');

  // Create sample Animals for eleveur
  const animals = [];
  for (const [idx, name] of ['Bella', 'Taurus', 'Reine'].entries()) {
    const animal = await prisma.animal.create({
      data: {
        userId: eleveur.id,
        farmId: farm.id,
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

  const createdFiches = [];
  for (const fiche of fiches) {
    const created = await prisma.fiche.create({
      data: {
        name: fiche.name,
        species: fiche.species,
        contagious: fiche.contagious,
        description: fiche.description,
        fieldObs: fiche.fieldObs,
        prevention: fiche.prevention,
        vetInfo: fiche.vetInfo,
      },
    });
    createdFiches.push(created);
  }
  console.log(`✓ Created ${fiches.length} sample fiches`);

  // ===== MARKETPLACE: Suppliers + Products =====
  const supplier1 = await prisma.supplier.create({
    data: { name: 'Vet Distribution Cameroun', phone: '+237699000111', region: 'NORD', active: true },
  });
  const supplier2 = await prisma.supplier.create({
    data: { name: 'AgroVet Sahel', phone: '+237699000222', region: 'EXTREME_NORD', active: true },
  });

  await prisma.product.createMany({
    data: [
      { supplierId: supplier1.id, name: 'Vaccin fièvre aphteuse (dose)', category: 'Vaccins', price: 1500, unit: 'dose' },
      { supplierId: supplier1.id, name: 'Vermifuge bovin', category: 'Antiparasitaires', price: 2500, unit: 'flacon' },
      { supplierId: supplier1.id, name: 'Complément minéral bétail', category: 'Nutrition', price: 4000, unit: 'sac 5kg' },
      { supplierId: supplier2.id, name: 'Antibiotique large spectre', category: 'Médicaments', price: 6000, unit: 'flacon' },
      { supplierId: supplier2.id, name: 'Acaricide tiques', category: 'Antiparasitaires', price: 3200, unit: 'litre' },
    ],
  });
  console.log('✓ Created sample Suppliers + Products');

  // ===== EPIDEMIOLOGY: anonymized HealthReport demo data =====
  const fievreAphteuse = createdFiches.find((f) => f.name === 'Fièvre aphteuse');
  const theileriose = createdFiches.find((f) => f.name === 'Theilériose');
  await prisma.healthReport.createMany({
    data: [
      { source: 'HEALTH_EVENT', ficheId: fievreAphteuse?.id, region: 'NORD', urgency: 'HIGH' },
      { source: 'HEALTH_EVENT', ficheId: fievreAphteuse?.id, region: 'NORD', urgency: 'HIGH' },
      { source: 'CHATBOT', ficheId: theileriose?.id, region: 'EXTREME_NORD', urgency: 'MEDIUM' },
      { source: 'CHATBOT', ficheId: fievreAphteuse?.id, region: 'ADAMAOUA', urgency: 'MEDIUM' },
      { source: 'HEALTH_EVENT', ficheId: theileriose?.id, region: 'CENTRE', urgency: 'LOW' },
    ],
  });
  console.log('✓ Created sample HealthReports (épidémiologie)');

  // ===== ALERTS: demo regional + national broadcast =====
  await prisma.alert.createMany({
    data: [
      {
        type: 'EPIDEMIC',
        title: 'Recrudescence de fièvre aphteuse — région NORD',
        body: 'Plusieurs cas suspects signalés autour de Garoua. Renforcez la surveillance et limitez les mouvements d\'animaux.',
        region: 'NORD',
        ficheId: fievreAphteuse?.id,
        severity: 'CRITICAL',
        createdById: admin.id,
      },
      {
        type: 'SYSTEM',
        title: 'Bienvenue sur MokineVeto',
        body: 'Votre compte est prêt. Consultez les fiches techniques et planifiez vos rendez-vous vétérinaires.',
        region: null,
        severity: 'INFO',
        createdById: admin.id,
      },
    ],
  });
  console.log('✓ Created sample Alerts');

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
