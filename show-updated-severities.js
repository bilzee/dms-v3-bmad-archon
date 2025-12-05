/**
 * Script to display updated gap field severities
 */

const { PrismaClient } = require('@prisma/client');

async function showUpdatedFields() {
  const prisma = new PrismaClient();
  
  try {
    const fields = await prisma.gapFieldSeverity.findMany({
      where: { isActive: true },
      select: { 
        id: true, 
        fieldName: true, 
        assessmentType: true, 
        severity: true, 
        displayName: true 
      }
    });
    
    console.log('🔴 UPDATED GAP FIELD SEVERITY TABLES');
    console.log('=====================================\n');
    
    // Group by assessment type
    const grouped = {};
    fields.forEach(field => {
      if (!grouped[field.assessmentType]) {
        grouped[field.assessmentType] = [];
      }
      grouped[field.assessmentType].push(field);
    });
    
    // Display by assessment type
    Object.entries(grouped).forEach(([type, typeFields]) => {
      console.log(`📋 ${type} Assessment (${typeFields.length} fields):`);
      console.log('─'.repeat(50));
      typeFields.forEach(field => {
        const icon = field.severity === 'CRITICAL' ? '🔴' : 
                     field.severity === 'HIGH' ? '🟠' : '🟡';
        console.log(`${icon} | ${field.displayName.padEnd(25)} | ${field.severity.padEnd(8)} |`);
        console.log(`   | Field: ${field.fieldName.padEnd(25)} |`);
        console.log('─'.repeat(50));
      });
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

showUpdatedFields();