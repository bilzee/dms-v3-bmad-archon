import { PrismaClient, RoleName } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create Permissions
  const permissions = [
    // Assessment permissions
    { name: 'Create Assessment', code: 'CREATE_ASSESSMENT', category: 'assessment', description: 'Can create new assessments' },
    { name: 'View Assessment', code: 'VIEW_ASSESSMENT', category: 'assessment', description: 'Can view assessments' },
    { name: 'Edit Assessment', code: 'EDIT_ASSESSMENT', category: 'assessment', description: 'Can edit own assessments' },
    { name: 'Verify Assessment', code: 'VERIFY_ASSESSMENT', category: 'assessment', description: 'Can verify assessments' },
    { name: 'Publish Assessment', code: 'PUBLISH_ASSESSMENT', category: 'assessment', description: 'Can publish verified assessments' },
    
    // Response permissions
    { name: 'Create Response', code: 'CREATE_RESPONSE', category: 'response', description: 'Can create response plans' },
    { name: 'View Response', code: 'VIEW_RESPONSE', category: 'response', description: 'Can view response plans' },
    { name: 'Edit Response', code: 'EDIT_RESPONSE', category: 'response', description: 'Can edit own responses' },
    { name: 'Verify Response', code: 'VERIFY_RESPONSE', category: 'response', description: 'Can verify responses' },
    { name: 'Execute Response', code: 'EXECUTE_RESPONSE', category: 'response', description: 'Can execute response activities' },
    
    // Entity permissions
    { name: 'View Entities', code: 'VIEW_ENTITIES', category: 'entity', description: 'Can view assigned entities' },
    { name: 'Manage Entities', code: 'MANAGE_ENTITIES', category: 'entity', description: 'Can manage entity assignments' },
    
    // Dashboard permissions
    { name: 'View Crisis Dashboard', code: 'VIEW_CRISIS_DASHBOARD', category: 'dashboard', description: 'Can access crisis management dashboard' },
    { name: 'View Situation Dashboard', code: 'VIEW_SITUATION_DASHBOARD', category: 'dashboard', description: 'Can access situation awareness dashboard' },
    { name: 'View Donor Dashboard', code: 'VIEW_DONOR_DASHBOARD', category: 'dashboard', description: 'Can access donor dashboard' },
    
    // User management permissions
    { name: 'Manage Users', code: 'MANAGE_USERS', category: 'user', description: 'Can create and manage users' },
    { name: 'Assign Roles', code: 'ASSIGN_ROLES', category: 'user', description: 'Can assign roles to users' },
    { name: 'View Audit Logs', code: 'VIEW_AUDIT_LOGS', category: 'audit', description: 'Can view system audit logs' },
    
    // Sync permissions
    { name: 'View Sync Conflicts', code: 'VIEW_SYNC_CONFLICTS', category: 'sync', description: 'Can view synchronization conflicts' },
    { name: 'Resolve Sync Conflicts', code: 'RESOLVE_SYNC_CONFLICTS', category: 'sync', description: 'Can resolve sync conflicts' },
  ]

  console.log('📝 Creating permissions...')
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: {},
      create: permission,
    })
  }

  // Create Roles
  console.log('👥 Creating roles...')
  const assessorRole = await prisma.role.upsert({
    where: { name: RoleName.ASSESSOR },
    update: {},
    create: {
      name: RoleName.ASSESSOR,
      description: 'Field assessors who conduct rapid assessments',
    },
  })

  const coordinatorRole = await prisma.role.upsert({
    where: { name: RoleName.COORDINATOR },
    update: {},
    create: {
      name: RoleName.COORDINATOR,
      description: 'Coordinators who verify and manage assessments and responses',
    },
  })

  const responderRole = await prisma.role.upsert({
    where: { name: RoleName.RESPONDER },
    update: {},
    create: {
      name: RoleName.RESPONDER,
      description: 'Response teams who execute intervention activities',
    },
  })

  const donorRole = await prisma.role.upsert({
    where: { name: RoleName.DONOR },
    update: {},
    create: {
      name: RoleName.DONOR,
      description: 'Donors and funding organizations',
    },
  })

  const adminRole = await prisma.role.upsert({
    where: { name: RoleName.ADMIN },
    update: {},
    create: {
      name: RoleName.ADMIN,
      description: 'System administrators with full access',
    },
  })

  // Assign permissions to roles
  console.log('🔗 Assigning permissions to roles...')
  
  // Assessor permissions
  const assessorPermissions = [
    'CREATE_ASSESSMENT', 'VIEW_ASSESSMENT', 'EDIT_ASSESSMENT',
    'VIEW_ENTITIES', 'VIEW_SITUATION_DASHBOARD'
  ]
  for (const permCode of assessorPermissions) {
    const permission = await prisma.permission.findUnique({ where: { code: permCode } })
    if (permission) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: assessorRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: assessorRole.id, permissionId: permission.id },
      })
    }
  }

  // Coordinator permissions
  const coordinatorPermissions = [
    'CREATE_ASSESSMENT', 'VIEW_ASSESSMENT', 'EDIT_ASSESSMENT', 'VERIFY_ASSESSMENT', 'PUBLISH_ASSESSMENT',
    'CREATE_RESPONSE', 'VIEW_RESPONSE', 'EDIT_RESPONSE', 'VERIFY_RESPONSE',
    'VIEW_ENTITIES', 'MANAGE_ENTITIES',
    'VIEW_CRISIS_DASHBOARD', 'VIEW_SITUATION_DASHBOARD',
    'VIEW_SYNC_CONFLICTS', 'RESOLVE_SYNC_CONFLICTS'
  ]
  for (const permCode of coordinatorPermissions) {
    const permission = await prisma.permission.findUnique({ where: { code: permCode } })
    if (permission) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: coordinatorRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: coordinatorRole.id, permissionId: permission.id },
      })
    }
  }

  // Responder permissions
  const responderPermissions = [
    'VIEW_ASSESSMENT', 'CREATE_RESPONSE', 'VIEW_RESPONSE', 'EDIT_RESPONSE', 'EXECUTE_RESPONSE',
    'VIEW_ENTITIES', 'VIEW_SITUATION_DASHBOARD'
  ]
  for (const permCode of responderPermissions) {
    const permission = await prisma.permission.findUnique({ where: { code: permCode } })
    if (permission) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: responderRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: responderRole.id, permissionId: permission.id },
      })
    }
  }

  // Donor permissions
  const donorPermissions = [
    'VIEW_ASSESSMENT', 'VIEW_RESPONSE', 'VIEW_DONOR_DASHBOARD'
  ]
  for (const permCode of donorPermissions) {
    const permission = await prisma.permission.findUnique({ where: { code: permCode } })
    if (permission) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: donorRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: donorRole.id, permissionId: permission.id },
      })
    }
  }

  // Admin permissions (all permissions)
  const allPermissions = await prisma.permission.findMany()
  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: permission.id },
    })
  }

  // Create sample entities
  console.log('🏢 Creating sample entities...')
  const entities = [
    { name: 'Maiduguri Metropolitan', type: 'LGA', location: 'Borno State', coordinates: { lat: 11.8311, lng: 13.1511 } },
    { name: 'Jere Local Government', type: 'LGA', location: 'Borno State', coordinates: { lat: 11.8822, lng: 13.2143 } },
    { name: 'Gwoza Local Government', type: 'LGA', location: 'Borno State', coordinates: { lat: 11.0417, lng: 13.6875 } },
    { name: 'Primary Health Center Maiduguri', type: 'FACILITY', location: 'Maiduguri', coordinates: { lat: 11.8467, lng: 13.1569 } },
    { name: 'IDP Camp Dalori', type: 'CAMP', location: 'Maiduguri', coordinates: { lat: 11.7833, lng: 13.2167 } },
  ]

  for (const entityData of entities) {
    await prisma.entity.upsert({
      where: { id: entityData.name.toLowerCase().replace(/\s+/g, '-') },
      update: {},
      create: {
        id: entityData.name.toLowerCase().replace(/\s+/g, '-'),
        name: entityData.name,
        type: entityData.type as any,
        location: entityData.location,
        coordinates: entityData.coordinates,
      },
    })
  }

  // Create default admin user
  console.log('👤 Creating default admin user...')
  const adminPasswordHash = await bcrypt.hash('admin123!', 10)
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@dms.gov.ng' },
    update: {},
    create: {
      email: 'admin@dms.gov.ng',
      username: 'admin',
      passwordHash: adminPasswordHash,
      name: 'System Administrator',
      organization: 'Borno State Emergency Management Agency',
    },
  })

  // Assign admin role to admin user
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
      assignedBy: 'system',
    },
  })

  // Create sample coordinator user
  console.log('👤 Creating sample coordinator user...')
  const coordinatorPasswordHash = await bcrypt.hash('coordinator123!', 10)
  
  const coordinatorUser = await prisma.user.upsert({
    where: { email: 'coordinator@dms.gov.ng' },
    update: {},
    create: {
      email: 'coordinator@dms.gov.ng',
      username: 'coordinator',
      passwordHash: coordinatorPasswordHash,
      name: 'Crisis Coordinator',
      organization: 'Borno State Emergency Management Agency',
    },
  })

  // Assign coordinator role
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: coordinatorUser.id, roleId: coordinatorRole.id } },
    update: {},
    create: {
      userId: coordinatorUser.id,
      roleId: coordinatorRole.id,
      assignedBy: adminUser.id,
    },
  })

  // Assign coordinator to entities
  const maiduguri = await prisma.entity.findFirst({ where: { name: 'Maiduguri Metropolitan' } })
  if (maiduguri) {
    await prisma.entityAssignment.upsert({
      where: { userId_entityId: { userId: coordinatorUser.id, entityId: maiduguri.id } },
      update: {},
      create: {
        userId: coordinatorUser.id,
        entityId: maiduguri.id,
        assignedBy: adminUser.id,
      },
    })
  }

  console.log('✅ Database seed completed successfully!')
  console.log('📧 Admin credentials: admin@dms.gov.ng / admin123!')
  console.log('📧 Coordinator credentials: coordinator@dms.gov.ng / coordinator123!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })