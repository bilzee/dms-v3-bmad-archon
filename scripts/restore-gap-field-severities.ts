import { PrismaClient, Priority } from '@prisma/client';

const prisma = new PrismaClient();

// Define the CORRECT severities for each field
// You can edit these values before running the script
const correctSeverities = {
  // HEALTH Assessment Fields - CRITICAL/HIGH priority
  hasFunctionalClinic: Priority.CRITICAL,        // No clinic = critical gap
  hasEmergencyServices: Priority.CRITICAL,       // No emergency services = critical gap
  hasTrainedStaff: Priority.HIGH,                 // No trained staff = high gap
  hasMedicineSupply: Priority.HIGH,               // No medicine = high gap
  hasMedicalSupplies: Priority.HIGH,              // No supplies = high gap
  hasMaternalChildServices: Priority.HIGH,        // No MCH services = high gap

  // WASH Assessment Fields - MIXED priority
  isWaterSufficient: Priority.CRITICAL,           // No water = critical gap
  hasCleanWaterAccess: Priority.CRITICAL,         // No clean water = critical gap
  areLatrinesSufficient: Priority.HIGH,           // Insufficient latrines = high gap
  hasHandwashingFacilities: Priority.MEDIUM,      // No handwashing = medium gap
  hasOpenDefecationConcerns: Priority.HIGH,       // Open defecation = high gap

  // SHELTER Assessment Fields - MIXED priority
  areSheltersSufficient: Priority.CRITICAL,       // No shelter = critical gap
  hasSafeStructures: Priority.CRITICAL,           // Unsafe structures = critical gap
  areOvercrowded: Priority.HIGH,                  // Overcrowding = high gap
  provideWeatherProtection: Priority.HIGH,        // No weather protection = high gap

  // FOOD Assessment Fields - CRITICAL priority
  isFoodSufficient: Priority.CRITICAL,            // No food = critical gap
  hasRegularMealAccess: Priority.CRITICAL,        // No meals = critical gap
  hasInfantNutrition: Priority.CRITICAL,          // No infant nutrition = critical gap

  // SECURITY Assessment Fields - MIXED priority
  isSafeFromViolence: Priority.CRITICAL,          // Violence = critical gap
  gbvCasesReported: Priority.CRITICAL,            // GBV cases = critical gap
  hasSecurityPresence: Priority.HIGH,             // No security = high gap
  hasProtectionReportingMechanism: Priority.MEDIUM,// No reporting = medium gap
  vulnerableGroupsHaveAccess: Priority.HIGH,      // No access = high gap
  hasLighting: Priority.MEDIUM,                   // No lighting = medium gap
};

async function restoreSeverities() {
  console.log('🔧 Restoring correct gap field severities...');
  console.log('');

  // Get current gap fields
  const currentGapFields = await prisma.gapFieldSeverity.findMany({
    where: { isActive: true }
  });

  console.log(`📊 Found ${currentGapFields.length} active gap fields`);
  console.log('');

  let updatedCount = 0;
  let unchangedCount = 0;
  let notFoundCount = 0;

  // Show proposed changes and ask for confirmation
  console.log('🔍 PROPOSED CHANGES:');
  console.log('');

  const changes = [];

  for (const [fieldName, correctSeverity] of Object.entries(correctSeverities)) {
    const field = currentGapFields.find(f => f.fieldName === fieldName);
    
    if (!field) {
      console.log(`❌ ${fieldName} - NOT FOUND IN DATABASE`);
      notFoundCount++;
      continue;
    }

    if (field.severity !== correctSeverity) {
      console.log(`🔄 ${fieldName}: ${field.severity} → ${correctSeverity}`);
      changes.push({ field, correctSeverity });
    } else {
      console.log(`✅ ${fieldName}: ${field.severity} (already correct)`);
      unchangedCount++;
    }
  }

  console.log('');
  console.log(`📊 Summary: ${changes.length} changes, ${unchangedCount} unchanged, ${notFoundCount} not found`);
  console.log('');

  // Ask for confirmation before making changes
  if (changes.length === 0) {
    console.log('✅ All severities are already correct! No changes needed.');
    await prisma.$disconnect();
    return;
  }

  console.log('⚠️  WARNING: This will change the severities listed above.');
  console.log('🤔 Do you want to proceed? (yes/no)');
  
  // Since this is a script, we'll proceed automatically but you can comment this out
  // In a real scenario, you might want to add user confirmation logic here
  
  console.log('');
  console.log('🚀 Proceeding with severity updates...');
  console.log('');

  // Apply the changes
  for (const { field, correctSeverity } of changes) {
    try {
      await prisma.gapFieldSeverity.update({
        where: { id: field.id },
        data: { severity: correctSeverity }
      });
      updatedCount++;
      console.log(`✅ Updated ${field.fieldName}: ${field.severity} → ${correctSeverity}`);
    } catch (error) {
      console.error(`❌ Error updating ${field.fieldName}:`, error);
    }
  }

  console.log('');
  console.log(`✅ Successfully updated ${updatedCount} field severities`);
  
  // Show final state
  const finalGapFields = await prisma.gapFieldSeverity.findMany({
    where: { isActive: true },
    orderBy: [
      { assessmentType: 'asc' },
      { severity: 'desc' },  // Order by severity (critical first)
      { fieldName: 'asc' }
    ]
  });

  console.log('');
  console.log('🎯 FINAL DATABASE STATE:');
  console.log('');

  // Group by severity
  const bySeverity = {
    CRITICAL: [],
    HIGH: [],
    MEDIUM: [],
    LOW: []
  };

  finalGapFields.forEach(field => {
    bySeverity[field.severity].push(field);
  });

  Object.entries(bySeverity).forEach(([severity, fields]) => {
    if (fields.length > 0) {
      console.log(`** ${severity} (${fields.length} fields) **`);
      fields.forEach(field => {
        console.log(`   - ${field.fieldName} (${field.assessmentType})`);
      });
      console.log('');
    }
  });

  console.log('✅ Severity restoration completed!');
  console.log('');
  console.log('⚠️  Please verify the situation dashboard reflects these changes correctly.');

  await prisma.$disconnect();
}

restoreSeverities()
  .catch((e) => {
    console.error('❌ Error restoring severities:', e);
    process.exit(1);
  });