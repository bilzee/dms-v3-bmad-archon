import { PrismaClient, AssessmentType } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCurrentGapFields() {
  console.log('🔍 Checking current gap fields in database...');
  console.log('');

  // Get all current gap fields from database
  const currentGapFields = await prisma.gapFieldSeverity.findMany({
    where: { isActive: true },
    orderBy: [
      { assessmentType: 'asc' },
      { fieldName: 'asc' }
    ]
  });

  console.log(`📊 Found ${currentGapFields.length} active gap fields in database:`);
  console.log('');

  // Group by assessment type
  const byType = {
    HEALTH: [] as any[],
    WASH: [] as any[],
    SHELTER: [] as any[],
    FOOD: [] as any[],
    SECURITY: [] as any[],
    POPULATION: [] as any[]
  };

  currentGapFields.forEach(field => {
    if (byType[field.assessmentType]) {
      byType[field.assessmentType].push(field);
    }
  });

  // Display current fields
  Object.entries(byType).forEach(([type, fields]) => {
    if (fields.length > 0) {
      console.log(`** ${type} (${fields.length} fields) **`);
      fields.forEach(field => {
        console.log(`   - ${field.fieldName} (Severity: ${field.severity})`);
      });
      console.log('');
    }
  });

  // CORRECT LIST FROM USER
  const correctGapFields = {
    HEALTH: [
      'hasFunctionalClinic',
      'hasEmergencyServices', 
      'hasTrainedStaff',
      'hasMedicineSupply',
      'hasMedicalSupplies',
      'hasMaternalChildServices'
    ],
    WASH: [
      'isWaterSufficient',
      'hasCleanWaterAccess',
      'areLatrinesSufficient',
      'hasHandwashingFacilities',
      'hasOpenDefecationConcerns'
    ],
    SHELTER: [
      'areSheltersSufficient',
      'hasSafeStructures',
      'areOvercrowded',
      'provideWeatherProtection'
    ],
    FOOD: [
      'isFoodSufficient',
      'hasRegularMealAccess',
      'hasInfantNutrition'
    ],
    SECURITY: [
      'isSafeFromViolence',
      'gbvCasesReported',
      'hasSecurityPresence',
      'hasProtectionReportingMechanism',
      'vulnerableGroupsHaveAccess',
      'hasLighting'
    ]
  };

  console.log('🎯 CORRECT LIST (from requirements):');
  console.log('');
  
  Object.entries(correctGapFields).forEach(([type, fields]) => {
    console.log(`** ${type} (${fields.length} fields) **`);
    fields.forEach(field => {
      console.log(`   - ${field}`);
    });
    console.log('');
  });

  // COMPARE AND FIND DIFFERENCES
  console.log('🔍 ANALYSIS:');
  console.log('');

  const currentFieldsByType: Record<string, string[]> = {};
  currentGapFields.forEach(field => {
    if (!currentFieldsByType[field.assessmentType]) {
      currentFieldsByType[field.assessmentType] = [];
    }
    currentFieldsByType[field.assessmentType].push(field.fieldName);
  });

  const fieldsToRemove = [];
  const fieldsToAdd = [];

  Object.keys(correctGapFields).forEach(type => {
    const correctFields = correctGapFields[type];
    const currentFields = currentFieldsByType[type] || [];

    // Find fields to remove (in current but not in correct)
    correctFields.forEach(correctField => {
      if (!currentFields.includes(correctField)) {
        fieldsToAdd.push({ fieldName: correctField, assessmentType: type });
      }
    });

    // Find fields to add (in correct but not in current)
    currentFields.forEach(currentField => {
      if (!correctFields.includes(currentField)) {
        fieldsToRemove.push({ fieldName: currentField, assessmentType: type });
      }
    });
  });

  // Check for extra assessment types in current
  Object.keys(currentFieldsByType).forEach(type => {
    if (!correctGapFields[type]) {
      currentFieldsByType[type].forEach(fieldName => {
        fieldsToRemove.push({ fieldName, assessmentType: type });
      });
    }
  });

  console.log(`❌ Fields to REMOVE (${fieldsToRemove.length}):`);
  if (fieldsToRemove.length === 0) {
    console.log('   None - all current fields are correct!');
  } else {
    fieldsToRemove.forEach(({ fieldName, assessmentType }) => {
      console.log(`   - ${fieldName} (${assessmentType})`);
    });
  }
  console.log('');

  console.log(`➕ Fields to ADD (${fieldsToAdd.length}):`);
  if (fieldsToAdd.length === 0) {
    console.log('   None - all required fields exist!');
  } else {
    fieldsToAdd.forEach(({ fieldName, assessmentType }) => {
      console.log(`   - ${fieldName} (${assessmentType})`);
    });
  }
  console.log('');

  // GENERATE SQL UPDATES
  if (fieldsToRemove.length > 0 || fieldsToAdd.length > 0) {
    console.log('🔧 SQL COMMANDS TO FIX DATABASE:');
    console.log('');
    
    if (fieldsToRemove.length > 0) {
      console.log('-- Remove incorrect fields:');
      fieldsToRemove.forEach(({ fieldName, assessmentType }) => {
        console.log(`DELETE FROM "gap_field_severities" WHERE "field_name" = '${fieldName}' AND "assessment_type" = '${assessmentType}';`);
      });
      console.log('');
    }

    if (fieldsToAdd.length > 0) {
      console.log('-- Add missing fields (all with MEDIUM severity):');
      fieldsToAdd.forEach(({ fieldName, assessmentType }) => {
        const displayName = fieldName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        console.log(`INSERT INTO "gap_field_severities" ("field_name", "assessment_type", "severity", "display_name", "description", "is_active", "created_at", "updated_at")`);
        console.log(`VALUES ('${fieldName}', '${assessmentType}', 'MEDIUM', '${displayName}', 'Gap indicator for ${fieldName}', true, NOW(), NOW());`);
      });
    }
  } else {
    console.log('✅ Database is already correct! No changes needed.');
  }

  await prisma.$disconnect();
}

checkCurrentGapFields()
  .catch((e) => {
    console.error('❌ Error checking gap fields:', e);
    process.exit(1);
  });