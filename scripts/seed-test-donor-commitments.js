/**
 * Seed commitments for Test Donor Organization
 * Creates sample commitments so they show up in the donor dashboard
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedTestDonorCommitments() {
  try {
    console.log('📦 Seeding commitments for Test Donor Organization...');

    const donorId = 'donor-test-001';
    const today = new Date();
    
    // Create sample commitments with realistic data
    const commitments = [
      {
        id: 'commitment-test-001',
        donorId,
        entityId: 'entity-1', // Maiduguri Metropolitan
        incidentId: 'incident-flood-001', // Flood incident
        status: 'COMPLETE',
        items: {
          items: [
            { name: 'Emergency Food Supplies', unit: 'kilograms', quantity: 500 },
            { name: 'Clean Water', unit: 'liters', quantity: 1000 },
            { name: 'Medical Supplies', unit: 'kits', quantity: 50 }
          ]
        },
        totalCommittedQuantity: 1550,
        deliveredQuantity: 1450,
        verifiedDeliveredQuantity: 1400,
        totalValueEstimated: 15000.0,
        commitmentDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        lastUpdated: new Date(today.getTime() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
        notes: 'Emergency flood relief supplies for Maiduguri metropolitan area'
      },
      {
        id: 'commitment-test-002', 
        donorId,
        entityId: 'entity-2', // Jere Local Government
        incidentId: 'incident-flood-001', // Flood incident
        status: 'PARTIAL',
        items: {
          items: [
            { name: 'Shelter Materials', unit: 'units', quantity: 100 },
            { name: 'Blankets', unit: 'pieces', quantity: 200 },
            { name: 'Hygiene Kits', unit: 'kits', quantity: 75 }
          ]
        },
        totalCommittedQuantity: 375,
        deliveredQuantity: 280,
        verifiedDeliveredQuantity: 250,
        totalValueEstimated: 8500.0,
        commitmentDate: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
        lastUpdated: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        notes: 'Partial delivery due to logistics challenges'
      },
      {
        id: 'commitment-test-003',
        donorId,
        entityId: 'entity-3', // Gwoza Local Government
        incidentId: 'incident-drought-001', // Drought incident
        status: 'PLANNED',
        items: {
          items: [
            { name: 'Water Trucking Service', unit: 'liters', quantity: 5000 },
            { name: 'Drought-resistant Seeds', unit: 'kilograms', quantity: 200 },
            { name: 'Fertilizer', unit: 'bags', quantity: 50 }
          ]
        },
        totalCommittedQuantity: 5250,
        deliveredQuantity: 0,
        verifiedDeliveredQuantity: 0,
        totalValueEstimated: 12000.0,
        commitmentDate: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        lastUpdated: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        notes: 'Planned delivery for drought response in Gwoza'
      },
      {
        id: 'commitment-test-004',
        donorId,
        entityId: 'entity-4', // Primary Health Center
        incidentId: 'incident-flood-001', // Flood incident
        status: 'COMPLETE',
        items: {
          items: [
            { name: 'Medical Equipment', unit: 'units', quantity: 25 },
            { name: 'Pharmaceutical Supplies', unit: 'boxes', quantity: 40 },
            { name: 'Personal Protective Equipment', unit: 'sets', quantity: 100 }
          ]
        },
        totalCommittedQuantity: 165,
        deliveredQuantity: 165,
        verifiedDeliveredQuantity: 160,
        totalValueEstimated: 22000.0,
        commitmentDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        lastUpdated: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        notes: 'Critical medical supplies for health center during flood emergency'
      }
    ];

    // Insert commitments
    for (const commitment of commitments) {
      await prisma.donorCommitment.upsert({
        where: { id: commitment.id },
        update: commitment,
        create: commitment
      });
    }

    console.log(`✅ Successfully created ${commitments.length} commitments for Test Donor Organization`);

    // Update donor metrics
    const totalCommitted = commitments.reduce((sum, c) => sum + c.totalCommittedQuantity, 0);
    const totalDelivered = commitments.reduce((sum, c) => sum + c.deliveredQuantity, 0);
    const totalVerified = commitments.reduce((sum, c) => sum + c.verifiedDeliveredQuantity, 0);
    const totalValue = commitments.reduce((sum, c) => sum + (c.totalValueEstimated || 0), 0);
    
    const deliveryRate = totalCommitted > 0 ? (totalVerified / totalCommitted) * 100 : 0;
    const fulfillmentRate = commitments.filter(c => c.status === 'COMPLETE').length / commitments.length * 100;

    await prisma.donor.update({
      where: { id: donorId },
      data: {
        selfReportedDeliveryRate: deliveryRate,
        verifiedDeliveryRate: deliveryRate,
        leaderboardRank: 0 // Will be updated by leaderboard API
      }
    });

    console.log(`📊 Updated donor metrics:`);
    console.log(`   Total Commitments: ${commitments.length}`);
    console.log(`   Total Items: ${totalCommitted}`);
    console.log(`   Delivered Items: ${totalDelivered}`);
    console.log(`   Verified Items: ${totalVerified}`);
    console.log(`   Delivery Rate: ${deliveryRate.toFixed(2)}%`);
    console.log(`   Total Value: $${totalValue.toLocaleString()}`);

  } catch (error) {
    console.error('❌ Error seeding donor commitments:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedTestDonorCommitments();