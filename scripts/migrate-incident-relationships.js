#!/usr/bin/env node

/**
 * Migration Script: Populate incidentId in RapidAssessment
 * 
 * This script migrates the relationship structure from:
 * Incident → IncidentEntity ← Entity
 * 
 * To:
 * Incident → RapidAssessment → Entity
 * 
 * It populates the new incidentId field in RapidAssessment based on
 * existing IncidentEntity relationships.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting migration: Populate incidentId in RapidAssessment...');

  try {
    // Step 1: Get all existing RapidAssessment records without incidentId
    const assessments = await prisma.rapidAssessment.findMany({
      where: {
        incidentId: null,
      },
      select: {
        id: true,
        entityId: true,
        rapidAssessmentDate: true,
        rapidAssessmentType: true,
      },
    });

    console.log(`📊 Found ${assessments.length} assessments to migrate`);

    // Step 2: Get all IncidentEntity relationships
    const incidentEntities = await prisma.incidentEntity.findMany({
      select: {
        incidentId: true,
        entityId: true,
        affectedAt: true,
      },
    });

    console.log(`🔗 Found ${incidentEntities.length} incident-entity relationships`);

    // Step 3: Create a mapping from entityId to incidentId
    const entityToIncidentMap = new Map();
    
    incidentEntities.forEach(ie => {
      if (!entityToIncidentMap.has(ie.entityId)) {
        entityToIncidentMap.set(ie.entityId, []);
      }
      entityToIncidentMap.get(ie.entityId).push({
        incidentId: ie.incidentId,
        affectedAt: ie.affectedAt,
      });
    });

    console.log(`📍 Created mapping for ${entityToIncidentMap.size} entities`);

    // Step 4: Migrate assessments
    let migratedCount = 0;
    let skippedCount = 0;

    for (const assessment of assessments) {
      const incidents = entityToIncidentMap.get(assessment.entityId);
      
      if (!incidents || incidents.length === 0) {
        console.log(`⚠️  No incident found for entity ${assessment.entityId}, assessment ${assessment.id}`);
        skippedCount++;
        continue;
      }

      // If multiple incidents for an entity, choose the one closest to assessment date
      let selectedIncident = incidents[0];
      if (incidents.length > 1) {
        selectedIncident = incidents.reduce((closest, current) => {
          const closestDiff = Math.abs(new Date(assessment.rapidAssessmentDate).getTime() - new Date(closest.affectedAt).getTime());
          const currentDiff = Math.abs(new Date(assessment.rapidAssessmentDate).getTime() - new Date(current.affectedAt).getTime());
          return currentDiff < closestDiff ? current : closest;
        });
        
        console.log(`📅 Multiple incidents for entity ${assessment.entityId}, selected incident ${selectedIncident.incidentId} (closest date)`);
      }

      // Update the assessment with incidentId
      try {
        await prisma.rapidAssessment.update({
          where: { id: assessment.id },
          data: { incidentId: selectedIncident.incidentId },
        });

        migratedCount++;
        console.log(`✅ Migrated assessment ${assessment.id} (${assessment.rapidAssessmentType}) → incident ${selectedIncident.incidentId}`);
      } catch (error) {
        console.error(`❌ Failed to migrate assessment ${assessment.id}:`, error.message);
        skippedCount++;
      }
    }

    // Step 5: Verify migration
    const verificationCount = await prisma.rapidAssessment.count({
      where: {
        incidentId: { not: null },
      },
    });

    const remainingNulls = await prisma.rapidAssessment.count({
      where: {
        incidentId: null,
      },
    });

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successfully migrated: ${migratedCount} assessments`);
    console.log(`⚠️  Skipped: ${skippedCount} assessments`);
    console.log(`🔍 Assessments with incidentId: ${verificationCount}`);
    console.log(`🔍 Assessments without incidentId: ${remainingNulls}`);

    if (remainingNulls > 0) {
      console.log('\n⚠️  WARNING: Some assessments still have null incidentId.');
      console.log('   This means they have no corresponding IncidentEntity relationship.');
      console.log('   You may need to manually assign these to incidents or delete them.');
      
      const orphanedAssessments = await prisma.rapidAssessment.findMany({
        where: { incidentId: null },
        select: {
          id: true,
          entityId: true,
          rapidAssessmentType: true,
          rapidAssessmentDate: true,
          entity: {
            select: {
              name: true,
            },
          },
        },
      });

      console.log('\n🔍 Orphaned assessments:');
      orphanedAssessments.forEach(assessment => {
        console.log(`   - ${assessment.id}: ${assessment.rapidAssessmentType} for ${assessment.entity.name} (${assessment.rapidAssessmentDate})`);
      });
    }

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Migration script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });