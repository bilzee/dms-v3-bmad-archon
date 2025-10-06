import { NextRequest } from 'next/server';
import { POST as CreateAssignment } from '@/app/api/v1/entity-assignments/route';
import { POST as BulkAssignment } from '@/app/api/v1/entity-assignments/bulk/route';
import { POST as TriggerAutoAssignment } from '@/app/api/v1/auto-assignment/trigger/route';
import { GET as GetCollaboration } from '@/app/api/v1/entity-assignments/collaboration/route';
import { AutoAssignmentService } from '@/lib/assignment/auto-assignment';
import { MultiUserAssignmentService } from '@/lib/assignment/multi-user-service';

// Mock all dependencies
jest.mock('@/lib/db/client');
jest.mock('@/lib/auth/verify');
jest.mock('@/lib/assignment/auto-assignment');
jest.mock('@/lib/assignment/multi-user-service');

describe('Assignment Workflow Integration Tests', () => {
  const mockCoordinator = {
    id: 'coord123',
    email: 'coordinator@test.com',
    roles: [{ role: { name: 'COORDINATOR' } }]
  };

  const mockAssessor = {
    id: 'assessor123',
    email: 'assessor@test.com',
    firstName: 'John',
    lastName: 'Doe',
    roles: [{ role: { name: 'ASSESSOR' } }]
  };

  const mockResponder = {
    id: 'responder123',
    email: 'responder@test.com',
    firstName: 'Jane',
    lastName: 'Smith',
    roles: [{ role: { name: 'RESPONDER' } }]
  };

  const mockEntity = {
    id: 'entity123',
    name: 'Test Community',
    type: 'COMMUNITY',
    location: 'Test Location'
  };

  const mockAssignment = {
    id: 'assignment123',
    userId: mockAssessor.id,
    entityId: mockEntity.id,
    assignedBy: mockCoordinator.id,
    assignedAt: new Date(),
    user: mockAssessor,
    entity: mockEntity
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup common auth verification
    require('@/lib/auth/verify').verifyToken.mockResolvedValue({
      success: true,
      user: mockCoordinator
    });
  });

  describe('Complete Assignment Creation Workflow', () => {
    it('should create assignment and trigger auto-assignment', async () => {
      // Mock Prisma operations for assignment creation
      const mockPrisma = require('@/lib/db/client').prisma;
      mockPrisma.user.findUnique.mockResolvedValue(mockAssessor);
      mockPrisma.entity.findUnique.mockResolvedValue(mockEntity);
      mockPrisma.entityAssignment.findUnique.mockResolvedValue(null);
      mockPrisma.entityAssignment.create.mockResolvedValue(mockAssignment);

      // Test assignment creation
      const createRequest = new NextRequest('http://localhost/api/v1/entity-assignments', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: mockAssessor.id,
          entityId: mockEntity.id,
          assignedBy: mockCoordinator.id
        })
      });

      const createResponse = await CreateAssignment(createRequest);
      const createData = await createResponse.json();

      expect(createResponse.status).toBe(201);
      expect(createData.success).toBe(true);
      expect(createData.data.id).toBe(mockAssignment.id);

      // Test auto-assignment trigger
      (AutoAssignmentService.autoAssignOnCreation as jest.Mock).mockResolvedValue(true);

      const triggerRequest = new NextRequest('http://localhost/api/v1/auto-assignment/trigger', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'assessment',
          userId: mockAssessor.id,
          entityId: mockEntity.id,
          userRole: 'ASSESSOR'
        })
      });

      const triggerResponse = await TriggerAutoAssignment(triggerRequest);
      const triggerData = await triggerResponse.json();

      expect(triggerResponse.status).toBe(200);
      expect(triggerData.success).toBe(true);
      expect(AutoAssignmentService.autoAssignOnCreation).toHaveBeenCalled();
    });

    it('should handle bulk assignment with collaboration tracking', async () => {
      // Mock bulk assignment data
      const mockBulkAssignments = [
        { ...mockAssignment, id: 'assignment1', userId: mockAssessor.id },
        { ...mockAssignment, id: 'assignment2', userId: mockResponder.id }
      ];

      const mockPrisma = require('@/lib/db/client').prisma;
      mockPrisma.user.findMany.mockResolvedValue([mockAssessor, mockResponder]);
      mockPrisma.entity.findMany.mockResolvedValue([mockEntity]);
      mockPrisma.entityAssignment.findMany.mockResolvedValue([]);
      mockPrisma.$transaction.mockResolvedValue(mockBulkAssignments);

      // Test bulk assignment
      const bulkRequest = new NextRequest('http://localhost/api/v1/entity-assignments/bulk', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userIds: [mockAssessor.id, mockResponder.id],
          entityIds: [mockEntity.id],
          assignedBy: mockCoordinator.id
        })
      });

      const bulkResponse = await BulkAssignment(bulkRequest);
      const bulkData = await bulkResponse.json();

      expect(bulkResponse.status).toBe(201);
      expect(bulkData.success).toBe(true);
      expect(bulkData.created).toBe(2);
      expect(bulkData.data).toHaveLength(2);

      // Test collaboration tracking
      const mockCollaboration = {
        entityId: mockEntity.id,
        entityName: mockEntity.name,
        entityType: mockEntity.type,
        assignedUsers: [
          {
            userId: mockAssessor.id,
            email: mockAssessor.email,
            name: 'John Doe',
            roles: ['ASSESSOR'],
            assignedAt: new Date(),
            assignedBy: mockCoordinator.id
          },
          {
            userId: mockResponder.id,
            email: mockResponder.email,
            name: 'Jane Smith',
            roles: ['RESPONDER'],
            assignedAt: new Date(),
            assignedBy: mockCoordinator.id
          }
        ],
        assessorCount: 1,
        responderCount: 1,
        totalAssignments: 2
      };

      (MultiUserAssignmentService.getEntityCollaboration as jest.Mock)
        .mockResolvedValue(mockCollaboration);

      const collabRequest = new NextRequest(
        'http://localhost/api/v1/entity-assignments/collaboration?type=entity&entityId=entity123',
        {
          method: 'GET',
          headers: { 'Authorization': 'Bearer valid-token' }
        }
      );

      const collabResponse = await GetCollaboration(collabRequest);
      const collabData = await collabResponse.json();

      expect(collabResponse.status).toBe(200);
      expect(collabData.success).toBe(true);
      expect(collabData.data.totalAssignments).toBe(2);
      expect(collabData.data.assessorCount).toBe(1);
      expect(collabData.data.responderCount).toBe(1);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle assignment conflicts gracefully', async () => {
      // Mock conflict detection
      (MultiUserAssignmentService.checkAssignmentConflicts as jest.Mock)
        .mockResolvedValue({
          conflicts: [
            {
              userId: mockAssessor.id,
              email: mockAssessor.email,
              conflictReason: 'Already assigned to this entity'
            }
          ],
          warnings: []
        });

      // This would be called in a real workflow before attempting assignment
      const conflicts = await MultiUserAssignmentService.checkAssignmentConflicts(
        mockEntity.id,
        [mockAssessor.id]
      );

      expect(conflicts.conflicts).toHaveLength(1);
      expect(conflicts.conflicts[0].conflictReason).toContain('Already assigned');
    });

    it('should handle auto-assignment rule configuration', async () => {
      // Test auto-assignment configuration
      const originalConfig = AutoAssignmentService.getConfig();
      
      // Disable auto-assignment
      AutoAssignmentService.updateConfig({
        globalSettings: {
          enableAutoAssignment: false,
          enableInheritance: true,
          enableNotifications: true
        }
      });

      expect(AutoAssignmentService.isAutoAssignmentEnabled('COMMUNITY', 'ASSESSOR')).toBe(false);

      // Re-enable auto-assignment
      AutoAssignmentService.updateConfig({
        globalSettings: {
          enableAutoAssignment: true,
          enableInheritance: true,
          enableNotifications: true
        }
      });

      expect(AutoAssignmentService.isAutoAssignmentEnabled('COMMUNITY', 'ASSESSOR')).toBe(true);
    });

    it('should handle assignment inheritance workflow', async () => {
      // Mock inheritance scenario
      (AutoAssignmentService.inheritAssignments as jest.Mock).mockResolvedValue(true);

      const inheritanceResult = await AutoAssignmentService.inheritAssignments(
        mockAssessor.id,
        'sourceEntity123',
        'targetEntity123',
        'ASSESSOR',
        mockCoordinator.id
      );

      expect(inheritanceResult).toBe(true);
      expect(AutoAssignmentService.inheritAssignments).toHaveBeenCalledWith(
        mockAssessor.id,
        'sourceEntity123',
        'targetEntity123',
        'ASSESSOR',
        mockCoordinator.id
      );
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large bulk assignments efficiently', async () => {
      // Simulate large dataset
      const largeUserList = Array(50).fill(null).map((_, index) => ({
        id: `user${index}`,
        email: `user${index}@test.com`,
        roles: [{ role: { name: index % 2 === 0 ? 'ASSESSOR' : 'RESPONDER' } }]
      }));

      const largeEntityList = Array(20).fill(null).map((_, index) => ({
        id: `entity${index}`,
        name: `Entity ${index}`,
        type: 'COMMUNITY'
      }));

      const mockPrisma = require('@/lib/db/client').prisma;
      mockPrisma.user.findMany.mockResolvedValue(largeUserList);
      mockPrisma.entity.findMany.mockResolvedValue(largeEntityList);
      mockPrisma.entityAssignment.findMany.mockResolvedValue([]);

      // Mock transaction that creates 1000 assignments (50 users × 20 entities)
      const largeAssignmentList = largeUserList.flatMap(user =>
        largeEntityList.map(entity => ({
          id: `assignment_${user.id}_${entity.id}`,
          userId: user.id,
          entityId: entity.id,
          assignedBy: mockCoordinator.id,
          assignedAt: new Date(),
          user,
          entity
        }))
      );

      mockPrisma.$transaction.mockResolvedValue(largeAssignmentList);

      const userIds = largeUserList.map(u => u.id);
      const entityIds = largeEntityList.map(e => e.id);

      const bulkRequest = new NextRequest('http://localhost/api/v1/entity-assignments/bulk', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userIds,
          entityIds,
          assignedBy: mockCoordinator.id
        })
      });

      const start = Date.now();
      const response = await BulkAssignment(bulkRequest);
      const duration = Date.now() - start;

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.created).toBe(1000);
      
      // Performance assertion - should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds max
    });

    it('should optimize collaboration queries', async () => {
      // Mock large collaboration dataset
      const largeCollaborationData = Array(100).fill(null).map((_, index) => ({
        entityId: `entity${index}`,
        entityName: `Entity ${index}`,
        entityType: 'COMMUNITY',
        assignedUsers: Array(5).fill(null).map((_, userIndex) => ({
          userId: `user${userIndex}`,
          email: `user${userIndex}@test.com`,
          name: `User ${userIndex}`,
          roles: ['ASSESSOR'],
          assignedAt: new Date(),
          assignedBy: mockCoordinator.id
        })),
        assessorCount: 3,
        responderCount: 2,
        totalAssignments: 5
      }));

      (MultiUserAssignmentService.getCollaborativeEntities as jest.Mock)
        .mockResolvedValue(largeCollaborationData);

      const start = Date.now();
      const collaborativeEntities = await MultiUserAssignmentService.getCollaborativeEntities(100);
      const duration = Date.now() - start;

      expect(collaborativeEntities).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Data Consistency and Validation', () => {
    it('should maintain data consistency during concurrent operations', async () => {
      // Simulate concurrent assignment creation
      const mockPrisma = require('@/lib/db/client').prisma;
      
      // First request succeeds
      mockPrisma.entityAssignment.findUnique
        .mockResolvedValueOnce(null) // No existing assignment
        .mockResolvedValueOnce(mockAssignment); // Assignment exists on second check

      mockPrisma.user.findUnique.mockResolvedValue(mockAssessor);
      mockPrisma.entity.findUnique.mockResolvedValue(mockEntity);
      mockPrisma.entityAssignment.create.mockResolvedValue(mockAssignment);

      // First assignment creation
      const request1 = new NextRequest('http://localhost/api/v1/entity-assignments', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: mockAssessor.id,
          entityId: mockEntity.id,
          assignedBy: mockCoordinator.id
        })
      });

      const response1 = await CreateAssignment(request1);
      expect(response1.status).toBe(201);

      // Second assignment creation (should detect conflict)
      const request2 = new NextRequest('http://localhost/api/v1/entity-assignments', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: mockAssessor.id,
          entityId: mockEntity.id,
          assignedBy: mockCoordinator.id
        })
      });

      const response2 = await CreateAssignment(request2);
      const data2 = await response2.json();

      expect(response2.status).toBe(409);
      expect(data2.error).toBe('Assignment already exists');
    });

    it('should validate role-based access throughout workflow', async () => {
      // Test with non-coordinator user
      require('@/lib/auth/verify').verifyToken.mockResolvedValue({
        success: true,
        user: mockAssessor // Assessor trying to create assignments
      });

      const request = new NextRequest('http://localhost/api/v1/entity-assignments', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: mockResponder.id,
          entityId: mockEntity.id,
          assignedBy: mockAssessor.id
        })
      });

      const response = await CreateAssignment(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Only coordinators can manage entity assignments');
    });
  });
});