import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Borno State LGAs seed...');

  // ========================================
  // BORNO STATE LOCAL GOVERNMENTS
  // ========================================
  console.log('Creating Borno State Local Governments...');

  // First, ensure Borno State exists
  const bornoState = await prisma.entity.upsert({
    where: { id: 'borno-state' },
    update: {},
    create: {
      id: 'borno-state',
      name: 'Borno State',
      type: 'STATE',
      isActive: true,
    },
  });

  console.log(`✅ Borno State: ${bornoState.name}`);

  // All 27 Local Governments in Borno State
  const bornoLGAs = [
    { id: 'abadam-lga', name: 'Abadam', slug: 'abadam' },
    { id: 'askira-uba-lga', name: 'Askira/Uba', slug: 'askira-uba' },
    { id: 'bama-lga', name: 'Bama', slug: 'bama' },
    { id: 'bayo-lga', name: 'Bayo', slug: 'bayo' },
    { id: 'biu-lga', name: 'Biu', slug: 'biu' },
    { id: 'chibok-lga', name: 'Chibok', slug: 'chibok' },
    { id: 'damboa-lga', name: 'Damboa', slug: 'damboa' },
    { id: 'dikwa-lga', name: 'Dikwa', slug: 'dikwa' },
    { id: 'gubio-lga', name: 'Gubio', slug: 'gubio' },
    { id: 'guzamala-lga', name: 'Guzamala', slug: 'guzamala' },
    { id: 'gwoza-lga', name: 'Gwoza', slug: 'gwoza' },
    { id: 'hawul-lga', name: 'Hawul', slug: 'hawul' },
    { id: 'jere-lga', name: 'Jere', slug: 'jere' },
    { id: 'kaga-lga', name: 'Kaga', slug: 'kaga' },
    { id: 'kala-balge-lga', name: 'Kala/Balge', slug: 'kala-balge' },
    { id: 'konduga-lga', name: 'Konduga', slug: 'konduga' },
    { id: 'kukawa-lga', name: 'Kukawa', slug: 'kukawa' },
    { id: 'kwaya-kusar-lga', name: 'Kwaya Kusar', slug: 'kwaya-kusar' },
    { id: 'mafa-lga', name: 'Mafa', slug: 'mafa' },
    { id: 'magumeri-lga', name: 'Magumeri', slug: 'magumeri' },
    { id: 'maiduguri-lga', name: 'Maiduguri', slug: 'maiduguri' },
    { id: 'marte-lga', name: 'Marte', slug: 'marte' },
    { id: 'mobbar-lga', name: 'Mobbar', slug: 'mobbar' },
    { id: 'monguno-lga', name: 'Monguno', slug: 'monguno' },
    { id: 'ngala-lga', name: 'Ngala', slug: 'ngala' },
    { id: 'nganzai-lga', name: 'Nganzai', slug: 'nganzai' },
    { id: 'shani-lga', name: 'Shani', slug: 'shani' },
  ];

  let createdCount = 0;
  let updatedCount = 0;

  for (const lga of bornoLGAs) {
    try {
      const entity = await prisma.entity.upsert({
        where: { id: lga.id },
        update: {
          name: lga.name,
          isActive: true,
        },
        create: {
          id: lga.id,
          name: lga.name,
          type: 'LGA',
          parentId: bornoState.id,
          isActive: true,
        },
      });

      if (entity.createdAt === entity.updatedAt) {
        createdCount++;
        console.log(`   ✅ Created LGA: ${lga.name}`);
      } else {
        updatedCount++;
        console.log(`   🔄 Updated LGA: ${lga.name}`);
      }
    } catch (error) {
      console.error(`   ❌ Error with ${lga.name}:`, error);
    }
  }

  console.log(`✅ ${createdCount} LGAs created, ${updatedCount} LGAs updated`);

  // ========================================
  // CREATE SAMPLE WARDS IN MAIDUGURI LGA
  // ========================================
  console.log('Creating sample wards in Maiduguri LGA...');

  const maiduguriWards = [
    { id: 'maiduguri-ward-1', name: 'Maiduguri Ward 1' },
    { id: 'maiduguri-ward-2', name: 'Maiduguri Ward 2' },
    { id: 'maiduguri-ward-3', name: 'Maiduguri Ward 3' },
    { id: 'bolori-tabia', name: 'Bolori Tabia' },
    { id: 'pompomari', name: 'Pompomari' },
  ];

  let wardCount = 0;
  for (const ward of maiduguriWards) {
    try {
      const wardEntity = await prisma.entity.upsert({
        where: { id: ward.id },
        update: {
          name: ward.name,
          isActive: true,
        },
        create: {
          id: ward.id,
          name: ward.name,
          type: 'WARD',
          parentId: 'maiduguri-lga',
          isActive: true,
        },
      });
      wardCount++;
      console.log(`   ✅ Created Ward: ${ward.name}`);
    } catch (error) {
      console.error(`   ❌ Error with ${ward.name}:`, error);
    }
  }

  console.log(`✅ ${wardCount} sample wards created in Maiduguri LGA`);

  // ========================================
  // SUMMARY
  // ========================================
  console.log('🎉 Borno State LGAs seed completed successfully!');
  console.log('');
  console.log('📋 Summary:');
  console.log(`   - Borno State: 1 state entity`);
  console.log(`   - Local Governments: ${bornoLGAs.length} LGAs created/updated`);
  console.log(`   - Sample Wards: ${wardCount} wards in Maiduguri LGA`);
  console.log('');
  console.log('🗺️  Geographic Hierarchy:');
  console.log(`   Borno State`);
  console.log(`   └── 27 Local Governments (Abadam, Askira/Uba, ... Shani)`);
  console.log(`       └── Maiduguri LGA`);
  console.log(`           └── 5 Sample Wards`);
  console.log('');
  console.log('📍 Ready for disaster response operations in Borno State!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });