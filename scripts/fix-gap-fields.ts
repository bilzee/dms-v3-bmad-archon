import { PrismaClient, Priority, AssessmentType } from '@prisma/client';

const prisma = new PrismaClient();

async function fixGapFields() {
  console.log('🔧 Fixing gap fields to match correct specification...');
  console.log('');

  // CORRECT LIST FROM USER
  const correctGapFields = {
    HEALTH: [
      { fieldName: 'hasFunctionalClinic', displayName: 'Functional Health Clinic', description: 'Gap if no functional health clinic facility available' },
      { fieldName: 'hasEmergencyServices', displayName: 'Emergency Health Services', description: 'Gap if emergency health services are not available' },
      { fieldName: 'hasTrainedStaff', displayName: 'Trained Health Staff', description: 'Gap if insufficient trained health personnel' },
      { fieldName: 'hasMedicineSupply', displayName: 'Medicine Supply', description: 'Gap if essential medicine supply is unavailable' },
      { fieldName: 'hasMedicalSupplies', displayName: 'Medical Supplies', description: 'Gap if critical medical supplies are unavailable' },
      { fieldName: 'hasMaternalChildServices', displayName: 'Maternal and Child Health Services', description: 'Gap if maternal and child health services are not available' }
    ],
    WASH: [
      { fieldName: 'isWaterSufficient', displayName: 'Water Sufficiency', description: 'Gap if water supply is insufficient for population needs' },
      { fieldName: 'hasCleanWaterAccess', displayName: 'Clean Water Access', description: 'Gap if population lacks access to clean drinking water' },
      { fieldName: 'areLatrinesSufficient', displayName: 'Latrine Sufficiency', description: 'Gap if sanitation facilities are insufficient' },
      { fieldName: 'hasHandwashingFacilities', displayName: 'Handwashing Facilities', description: 'Gap if handwashing facilities are not available' },
      { fieldName: 'hasOpenDefecationConcerns', displayName: 'Open Defecation Concerns', description: 'Gap if open defecation issues are present' }
    ],
    SHELTER: [
      { fieldName: 'areSheltersSufficient', displayName: 'Shelter Sufficiency', description: 'Gap if emergency shelter is insufficient' },
      { fieldName: 'hasSafeStructures', displayName: 'Safe Shelter Structures', description: 'Gap if shelter structures are not safe' },
      { fieldName: 'areOvercrowded', displayName: 'Shelter Overcrowding', description: 'Gap if shelters are overcrowded' },
      { fieldName: 'provideWeatherProtection', displayName: 'Weather Protection', description: 'Gap if shelters do not provide adequate weather protection' }
    ],
    FOOD: [
      { fieldName: 'isFoodSufficient', displayName: 'Food Sufficiency', description: 'Gap if food supply is insufficient for population needs' },
      { fieldName: 'hasRegularMealAccess', displayName: 'Regular Meal Access', description: 'Gap if population lacks access to regular meals' },
      { fieldName: 'hasInfantNutrition', displayName: 'Infant Nutrition', description: 'Gap if infant/child nutrition services are unavailable' }
    ],
    SECURITY: [
      { fieldName: 'isSafeFromViolence', displayName: 'Safety from Violence', description: 'Gap if population is not safe from violence' },
      { fieldName: 'gbvCasesReported', displayName: 'GBV Cases Reported', description: 'Gap if gender-based violence cases are reported' },
      { fieldName: 'hasSecurityPresence', displayName: 'Security Presence', description: 'Gap if security personnel presence is insufficient' },
      { fieldName: 'hasProtectionReportingMechanism', displayName: 'Protection Reporting Mechanism', description: 'Gap if protection reporting mechanisms are unavailable' },
      { fieldName: 'vulnerableGroupsHaveAccess', displayName: 'Vulnerable Groups Access', description: 'Gap if vulnerable groups lack access to protection services' },
      { fieldName: 'hasLighting', displayName: 'Security Lighting', description: 'Gap if adequate security lighting is not available' }
    ]
  };

  // Get current gap fields
  const currentGapFields = await prisma.gapFieldSeverity.findMany();
  console.log(`📊 Current database has ${currentGapFields.length} gap fields`);

  // Step 1: Identify fields to DELETE (wrong ones)
  console.log('🗑️  Identifying wrong fields to DELETE...');
  
  // Create a flat list of correct field+assessment combinations
  const correctFieldCombos = new Set();
  Object.entries(correctGapFields).forEach(([assessmentType, fields]) => {
    fields.forEach(field => {
      correctFieldCombos.add(`${field.fieldName}:${assessmentType}`);
    });
  });

  // Find fields that are NOT in the correct list
  const fieldsToDelete = currentGapFields.filter(field => 
    !correctFieldCombos.has(`${field.fieldName}:${field.assessmentType}`)
  );

  console.log(`   Found ${fieldsToDelete.length} wrong fields to DELETE:`);
  fieldsToDelete.forEach(field => {
    console.log(`   - ${field.fieldName} (${field.assessmentType})`);
  });

  // Hard delete the wrong fields
  if (fieldsToDelete.length > 0) {
    const deleteIds = fieldsToDelete.map(f => f.id);
    await prisma.gapFieldSeverity.deleteMany({
      where: {
        id: { in: deleteIds }
      }
    });
    console.log(`✅ Deleted ${fieldsToDelete.length} wrong fields`);
  } else {
    console.log('✅ No wrong fields to delete');
  }

  // Step 2: Create/update correct fields (preserving existing severity)
  console.log('➕ Creating/updating correct gap fields...');
  let createdCount = 0;
  let updatedCount = 0;

  for (const [assessmentType, fields] of Object.entries(correctGapFields)) {
    for (const fieldConfig of fields) {
      try {
        // Check if field already exists
        const existingField = await prisma.gapFieldSeverity.findUnique({
          where: {
            unique_field_assessment: {
              fieldName: fieldConfig.fieldName,
              assessmentType: assessmentType as AssessmentType
            }
          }
        });

        if (existingField) {
          // Update existing field, but preserve its current severity
          await prisma.gapFieldSeverity.update({
            where: {
              unique_field_assessment: {
                fieldName: fieldConfig.fieldName,
                assessmentType: assessmentType as AssessmentType
              }
            },
            data: {
              displayName: fieldConfig.displayName,
              description: fieldConfig.description,
              isActive: true
              // NOTE: NOT updating severity - preserve existing
            }
          });
          updatedCount++;
          console.log(`   🔄 Updated ${fieldConfig.fieldName} (${assessmentType}) - kept severity: ${existingField.severity}`);
        } else {
          // Create new field with MEDIUM severity
          await prisma.gapFieldSeverity.create({
            data: {
              fieldName: fieldConfig.fieldName,
              assessmentType: assessmentType as AssessmentType,
              severity: Priority.MEDIUM,  // New fields get MEDIUM
              displayName: fieldConfig.displayName,
              description: fieldConfig.description,
              isActive: true
            }
          });
          createdCount++;
          console.log(`   ✅ Created ${fieldConfig.fieldName} (${assessmentType}) - severity: MEDIUM`);
        }
      } catch (error) {
        console.error(`   ❌ Error with ${fieldConfig.fieldName}:`, error);
      }
    }
  }

  console.log(`✅ Updated ${updatedCount} existing fields (preserved severities)`);
  console.log(`✅ Created ${createdCount} new fields (all MEDIUM severity)`);

  // Step 3: Verify the result
  const finalGapFields = await prisma.gapFieldSeverity.findMany({
    where: { isActive: true },
    orderBy: [
      { assessmentType: 'asc' },
      { fieldName: 'asc' }
    ]
  });

  console.log('');
  console.log('🎯 FINAL DATABASE STATE:');
  console.log('');

  const byType = {
    HEALTH: [] as any[],
    WASH: [] as any[],
    SHELTER: [] as any[],
    FOOD: [] as any[],
    SECURITY: [] as any[]
  };

  finalGapFields.forEach(field => {
    if (byType[field.assessmentType]) {
      byType[field.assessmentType].push(field);
    }
  });

  Object.entries(byType).forEach(([type, fields]) => {
    if (fields.length > 0) {
      console.log(`** ${type} (${fields.length} fields) **`);
      fields.forEach(field => {
        console.log(`   - ${field.fieldName} (Severity: ${field.severity})`);
      });
      console.log('');
    }
  });

  console.log(`✅ Database updated successfully! ${finalGapFields.length} active gap fields configured.`);
  console.log('');
  console.log('⚠️  Please verify the situation dashboard is working correctly.');

  await prisma.$disconnect();
}

fixGapFields()
  .catch((e) => {
    console.error('❌ Error fixing gap fields:', e);
    process.exit(1);
  });