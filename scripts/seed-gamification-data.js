/**
 * Seed performance data for Story 5.3 gamification features
 * Creates realistic donor commitments, deliveries, and performance metrics
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedGamificationData() {
  try {
    console.log('🎮 Starting gamification data seeding...');

    // Get existing users and entities
    const users = await prisma.user.findMany({
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    const entities = await prisma.entity.findMany();
    const incidents = await prisma.incident.findMany();

    console.log(`📊 Found ${users.length} users, ${entities.length} entities, ${incidents.length} incidents`);

    // Get or create donors
    let donors = await prisma.donor.findMany();
    if (donors.length === 0) {
      console.log('🏢 Creating donor records...');
      const donorData = [
        {
          id: 'donor-high-performer-001',
          name: 'Red Cross Nigeria',
          type: 'ORGANIZATION',
          contactEmail: 'nigeria@redcross.org',
          contactPhone: '+234-800-733-7277',
          organization: 'International Red Cross',
          isActive: true,
          selfReportedDeliveryRate: 95.0,
          verifiedDeliveryRate: 92.0,
          leaderboardRank: 1
        },
        {
          id: 'donor-consistent-001',
          name: 'UNICEF Nigeria',
          type: 'ORGANIZATION',
          contactEmail: 'nigeria@unicef.org',
          contactPhone: '+234-800-864-2337',
          organization: 'United Nations',
          isActive: true,
          selfReportedDeliveryRate: 88.0,
          verifiedDeliveryRate: 85.0,
          leaderboardRank: 2
        },
        {
          id: 'donor-quick-response-001',
          name: 'Doctors Without Borders',
          type: 'ORGANIZATION',
          contactEmail: 'nigeria@msf.org',
          contactPhone: '+234-800-673-7277',
          organization: 'Médecins Sans Frontières',
          isActive: true,
          selfReportedDeliveryRate: 91.0,
          verifiedDeliveryRate: 89.0,
          leaderboardRank: 3
        },
        {
          id: 'donor-high-volume-001',
          name: 'World Food Programme',
          type: 'ORGANIZATION',
          contactEmail: 'nigeria@wfp.org',
          contactPhone: '+234-800-937-9277',
          organization: 'United Nations',
          isActive: true,
          selfReportedDeliveryRate: 87.0,
          verifiedDeliveryRate: 83.0,
          leaderboardRank: 4
        },
        {
          id: 'donor-mid-tier-001',
          name: 'CARE International Nigeria',
          type: 'ORGANIZATION',
          contactEmail: 'nigeria@care.org',
          contactPhone: '+234-800-227-3737',
          organization: 'CARE International',
          isActive: true,
          selfReportedDeliveryRate: 79.0,
          verifiedDeliveryRate: 76.0,
          leaderboardRank: 5
        },
        {
          id: 'donor-emerging-001',
          name: 'Save the Children Nigeria',
          type: 'ORGANIZATION',
          contactEmail: 'nigeria@savethechildren.org',
          contactPhone: '+234-800-728-3744',
          organization: 'Save the Children',
          isActive: true,
          selfReportedDeliveryRate: 72.0,
          verifiedDeliveryRate: 68.0,
          leaderboardRank: 6
        },
        {
          id: 'donor-steady-001',
          name: 'ActionAid Nigeria',
          type: 'ORGANIZATION',
          contactEmail: 'nigeria@actionaid.org',
          contactPhone: '+234-800-228-2437',
          organization: 'ActionAid International',
          isActive: true,
          selfReportedDeliveryRate: 75.0,
          verifiedDeliveryRate: 71.0,
          leaderboardRank: 7
        },
        {
          id: 'donor-startup-001',
          name: 'Local Relief Initiative',
          type: 'ORGANIZATION',
          contactEmail: 'info@localrelief.ng',
          contactPhone: '+234-801-234-5678',
          organization: 'Local Relief Initiative',
          isActive: true,
          selfReportedDeliveryRate: 65.0,
          verifiedDeliveryRate: 61.0,
          leaderboardRank: 8
        }
      ];

      for (const donor of donorData) {
        await prisma.donor.create({
          data: donor
        });
      }
    }

    donors = await prisma.donor.findMany();
    console.log(`🏢 Working with ${donors.length} donors`);

    // Create realistic commitment and delivery data for the past 6 months
    console.log('💰 Creating commitment and delivery data...');
    const now = new Date();
    const sixMonthsAgo = new Date(now.getTime() - (6 * 30 * 24 * 60 * 60 * 1000));

    for (const donor of donors) {
      const performanceProfile = getPerformanceProfile(donor.leaderboardRank);
      const commitmentsCount = Math.floor(performanceProfile.volumeMultiplier * (Math.random() * 30 + 20));
      
      console.log(`📊 Creating ${commitmentsCount} commitments for ${donor.name}...`);

      for (let i = 0; i < commitmentsCount; i++) {
        const commitmentDate = new Date(
          sixMonthsAgo.getTime() + Math.random() * (now.getTime() - sixMonthsAgo.getTime())
        );

        // Get random entity and incident
        const selectedEntity = entities[Math.floor(Math.random() * entities.length)];
        const selectedIncident = incidents[Math.floor(Math.random() * incidents.length)] || incidents[0];

        // Calculate commitment characteristics
        const shouldDeliver = Math.random() < performanceProfile.deliveryReliability;
        const deliveryRatio = performanceProfile.deliveryRatio + (Math.random() - 0.5) * 0.2;
        
        // Commitment value based on donor profile
        const commitmentValue = Math.floor(
          performanceProfile.valueMultiplier * (Math.random() * 50000 + 10000)
        );

        // Create realistic items
        const itemCategories = [
          { name: 'Emergency Food Rations', unit: 'packages', baseQty: 100 },
          { name: 'Clean Water', unit: 'liters', baseQty: 1000 },
          { name: 'Medical Supplies', unit: 'kits', baseQty: 50 },
          { name: 'Shelter Kits', unit: 'sets', baseQty: 25 },
          { name: 'Hygiene Kits', unit: 'packages', baseQty: 200 },
          { name: 'Blankets', unit: 'pieces', baseQty: 100 }
        ];

        const selectedItem = itemCategories[Math.floor(Math.random() * itemCategories.length)];
        const committedQuantity = Math.floor(
          selectedItem.baseQty * (Math.random() * 2 + 0.5) * performanceProfile.volumeMultiplier
        );

        const totalValue = commitmentValue * (committedQuantity / selectedItem.baseQty);

        let status = 'PLANNED';
        let deliveredQuantity = 0;
        let verifiedDeliveredQuantity = 0;

        if (shouldDeliver) {
          deliveredQuantity = Math.floor(committedQuantity * deliveryRatio);
          verifiedDeliveredQuantity = Math.floor(deliveredQuantity * 0.95); // 5% verification loss

          if (deliveredQuantity === committedQuantity) {
            status = 'COMPLETE';
          } else if (deliveredQuantity > 0) {
            status = 'PARTIAL';
          }

          // Add some delivery delay variation
          const deliveryDelay = Math.floor(Math.random() * 7) + 1; // 1-7 days
          const commitmentLastUpdated = new Date(
            commitmentDate.getTime() + (deliveryDelay * 24 * 60 * 60 * 1000)
          );
        } else {
          // Incomplete commitments - no delivery
          const commitmentLastUpdated = new Date(
            commitmentDate.getTime() + Math.random() * (now.getTime() - commitmentDate.getTime())
          );
        }

        const commitmentLastUpdated = shouldDeliver 
          ? new Date(
              commitmentDate.getTime() + (Math.floor(Math.random() * 30) + 5) * 24 * 60 * 60 * 1000
            )
          : new Date(
              commitmentDate.getTime() + Math.random() * (now.getTime() - commitmentDate.getTime())
            );

        await prisma.donorCommitment.upsert({
          where: {
            id: `commitment-${donor.id}-${Date.now()}-${i}`
          },
          update: {},
          create: {
            id: `commitment-${donor.id}-${Date.now()}-${i}`,
            donorId: donor.id,
            entityId: selectedEntity.id,
            incidentId: selectedIncident.id,
            status,
            items: [{
              name: selectedItem.name,
              unit: selectedItem.unit,
              quantity: committedQuantity,
              description: `Emergency ${selectedItem.name.toLowerCase()} for disaster response`
            }],
            totalCommittedQuantity: committedQuantity,
            deliveredQuantity,
            verifiedDeliveredQuantity,
            totalValueEstimated: totalValue,
            commitmentDate,
            lastUpdated: commitmentLastUpdated,
            notes: status === 'COMPLETE' ? 'Successfully delivered and verified' : 
                   status === 'PARTIAL' ? `Partially delivered: ${deliveredQuantity}/${committedQuantity} units` :
                   'Commitment planned but not yet delivered'
          }
        });
      }

      // Skip rapid response creation for now - focus on commitments for gamification
      console.log(`⏭️ Skipping rapid response creation for ${donor.name} (focus on commitments)`);
    }

    // Update donor metrics based on created data
    console.log('📈 Updating donor metrics...');
    const updatedDonors = await prisma.donor.findMany({
      include: {
        commitments: true
      }
    });

    for (const donor of updatedDonors) {
      const commitments = donor.commitments;

      const totalCommitments = commitments.length;
      const completedCommitments = commitments.filter(c => c.status === 'COMPLETE').length;
      const totalCommittedItems = commitments.reduce((sum, c) => sum + c.totalCommittedQuantity, 0);
      const totalDeliveredItems = commitments.reduce((sum, c) => sum + c.deliveredQuantity, 0);
      const totalVerifiedItems = commitments.reduce((sum, c) => sum + c.verifiedDeliveredQuantity, 0);

      const selfReportedDeliveryRate = totalCommittedItems > 0 ? (totalDeliveredItems / totalCommittedItems) * 100 : 0;
      const verifiedDeliveryRate = totalCommittedItems > 0 ? (totalVerifiedItems / totalCommittedItems) * 100 : 0;

      await prisma.donor.update({
        where: { id: donor.id },
        data: {
          selfReportedDeliveryRate: Math.round(selfReportedDeliveryRate * 100) / 100,
          verifiedDeliveryRate: Math.round(verifiedDeliveryRate * 100) / 100
        }
      });
    }

    console.log('✅ Gamification data seeding completed successfully!');
    console.log('📊 Performance Summary:');
    
    const summaryDonors = await prisma.donor.findMany({
      select: {
        name: true,
        verifiedDeliveryRate: true,
        leaderboardRank: true,
        commitments: {
          select: { id: true, status: true, totalValueEstimated: true }
        }
      }
    });

    summaryDonors.forEach(donor => {
      const completedCommitments = donor.commitments.filter(c => c.status === 'COMPLETE').length;
      const totalValue = donor.commitments.reduce((sum, c) => sum + (c.totalValueEstimated || 0), 0);
      
      console.log(`🏆 ${donor.name}:`);
      console.log(`   📈 Delivery Rate: ${donor.verifiedDeliveryRate.toFixed(1)}%`);
      console.log(`   🎯 Rank: #${donor.leaderboardRank}`);
      console.log(`   💰 Commitments: ${donor.commitments.length} (${completedCommitments} completed)`);
      console.log(`   💵 Total Value: $${totalValue.toLocaleString()}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error seeding gamification data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function getPerformanceProfile(rank) {
  const profiles = {
    1: { // Top performer
      deliveryReliability: 0.95,
      deliveryRatio: 0.98,
      volumeMultiplier: 2.5,
      valueMultiplier: 3.0,
      avgResponseTime: 6
    },
    2: { // Consistent performer
      deliveryReliability: 0.90,
      deliveryRatio: 0.92,
      volumeMultiplier: 2.0,
      valueMultiplier: 2.5,
      avgResponseTime: 8
    },
    3: { // Quick responder
      deliveryReliability: 0.88,
      deliveryRatio: 0.90,
      volumeMultiplier: 1.8,
      valueMultiplier: 2.0,
      avgResponseTime: 5
    },
    4: { // High volume
      deliveryReliability: 0.85,
      deliveryRatio: 0.87,
      volumeMultiplier: 3.0,
      valueMultiplier: 2.2,
      avgResponseTime: 12
    },
    5: { // Mid-tier
      deliveryReliability: 0.80,
      deliveryRatio: 0.82,
      volumeMultiplier: 1.5,
      valueMultiplier: 1.5,
      avgResponseTime: 18
    },
    6: { // Emerging performer
      deliveryReliability: 0.75,
      deliveryRatio: 0.78,
      volumeMultiplier: 1.2,
      valueMultiplier: 1.2,
      avgResponseTime: 24
    },
    7: { // Steady performer
      deliveryReliability: 0.78,
      deliveryRatio: 0.80,
      volumeMultiplier: 1.3,
      valueMultiplier: 1.3,
      avgResponseTime: 20
    },
    8: { // Startup/learning
      deliveryReliability: 0.65,
      deliveryRatio: 0.70,
      volumeMultiplier: 0.8,
      valueMultiplier: 0.8,
      avgResponseTime: 36
    }
  };

  return profiles[rank] || profiles[8]; // Default to startup profile
}

// Run the seeding function
if (require.main === module) {
  seedGamificationData()
    .then(() => {
      console.log('🎉 Gamification data seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedGamificationData };