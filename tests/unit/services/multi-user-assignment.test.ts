import { MultiUserAssignmentService } from '@/lib/assignment/multi-user-service';
import { prisma } from '@/lib/db/client';

// Mock Prisma
jest.mock('@/lib/db/client', () => ({
  prisma: {
    entity: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    entityAssignment: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('MultiUserAssignmentService', () => {
  const mockEntity = {
    id: 'entity123',
    name: 'Test Community',
    type: 'COMMUNITY',
    location: 'Test Location',
    assignments: [
      {
        id: 'assignment1',
        userId: 'user1',
        assignedAt: new Date('2024-01-01'),
        assignedBy: 'coordinator1',
        user: {
          id: 'user1',
          email: 'assessor1@test.com',
          firstName: 'John',
          lastName: 'Doe',
          roles: [{ role: { id: 'role1', name: 'ASSESSOR' } }]
        }
      },
      {
        id: 'assignment2',
        userId: 'user2',
        assignedAt: new Date('2024-01-02'),
        assignedBy: 'coordinator1',
        user: {
          id: 'user2',
          email: 'responder1@test.com',
          firstName: 'Jane',
          lastName: 'Smith',
          roles: [{ role: { id: 'role2', name: 'RESPONDER' } }]
        }
      }
    ]
  };

  const mockUser = {
    id: 'user1',
    email: 'assessor1@test.com',
    firstName: 'John',
    lastName: 'Doe',
    roles: [{ role: { id: 'role1', name: 'ASSESSOR' } }],
    assignments: [
      {
        id: 'assignment1',
        assignedAt: new Date('2024-01-01'),
        entity: {
          id: 'entity123',
          name: 'Test Community',
          type: 'COMMUNITY',
          assignments: [
            { userId: 'user1', user: { id: 'user1', firstName: 'John', lastName: 'Doe' } },
            { userId: 'user2', user: { id: 'user2', firstName: 'Jane', lastName: 'Smith' } }
          ]
        }
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getEntityCollaboration', () => {
    it('should return collaboration details for entity with multiple users', async () => {
      (prisma.entity.findUnique as jest.Mock).mockResolvedValue(mockEntity);

      const result = await MultiUserAssignmentService.getEntityCollaboration('entity123');

      expect(result).toEqual({
        entityId: 'entity123',
        entityName: 'Test Community',
        entityType: 'COMMUNITY',
        assignedUsers: [
          {
            userId: 'user1',
            email: 'assessor1@test.com',
            name: 'John Doe',
            roles: ['ASSESSOR'],
            assignedAt: new Date('2024-01-01'),
            assignedBy: 'coordinator1'
          },
          {
            userId: 'user2',
            email: 'responder1@test.com',
            name: 'Jane Smith',
            roles: ['RESPONDER'],
            assignedAt: new Date('2024-01-02'),
            assignedBy: 'coordinator1'
          }
        ],
        assessorCount: 1,
        responderCount: 1,
        totalAssignments: 2
      });
    });

    it('should return null for non-existent entity', async () => {
      (prisma.entity.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await MultiUserAssignmentService.getEntityCollaboration('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle entities with no assignments', async () => {
      const entityWithoutAssignments = {
        ...mockEntity,
        assignments: []
      };

      (prisma.entity.findUnique as jest.Mock).mockResolvedValue(entityWithoutAssignments);

      const result = await MultiUserAssignmentService.getEntityCollaboration('entity123');

      expect(result).toEqual({
        entityId: 'entity123',
        entityName: 'Test Community',
        entityType: 'COMMUNITY',
        assignedUsers: [],
        assessorCount: 0,
        responderCount: 0,
        totalAssignments: 0
      });
    });
  });

  describe('getUserAssignmentOverview', () => {
    it('should return user assignment overview with collaboration details', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await MultiUserAssignmentService.getUserAssignmentOverview('user1');

      expect(result).toEqual({
        userId: 'user1',
        email: 'assessor1@test.com',
        name: 'John Doe',
        roles: ['ASSESSOR'],
        assignedEntities: [
          {
            entityId: 'entity123',
            entityName: 'Test Community',
            entityType: 'COMMUNITY',
            assignedAt: new Date('2024-01-01'),
            sharedWith: ['Jane Smith']
          }
        ],
        collaborations: 1
      });
    });

    it('should return null for non-existent user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await MultiUserAssignmentService.getUserAssignmentOverview('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle users with no assignments', async () => {
      const userWithoutAssignments = {
        ...mockUser,
        assignments: []
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(userWithoutAssignments);

      const result = await MultiUserAssignmentService.getUserAssignmentOverview('user1');

      expect(result).toEqual({
        userId: 'user1',
        email: 'assessor1@test.com',
        name: 'John Doe',
        roles: ['ASSESSOR'],
        assignedEntities: [],
        collaborations: 0
      });
    });
  });

  describe('getCollaborativeEntities', () => {
    it('should return entities with multiple assigned users', async () => {
      const mockEntities = [mockEntity];
      (prisma.entity.findMany as jest.Mock).mockResolvedValue(mockEntities);

      const result = await MultiUserAssignmentService.getCollaborativeEntities(10);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        entityId: 'entity123',
        entityName: 'Test Community',
        entityType: 'COMMUNITY',
        assignedUsers: expect.any(Array),
        assessorCount: 1,
        responderCount: 1,
        totalAssignments: 2
      });
    });

    it('should filter out entities with single assignments', async () => {
      const entityWithSingleAssignment = {
        ...mockEntity,
        assignments: [mockEntity.assignments[0]] // Only one assignment
      };

      (prisma.entity.findMany as jest.Mock).mockResolvedValue([entityWithSingleAssignment]);

      const result = await MultiUserAssignmentService.getCollaborativeEntities(10);

      expect(result).toHaveLength(0);
    });

    it('should respect the limit parameter', async () => {
      const multipleEntities = Array(15).fill(null).map((_, index) => ({
        ...mockEntity,
        id: `entity${index}`,
        name: `Entity ${index}`
      }));

      (prisma.entity.findMany as jest.Mock).mockResolvedValue(multipleEntities);

      const result = await MultiUserAssignmentService.getCollaborativeEntities(5);

      expect(prisma.entity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5
        })
      );
    });
  });

  describe('checkAssignmentConflicts', () => {
    it('should identify conflicts and warnings', async () => {
      const existingAssignments = [
        {
          userId: 'user1',
          user: {
            id: 'user1',
            email: 'existing@test.com',
            roles: [{ role: { name: 'ASSESSOR' } }]
          }
        }
      ];

      const newUser = {
        id: 'user2',
        email: 'newuser@test.com',
        roles: [{ role: { name: 'RESPONDER' } }]
      };

      (prisma.entityAssignment.findMany as jest.Mock).mockResolvedValue(existingAssignments);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(newUser);

      const result = await MultiUserAssignmentService.checkAssignmentConflicts(
        'entity123',
        ['user2']
      );

      expect(result.conflicts).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect already assigned users', async () => {
      const existingAssignments = [
        {
          userId: 'user1',
          user: {
            id: 'user1',
            email: 'existing@test.com',
            roles: [{ role: { name: 'ASSESSOR' } }]
          }
        }
      ];

      const existingUser = {
        id: 'user1',
        email: 'existing@test.com',
        roles: [{ role: { name: 'ASSESSOR' } }]
      };

      (prisma.entityAssignment.findMany as jest.Mock).mockResolvedValue(existingAssignments);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);

      const result = await MultiUserAssignmentService.checkAssignmentConflicts(
        'entity123',
        ['user1']
      );

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]).toEqual({
        userId: 'user1',
        email: 'existing@test.com',
        conflictReason: 'Already assigned to this entity'
      });
    });

    it('should detect users without appropriate roles', async () => {
      const coordinatorUser = {
        id: 'coordinator1',
        email: 'coordinator@test.com',
        roles: [{ role: { name: 'COORDINATOR' } }]
      };

      (prisma.entityAssignment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(coordinatorUser);

      const result = await MultiUserAssignmentService.checkAssignmentConflicts(
        'entity123',
        ['coordinator1']
      );

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]).toEqual({
        userId: 'coordinator1',
        email: 'coordinator@test.com',
        conflictReason: 'User does not have ASSESSOR or RESPONDER role'
      });
    });

    it('should detect non-existent users', async () => {
      (prisma.entityAssignment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await MultiUserAssignmentService.checkAssignmentConflicts(
        'entity123',
        ['nonexistent']
      );

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]).toEqual({
        userId: 'nonexistent',
        email: 'unknown',
        conflictReason: 'User not found'
      });
    });
  });

  describe('getAssignmentStatistics', () => {
    it('should calculate assignment statistics correctly', async () => {
      const mockEntitiesWithCounts = [
        { _count: { assignments: 0 } }, // No assignments
        { _count: { assignments: 1 } }, // Single assignment
        { _count: { assignments: 3 } }, // Multiple assignments
        { _count: { assignments: 2 } }, // Multiple assignments
      ];

      (prisma.entity.count as jest.Mock).mockResolvedValue(4);
      (prisma.entity.findMany as jest.Mock).mockResolvedValue(mockEntitiesWithCounts);

      const result = await MultiUserAssignmentService.getAssignmentStatistics();

      expect(result).toEqual({
        totalEntities: 4,
        entitiesWithAssignments: 3, // 3 entities with assignments > 0
        entitiesWithMultipleUsers: 2, // 2 entities with assignments > 1
        averageUsersPerEntity: 2, // 6 total assignments / 3 entities with assignments
        totalAssignments: 6, // 1 + 3 + 2
        collaborationRate: 66.67 // (2 multiple / 3 with assignments) * 100
      });
    });

    it('should handle case with no entities', async () => {
      (prisma.entity.count as jest.Mock).mockResolvedValue(0);
      (prisma.entity.findMany as jest.Mock).mockResolvedValue([]);

      const result = await MultiUserAssignmentService.getAssignmentStatistics();

      expect(result).toEqual({
        totalEntities: 0,
        entitiesWithAssignments: 0,
        entitiesWithMultipleUsers: 0,
        averageUsersPerEntity: 0,
        totalAssignments: 0,
        collaborationRate: 0
      });
    });
  });

  describe('suggestOptimalAssignments', () => {
    it('should suggest users based on role and workload', async () => {
      const entity = {
        id: 'entity123',
        type: 'COMMUNITY',
        assignments: []
      };

      const availableUsers = [
        {
          id: 'user1',
          email: 'assessor1@test.com',
          firstName: 'John',
          lastName: 'Doe',
          roles: [{ role: { name: 'ASSESSOR' } }],
          assignments: [] // Low workload
        },
        {
          id: 'user2',
          email: 'responder1@test.com',
          firstName: 'Jane',
          lastName: 'Smith',
          roles: [{ role: { name: 'RESPONDER' } }],
          assignments: Array(6).fill({ entity: { type: 'WARD' } }) // High workload
        }
      ];

      (prisma.entity.findUnique as jest.Mock).mockResolvedValue(entity);
      (prisma.user.findMany as jest.Mock).mockResolvedValue(availableUsers);

      const result = await MultiUserAssignmentService.suggestOptimalAssignments('entity123');

      expect(result).toHaveLength(2);
      // User with ASSESSOR role and low workload should have higher priority
      expect(result[0].roles).toContain('ASSESSOR');
      expect(result[0].priority).toBeGreaterThan(result[1].priority);
    });

    it('should return empty array for non-existent entity', async () => {
      (prisma.entity.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await MultiUserAssignmentService.suggestOptimalAssignments('nonexistent');

      expect(result).toEqual([]);
    });

    it('should exclude already assigned users', async () => {
      const entity = {
        id: 'entity123',
        type: 'COMMUNITY',
        assignments: [{ userId: 'user1' }]
      };

      const availableUsers = [
        {
          id: 'user2', // Not assigned
          email: 'user2@test.com',
          firstName: 'Jane',
          lastName: 'Doe',
          roles: [{ role: { name: 'ASSESSOR' } }],
          assignments: []
        }
      ];

      (prisma.entity.findUnique as jest.Mock).mockResolvedValue(entity);
      (prisma.user.findMany as jest.Mock).mockResolvedValue(availableUsers);

      const result = await MultiUserAssignmentService.suggestOptimalAssignments('entity123');

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: {
              notIn: ['user1']
            }
          })
        })
      );
    });
  });
});