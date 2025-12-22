/**
 * Fix Mental Health Field Name
 * 
 * Update "Mental Health Support Services" to "Maternal and Child Services" 
 */

import { PrismaClient, AssessmentType, Priority } from '@prisma/client'

const prisma = new PrismaClient()

async function fixMentalHealthField() {
  console.log('🔄 Fixing Mental Health field name...')

  try {
    // Find the field with "mentalHealthServices" or similar
    const mentalHealthField = await prisma.gapFieldSeverity.findFirst({
      where: {
        assessmentType: AssessmentType.HEALTH,
        fieldName: { contains: 'mental', mode: 'insensitive' }
      }
    })

    if (mentalHealthField) {
      console.log(`Found field: ${mentalHealthField.fieldName} (${mentalHealthField.displayName})`)
      
      // Update to match the actual assessment field
      await prisma.gapFieldSeverity.update({
        where: { id: mentalHealthField.id },
        data: {
          fieldName: 'hasMaternalChildServices',
          displayName: 'Maternal and Child Services',
          description: 'Availability of maternal and child health services including prenatal care, deliveries, and pediatric care'
        }
      })
      
      console.log(`✅ Updated: ${mentalHealthField.fieldName} → hasMaternalChildServices`)
      console.log(`✅ Updated display name: ${mentalHealthField.displayName} → Maternal and Child Services`)
    } else {
      console.log('❌ No mental health field found. Creating new Maternal and Child Services field...')
      
      // Create the field if it doesn't exist
      await prisma.gapFieldSeverity.create({
        data: {
          fieldName: 'hasMaternalChildServices',
          assessmentType: AssessmentType.HEALTH,
          displayName: 'Maternal and Child Services',
          description: 'Availability of maternal and child health services including prenatal care, deliveries, and pediatric care',
          severity: Priority.MEDIUM,
          isActive: true
        }
      })
      
      console.log('✅ Created new field: hasMaternalChildServices')
    }

    console.log('\n🎉 Field update completed successfully!')

  } catch (error) {
    console.error('❌ Error updating field:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the fix
fixMentalHealthField()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })