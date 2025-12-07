/**
 * Seed Gap Field Severities
 * 
 * This script creates sample gap field severity data for testing the gap field management page.
 * It creates realistic gap fields for each of the 5 assessment types: HEALTH, FOOD, WASH, SHELTER, SECURITY.
 */

import { PrismaClient, AssessmentType, Priority } from '@prisma/client'

const prisma = new PrismaClient()

const gapFieldData = [
  // HEALTH Assessment Gap Fields
  {
    fieldName: 'medicalStaffAvailable',
    assessmentType: AssessmentType.HEALTH,
    severity: Priority.HIGH,
    displayName: 'Medical Staff Availability',
    description: 'Number of qualified medical personnel available for emergency response'
  },
  {
    fieldName: 'emergencySupplies',
    assessmentType: AssessmentType.HEALTH,
    severity: Priority.CRITICAL,
    displayName: 'Emergency Medical Supplies',
    description: 'Availability of essential medical supplies including first aid, medications, and equipment'
  },
  {
    fieldName: 'healthFacilityCapacity',
    assessmentType: AssessmentType.HEALTH,
    severity: Priority.HIGH,
    displayName: 'Health Facility Capacity',
    description: 'Current capacity of medical facilities to handle patients and emergencies'
  },
  {
    fieldName: 'diseaseSurveillance',
    assessmentType: AssessmentType.HEALTH,
    severity: Priority.MEDIUM,
    displayName: 'Disease Surveillance System',
    description: 'System for monitoring and tracking disease outbreaks and public health threats'
  },
  {
    fieldName: 'mentalHealthServices',
    assessmentType: AssessmentType.HEALTH,
    severity: Priority.MEDIUM,
    displayName: 'Mental Health Support Services',
    description: 'Availability of mental health and psychological support services'
  },

  // FOOD Assessment Gap Fields
  {
    fieldName: 'foodStockAvailability',
    assessmentType: AssessmentType.FOOD,
    severity: Priority.CRITICAL,
    displayName: 'Food Stock Availability',
    description: 'Current levels of food supplies available for distribution to affected populations'
  },
  {
    fieldName: 'distributionNetwork',
    assessmentType: AssessmentType.FOOD,
    severity: Priority.HIGH,
    displayName: 'Food Distribution Network',
    description: 'Capacity and reach of food distribution systems and logistics'
  },
  {
    fieldName: 'nutritionalSupport',
    assessmentType: AssessmentType.FOOD,
    severity: Priority.MEDIUM,
    displayName: 'Nutritional Support Programs',
    description: 'Programs providing specialized nutritional support for vulnerable groups'
  },
  {
    fieldName: 'foodStorageCapacity',
    assessmentType: AssessmentType.FOOD,
    severity: Priority.MEDIUM,
    displayName: 'Food Storage Capacity',
    description: 'Available storage facilities for preserving and maintaining food supplies'
  },
  {
    fieldName: 'cookingFacilities',
    assessmentType: AssessmentType.FOOD,
    severity: Priority.LOW,
    displayName: 'Cooking and Food Preparation Facilities',
    description: 'Access to facilities for cooking and food preparation in affected areas'
  },

  // WASH Assessment Gap Fields
  {
    fieldName: 'cleanWaterAccess',
    assessmentType: AssessmentType.WASH,
    severity: Priority.CRITICAL,
    displayName: 'Clean Water Access',
    description: 'Availability of safe, clean drinking water for affected populations'
  },
  {
    fieldName: 'sanitationFacilities',
    assessmentType: AssessmentType.WASH,
    severity: Priority.HIGH,
    displayName: 'Sanitation Facilities',
    description: 'Availability and condition of toilets, latrines, and other sanitation facilities'
  },
  {
    fieldName: 'hygieneSupplies',
    assessmentType: AssessmentType.WASH,
    severity: Priority.HIGH,
    displayName: 'Hygiene Supplies Availability',
    description: 'Availability of soap, sanitizers, and other hygiene supplies'
  },
  {
    fieldName: 'wasteManagement',
    assessmentType: AssessmentType.WASH,
    severity: Priority.MEDIUM,
    displayName: 'Waste Management Systems',
    description: 'Systems for collecting and disposing of solid and liquid waste'
  },
  {
    fieldName: 'waterTreatment',
    assessmentType: AssessmentType.WASH,
    severity: Priority.MEDIUM,
    displayName: 'Water Treatment Capacity',
    description: 'Capacity to treat and purify water sources for safe consumption'
  },

  // SHELTER Assessment Gap Fields
  {
    fieldName: 'emergencyShelter',
    assessmentType: AssessmentType.SHELTER,
    severity: Priority.CRITICAL,
    displayName: 'Emergency Shelter Capacity',
    description: 'Available emergency housing and shelter spaces for displaced populations'
  },
  {
    fieldName: 'weatherProtection',
    assessmentType: AssessmentType.SHELTER,
    severity: Priority.HIGH,
    displayName: 'Weather Protection',
    description: 'Adequate protection from extreme weather conditions and environmental hazards'
  },
  {
    fieldName: 'shelterMaterials',
    assessmentType: AssessmentType.SHELTER,
    severity: Priority.HIGH,
    displayName: 'Shelter Materials and Supplies',
    description: 'Availability of construction materials, tarps, tents, and other shelter supplies'
  },
  {
    fieldName: 'housingStructures',
    assessmentType: AssessmentType.SHELTER,
    severity: Priority.MEDIUM,
    displayName: 'Permanent Housing Structures',
    description: 'Condition and availability of permanent housing for affected populations'
  },
  {
    fieldName: 'campManagement',
    assessmentType: AssessmentType.SHELTER,
    severity: Priority.MEDIUM,
    displayName: 'Temporary Camp Management',
    description: 'Capacity to manage temporary shelter camps and settlements'
  },

  // SECURITY Assessment Gap Fields
  {
    fieldName: 'securityPersonnel',
    assessmentType: AssessmentType.SECURITY,
    severity: Priority.HIGH,
    displayName: 'Security Personnel Availability',
    description: 'Number of security personnel available for protection and crowd control'
  },
  {
    fieldName: 'protectiveServices',
    assessmentType: AssessmentType.SECURITY,
    severity: Priority.CRITICAL,
    displayName: 'Protective Services',
    description: 'Emergency response and protective services for vulnerable populations'
  },
  {
    fieldName: 'communicationSystems',
    assessmentType: AssessmentType.SECURITY,
    severity: Priority.HIGH,
    displayName: 'Emergency Communication Systems',
    description: 'Communication infrastructure for coordinating security responses'
  },
  {
    fieldName: 'evacuationRoutes',
    assessmentType: AssessmentType.SECURITY,
    severity: Priority.MEDIUM,
    displayName: 'Evacuation Routes and Planning',
    description: 'Prepared evacuation routes and emergency exit planning'
  },
  {
    fieldName: 'vulnerabilityAssessment',
    assessmentType: AssessmentType.SECURITY,
    severity: Priority.MEDIUM,
    displayName: 'Vulnerability Assessment',
    description: 'Assessment of vulnerable populations and protection requirements'
  }
]

async function seedGapFields() {
  console.log('🌱 Starting gap field severity seeding...')

  try {
    // Clear existing data (optional - comment out if you want to preserve existing data)
    console.log('🗑️  Clearing existing gap field data...')
    await prisma.gapFieldSeverity.deleteMany()
    console.log('✅ Cleared existing gap field data')

    // Insert gap field data
    console.log('📊 Inserting gap field severity data...')
    
    for (const gapField of gapFieldData) {
      await prisma.gapFieldSeverity.create({
        data: gapField
      })
      console.log(`✅ Created: ${gapField.displayName} (${gapField.assessmentType})`)
    }

    console.log('\n🎉 Gap field severity seeding completed successfully!')
    console.log(`📈 Created ${gapFieldData.length} gap field records`)

    // Summary by assessment type
    const summary = gapFieldData.reduce((acc, field) => {
      acc[field.assessmentType] = (acc[field.assessmentType] || 0) + 1
      return acc
    }, {} as Record<AssessmentType, number>)

    console.log('\n📊 Summary by assessment type:')
    Object.entries(summary).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} gap fields`)
    })

  } catch (error) {
    console.error('❌ Error seeding gap field data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seeding function
seedGapFields()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })