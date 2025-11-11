import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function validateDonorSetup() {
  console.log('🔍 VALIDATING DONOR SETUP FOR TESTING...\n');

  try {
    // Check donor user exists and has correct roles
    console.log('1️⃣ CHECKING DONOR USER...');
    const donorUser = await prisma.user.findUnique({
      where: { email: 'donor@test.com' },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!donorUser) {
      console.log('❌ Donor user not found in database');
      console.log('💡 Run: npx tsx prisma/seed.ts');
      return;
    }

    console.log(`✅ Donor user found: ${donorUser.email}`);
    console.log(`📋 User ID: ${donorUser.id}`);
    console.log(`🏢 Organization: ${donorUser.organization}`);
    console.log(`🔑 Is Active: ${donorUser.isActive}`);
    console.log(`🔒 Is Locked: ${donorUser.isLocked}`);

    // Check roles
    console.log('\n2️⃣ CHECKING USER ROLES...');
    const userRoles = donorUser.roles.map(ur => ur.role.name);
    console.log(`🎭 Roles: ${userRoles.join(', ')}`);

    if (userRoles.length !== 1 || !userRoles.includes('DONOR')) {
      console.log('❌ Donor user has incorrect roles');
      console.log('💡 Expected: [DONOR] only');
      return;
    }

    console.log('✅ Donor user has correct role assignment');

    // Check permissions
    console.log('\n3️⃣ CHECKING USER PERMISSIONS...');
    const permissions = donorUser.roles[0].role.permissions.map(rp => rp.permission);
    console.log('📜 Permissions:');
    permissions.forEach(p => {
      console.log(`   - ${p.code}: ${p.name}`);
    });

    const requiredPermissions = ['VIEW_ASSESSMENT', 'VIEW_RESPONSE', 'VIEW_DONOR_DASHBOARD'];
    const permissionCodes = permissions.map(p => p.code);
    const hasAllPermissions = requiredPermissions.every(req => permissionCodes.includes(req));

    if (!hasAllPermissions) {
      console.log('❌ Donor user missing required permissions');
      console.log('💡 Required:', requiredPermissions);
      return;
    }

    console.log('✅ Donor user has all required permissions');

    // Check donor record exists
    console.log('\n4️⃣ CHECKING DONOR RECORD...');
    const donorRecord = await prisma.donor.findFirst({
      where: {
        OR: [
          { contactEmail: donorUser.email },
          { name: donorUser.organization },
          { id: 'donor-test-001' }
        ]
      }
    });

    if (!donorRecord) {
      console.log('❌ Donor record not found');
      console.log('💡 Check seed script donor record creation');
      return;
    }

    console.log(`✅ Donor record found: ${donorRecord.name}`);
    console.log(`📧 Contact: ${donorRecord.contactEmail}`);
    console.log(`🏢 Organization: ${donorRecord.organization}`);
    console.log(`✅ Is Active: ${donorRecord.isActive}`);

    // Check entity assignments
    console.log('\n5️⃣ CHECKING ENTITY ASSIGNMENTS...');
    const entityAssignments = await prisma.entityAssignment.count({
      where: { userId: donorUser.id }
    });

    console.log(`📍 Assigned Entities: ${entityAssignments}`);

    if (entityAssignments === 0) {
      console.log('⚠️  Donor user has no entity assignments (may be ok for testing)');
    }

    // Check multi-role user for comparison
    console.log('\n6️⃣ CHECKING MULTI-ROLE USER FOR COMPARISON...');
    const multiRoleUser = await prisma.user.findUnique({
      where: { email: 'multirole@dms.gov.ng' },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (multiRoleUser) {
      const multiRoles = multiRoleUser.roles.map(ur => ur.role.name);
      console.log(`🎭 Multi-role user roles: ${multiRoles.join(', ')}`);
      console.log('✅ Multi-role user available for comparison testing');
    }

    console.log('\n🎉 SETUP VALIDATION COMPLETE!');
    console.log('\n📋 READY TO TEST:');
    console.log('   1. Start development server: npm run dev');
    console.log('   2. Open: http://localhost:3000');
    console.log('   3. Login as: donor@test.com / donor123!');
    console.log('   4. Follow: STORY-5.1-TESTING-GUIDE.md');

  } catch (error) {
    console.error('❌ Validation failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

validateDonorSetup();