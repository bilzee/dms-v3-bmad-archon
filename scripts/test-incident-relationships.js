#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testRelationships() {
  console.log('🔍 Testing new RapidAssessment → Incident relationships...');
  
  try {
    // Test 1: Get all assessments with their incidents
    const assessments = await prisma.rapidAssessment.findMany({
      include: {
        incident: {
          select: { id: true, type: true, description: true }
        },
        entity: {
          select: { id: true, name: true }
        }
      }
    });
    
    console.log(`📊 Found ${assessments.length} assessments with incident relationships:`);
    assessments.forEach(a => {
      console.log(`   - ${a.rapidAssessmentType} for ${a.entity.name} → ${a.incident.type} (${a.incident.id})`);
    });
    
    // Test 2: Get population impact for flood incident
    const floodPopulation = await prisma.populationAssessment.findMany({
      where: {
        rapidAssessment: {
          incidentId: 'incident-flood-001'
        }
      },
      include: {
        rapidAssessment: {
          select: {
            rapidAssessmentType: true,
            entity: { select: { name: true } }
          }
        }
      }
    });
    
    const totalPopulation = floodPopulation.reduce((sum, p) => sum + (p.totalPopulation || 0), 0);
    console.log(`🌊 Flood incident population impact: ${totalPopulation} people across ${floodPopulation.length} assessments`);
    
    // Test 3: Get population impact for drought incident  
    const droughtPopulation = await prisma.populationAssessment.findMany({
      where: {
        rapidAssessment: {
          incidentId: 'incident-drought-001'
        }
      }
    });
    
    const droughtTotal = droughtPopulation.reduce((sum, p) => sum + (p.totalPopulation || 0), 0);
    console.log(`🌵 Drought incident population impact: ${droughtTotal} people across ${droughtPopulation.length} assessments`);
    
    console.log('✅ Relationship testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRelationships();