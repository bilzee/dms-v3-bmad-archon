import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function createTestUsers() {
  const users = [
    {
      email: 'assessor@test.com',
      username: 'test-assessor',
      passwordHash: await bcrypt.hash('test-password', 10),
      name: 'Test Assessor',
      organization: 'Test Org',
      roles: ['ASSESSOR']
    },
    {
      email: 'coordinator@test.com',
      username: 'test-coordinator',
      passwordHash: await bcrypt.hash('test-password', 10),
      name: 'Test Coordinator',
      organization: 'Test Org',
      roles: ['COORDINATOR']
    },
    {
      email: 'responder@test.com',
      username: 'test-responder',
      passwordHash: await bcrypt.hash('test-password', 10),
      name: 'Test Responder',
      organization: 'Test Org',
      roles: ['RESPONDER']
    },
    {
      email: 'donor@test.com',
      username: 'test-donor',
      passwordHash: await bcrypt.hash('test-password', 10),
      name: 'Test Donor',
      organization: 'Test Org',
      roles: ['DONOR']
    }
  ];

  const createdUsers = [];
  for (const userData of users) {
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        username: userData.username,
        passwordHash: userData.passwordHash,
        name: userData.name,
        organization: userData.organization
      }
    });

    // Create roles and assignments
    for (const roleName of userData.roles) {
      const role = await prisma.role.findFirst({
        where: { name: roleName }
      });

      if (role) {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: role.id,
            assignedBy: 'system'
          }
        });
      }
    }

    createdUsers.push({
      ...user,
      roles: userData.roles,
      token: 'mock-token-for-testing' // In real implementation, generate proper JWT
    });
  }

  return createdUsers;
}

export async function createTestAssessments(users: any[]) {
  const assessor = users.find(u => u.roles.includes('ASSESSOR'));
  
  const assessments = [];
  for (let i = 0; i < 3; i++) {
    const assessment = await prisma.rapidAssessment.create({
      data: {
        assessorId: assessor.id,
        rapidAssessmentType: 'HEALTH',
        rapidAssessmentDate: new Date(),
        affectedPopulationCount: 100 + i * 50,
        immediateNeeds: JSON.stringify(['food', 'water', 'medical']),
        severityLevel: 'HIGH',
        assessmentStatus: 'VERIFIED',
        location: JSON.stringify({
          latitude: 40.7128 + i * 0.01,
          longitude: -74.0060 + i * 0.01
        })
      }
    });
    assessments.push(assessment);
  }

  return assessments;
}

export async function createTestResponses(users: any[], assessments: any[]) {
  const responder = users.find(u => u.roles.includes('RESPONDER'));
  
  const responses = [];
  for (const assessment of assessments) {
    const response = await prisma.rapidResponse.create({
      data: {
        assessmentId: assessment.id,
        responderId: responder.id,
        status: 'PLANNED',
        plannedDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        items: JSON.stringify([
          { name: 'Food Supplies', unit: 'kg', quantity: 100 },
          { name: 'Water', unit: 'liters', quantity: 500 }
        ]),
        verificationStatus: 'DRAFT'
      }
    });
    responses.push(response);
  }

  return responses;
}
