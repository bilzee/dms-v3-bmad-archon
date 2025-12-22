/**
 * Create donor user accounts for CARE International and UN OCHA
 * This script creates user accounts that will be linked to donor organizations
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createDonorUsers() {
  try {
    console.log('👥 Creating donor user accounts...');

    // Get roles
    const donorRole = await prisma.role.findFirst({
      where: { name: 'DONOR' }
    });

    if (!donorRole) {
      throw new Error('DONOR role not found');
    }

    console.log(`✅ Found DONOR role: ${donorRole.id}`);

    // Users to create
    const users = [
      {
        email: 'nigeria@careinternational.org',
        username: 'care-nigeria',
        name: 'CARE International Nigeria',
        phone: '+234-800-123-4567',
        organization: 'CARE International Nigeria',
        password: 'care123456', // Will be hashed
        donorOrganization: 'CARE International Nigeria'
      },
      {
        email: 'ocha.nigeria@un.org',
        username: 'ocha-nigeria',
        name: 'UN OCHA Nigeria',
        phone: '+234-800-987-6543',
        organization: 'United Nations Office for the Coordination of Humanitarian Affairs',
        password: 'ocha123456', // Will be hashed
        donorOrganization: 'United Nations Office for the Coordination of Humanitarian Affairs'
      }
    ];

    for (const userData of users) {
      console.log(`\n🔧 Creating user: ${userData.email}`);

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: { email: userData.email }
      });

      if (existingUser) {
        console.log(`⚠️  User ${userData.email} already exists, skipping...`);
        continue;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          username: userData.username,
          name: userData.name,
          phone: userData.phone,
          organization: userData.organization,
          passwordHash,
          isActive: true,
          isLocked: false
        }
      });

      // Assign DONOR role
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: donorRole.id,
          assignedBy: 'system-seed-script'
        }
      });

      console.log(`✅ Created user: ${user.email} (ID: ${user.id})`);
      
      // Verify donor linkage
      const donor = await prisma.donor.findFirst({
        where: {
          OR: [
            { contactEmail: userData.email },
            { organization: userData.organization }
          ]
        }
      });

      if (donor) {
        console.log(`🔗 Found donor organization: ${donor.name} (ID: ${donor.id})`);
        console.log(`📧 Matching strategy: ${donor.contactEmail === userData.email ? 'email' : 'organization'}`);
      } else {
        console.log(`⚠️  No matching donor organization found for ${userData.email}`);
      }
    }

    console.log('\n✅ Donor user accounts creation completed!');
    console.log('\n📋 Login Credentials:');
    console.log('CARE International:');
    console.log('  Email: nigeria@careinternational.org');
    console.log('  Password: care123456');
    console.log('\nUN OCHA:');
    console.log('  Email: ocha.nigeria@un.org');
    console.log('  Password: ocha123456');

  } catch (error) {
    console.error('❌ Error creating donor users:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createDonorUsers();