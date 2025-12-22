/**
 * Update Gap Field Names to Match Assessment Fields
 * 
 * This script updates the gap field names in the database to match the actual
 * assessment field names, eliminating the need for field name mapping.
 */

import { PrismaClient, AssessmentType, Priority } from '@prisma/client'

const prisma = new PrismaClient()

// Mapping from current database field names to assessment field names
const fieldNameMappings = {
  HEALTH: [
    { oldName: 'healthFacilityCapacity', newName: 'hasFunctionalClinic', displayName: 'Functional Clinic' },
    { oldName: 'emergencySupplies', newName: 'hasEmergencyServices', displayName: 'Emergency Services' },
    { oldName: 'medicalStaffAvailable', newName: 'hasTrainedStaff', displayName: 'Trained Staff' },
    { oldName: 'medicineSupply', newName: 'hasMedicineSupply', displayName: 'Medicine Supply' },
    { oldName: 'diseaseSurveillance', newName: 'hasMedicalSupplies', displayName: 'Medical Supplies' }
  ],
  FOOD: [
    { oldName: 'foodStockAvailability', newName: 'isFoodSufficient', displayName: 'Food Sufficiency' },
    { oldName: 'distributionNetwork', newName: 'hasRegularMealAccess', displayName: 'Regular Meal Access' },
    { oldName: 'nutritionalSupport', newName: 'hasInfantNutrition', displayName: 'Infant Nutrition' }
  ],
  WASH: [
    { oldName: 'cleanWaterAccess', newName: 'hasCleanWaterAccess', displayName: 'Clean Water Access' },
    { oldName: 'sanitationFacilities', newName: 'areLatrinesSufficient', displayName: 'Sufficient Latrines' },
    { oldName: 'hygieneSupplies', newName: 'hasHandwashingFacilities', displayName: 'Handwashing Facilities' }
  ],
  SHELTER: [
    { oldName: 'emergencyShelter', newName: 'areSheltersSufficient', displayName: 'Sufficient Shelters' },
    { oldName: 'weatherProtection', newName: 'provideWeatherProtection', displayName: 'Weather Protection' },
    { oldName: 'shelterMaterials', newName: 'hasSafeStructures', displayName: 'Safe Structures' }
  ],
  SECURITY: [
    { oldName: 'securityPersonnel', newName: 'hasSecurityPresence', displayName: 'Security Presence' },
    { oldName: 'protectiveServices', newName: 'isSafeFromViolence', displayName: 'Safe from Violence' },
    { oldName: 'communicationSystems', newName: 'hasProtectionReportingMechanism', displayName: 'Protection Reporting' }
  ]
}

async function updateGapFieldNames() {
  console.log('🔄 Starting gap field name updates...')

  try {
    let totalUpdated = 0

    for (const [assessmentType, mappings] of Object.entries(fieldNameMappings)) {
      console.log(`\n📊 Updating ${assessmentType} fields...`)
      
      for (const mapping of mappings) {
        // Find existing record
        const existing = await prisma.gapFieldSeverity.findFirst({
          where: {
            assessmentType: assessmentType as AssessmentType,
            fieldName: mapping.oldName
          }
        })

        if (existing) {
          // Update the existing record
          await prisma.gapFieldSeverity.update({
            where: { id: existing.id },
            data: {
              fieldName: mapping.newName,
              displayName: mapping.displayName
            }
          })
          
          console.log(`✅ Updated: ${mapping.oldName} → ${mapping.newName}`)
          totalUpdated++
        } else {
          // Create new record if it doesn't exist
          await prisma.gapFieldSeverity.create({
            data: {
              fieldName: mapping.newName,
              assessmentType: assessmentType as AssessmentType,
              displayName: mapping.displayName,
              severity: Priority.MEDIUM, // Default severity
              isActive: true
            }
          })
          
          console.log(`➕ Created: ${mapping.newName}`)
          totalUpdated++
        }
      }
    }

    console.log(`\n🎉 Gap field name updates completed successfully!`)
    console.log(`📈 Total records updated/created: ${totalUpdated}`)

    // Display summary by assessment type
    const summary = await prisma.gapFieldSeverity.groupBy({
      by: ['assessmentType'],
      _count: true
    })

    console.log('\n📊 Current gap fields by assessment type:')
    summary.forEach(item => {
      console.log(`   ${item.assessmentType}: ${item._count} fields`)
    })

  } catch (error) {
    console.error('❌ Error updating gap field names:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the update function
updateGapFieldNames()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })