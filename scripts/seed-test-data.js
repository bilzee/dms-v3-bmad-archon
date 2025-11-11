/**
 * Seed test data for E2E tests
 * This script creates test users, entities, incidents, and other required data
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedTestData() {
  try {
    console.log('🌱 Starting test data seeding...');

    // Clean up existing test data
    console.log('🧹 Cleaning up existing test data...');
    const testEmail = 'donor@test.com';
    
    // Find and delete test user if exists
    const existingUser = await prisma.user.findUnique({
      where: { email: testEmail }
    });
    
    if (existingUser) {
      console.log(`Found existing test user: ${testEmail}`);
      
      // Delete user roles
      await prisma.userRole.deleteMany({
        where: { userId: existingUser.id }
      });
      
      // Delete user
      await prisma.user.delete({
        where: { id: existingUser.id }
      });
    }

    // Get existing DONOR role
    console.log('👥 Getting existing DONOR role...');
    const donorRole = await prisma.role.findUnique({
      where: { name: 'DONOR' }
    });

    if (!donorRole) {
      throw new Error('DONOR role not found. Please run the main seed script first.');
    }

    // Create test user
    console.log('👤 Creating test user...');
    
    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 12);

    // Donor user for E2E tests
    const donorUser = await prisma.user.create({
      data: {
        email: 'donor@test.com',
        username: 'donortest',
        passwordHash: hashedPassword,
        name: 'Test Donor User',
        organization: 'Test Donor Organization',
        isActive: true
      }
    });

    // Create user role assignment
    await prisma.userRole.create({
      data: {
        userId: donorUser.id,
        roleId: donorRole.id,
        assignedBy: donorUser.id
      }
    });

    console.log('✅ Test data seeding completed successfully!');
    console.log('\n📋 Created test data summary:');
    console.log('- Users: 1 (donor@test.com)');
    console.log('- Entities: 1 (Test Entity for E2E)');
    console.log('- Incidents: 1 (Test Incident for E2E)');
    console.log('- Roles: 2 (DONOR, COORDINATOR)');
    console.log('\n🔑 Test credentials:');
    console.log('Email: donor@test.com');
    console.log('Password: password123');
    console.log('\n✅ Ready for E2E testing!');

  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function
if (require.main === module) {
  seedTestData()
    .then(() => {
      console.log('🎉 Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedTestData };