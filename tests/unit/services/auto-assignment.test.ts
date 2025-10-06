import { AutoAssignmentService } from '@/lib/assignment/auto-assignment';
import { prisma } from '@/lib/db/client';

// Mock Prisma
jest.mock('@/lib/db/client', () => ({
  prisma: {
    entity: {
      findUnique: jest.fn(),
    },
    entityAssignment: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('AutoAssignmentService', () => {
  const mockEntity = {
    id: 'entity123',
    name: 'Test Community',
    type: 'COMMUNITY',
    location: 'Test Location'
  };

  const mockUser = {
    id: 'user123',
    email: 'assessor@test.com',
    roles: [
      {
        role: {
          id: 'role123',
          name: 'ASSESSOR'
        }
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset configuration to default
    AutoAssignmentService.updateConfig({
      rules: [
        {
          entityType: 'COMMUNITY',
          userRole: 'ASSESSOR',
          autoAssignOnCreation: true,
          inheritFromWorkflow: true,
          notificationEnabled: true
        }
      ],
      globalSettings: {
        enableAutoAssignment: true,
        enableInheritance: true,
        enableNotifications: true
      }
    });
  });

  describe('autoAssignOnCreation', () => {
    it('should auto-assign user when rule exists and conditions are met', async () => {
      (prisma.entity.findUnique as jest.Mock).mockResolvedValue(mockEntity);
      (prisma.entityAssignment.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.entityAssignment.create as jest.Mock).mockResolvedValue({
        id: 'assignment123',
        userId: 'user123',
        entityId: 'entity123',
        assignedBy: 'user123'
      });

      const result = await AutoAssignmentService.autoAssignOnCreation(
        'user123',
        'entity123',
        'ASSESSOR',
        'user123'
      );

      expect(result).toBe(true);
      expect(prisma.entityAssignment.create).toHaveBeenCalledWith({
        data: {
          userId: 'user123',
          entityId: 'entity123',
          assignedBy: 'user123'
        }
      });
    });

    it('should not auto-assign when global setting is disabled', async () => {
      // Disable auto-assignment globally
      AutoAssignmentService.updateConfig({
        globalSettings: {
          enableAutoAssignment: false,
          enableInheritance: true,
          enableNotifications: true
        }
      });

      const result = await AutoAssignmentService.autoAssignOnCreation(
        'user123',
        'entity123',
        'ASSESSOR',
        'user123'
      );

      expect(result).toBe(false);
      expect(prisma.entity.findUnique).not.toHaveBeenCalled();
    });

    it('should not auto-assign when no matching rule exists', async () => {
      (prisma.entity.findUnique as jest.Mock).mockResolvedValue({
        ...mockEntity,
        type: 'STATE' // No rule for STATE entities
      });

      const result = await AutoAssignmentService.autoAssignOnCreation(
        'user123',
        'entity123',
        'ASSESSOR',
        'user123'
      );

      expect(result).toBe(false);
      expect(prisma.entityAssignment.create).not.toHaveBeenCalled();
    });

    it('should return true if assignment already exists', async () => {
      (prisma.entity.findUnique as jest.Mock).mockResolvedValue(mockEntity);
      (prisma.entityAssignment.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing123',
        userId: 'user123',
        entityId: 'entity123'
      });

      const result = await AutoAssignmentService.autoAssignOnCreation(
        'user123',
        'entity123',
        'ASSESSOR',
        'user123'
      );

      expect(result).toBe(true);
      expect(prisma.entityAssignment.create).not.toHaveBeenCalled();
    });

    it('should handle entity not found gracefully', async () => {
      (prisma.entity.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await AutoAssignmentService.autoAssignOnCreation(
        'user123',
        'nonexistent',
        'ASSESSOR',
        'user123'
      );

      expect(result).toBe(false);
      expect(prisma.entityAssignment.create).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      (prisma.entity.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await AutoAssignmentService.autoAssignOnCreation(
        'user123',
        'entity123',
        'ASSESSOR',
        'user123'
      );

      expect(result).toBe(false);
    });
  });

  describe('inheritAssignments', () => {
    it('should inherit assignment when rule allows and source assignment exists', async () => {
      const targetEntity = { ...mockEntity, id: 'target123' };
      
      (prisma.entity.findUnique as jest.Mock).mockResolvedValue(targetEntity);
      (prisma.entityAssignment.findUnique as jest.Mock)
        .mockResolvedValueOnce({ // Source assignment exists
          id: 'source123',
          userId: 'user123',
          entityId: 'entity123'
        })
        .mockResolvedValueOnce(null); // Target assignment doesn't exist
      (prisma.entityAssignment.create as jest.Mock).mockResolvedValue({
        id: 'inherited123',
        userId: 'user123',
        entityId: 'target123'
      });

      const result = await AutoAssignmentService.inheritAssignments(
        'user123',
        'entity123',
        'target123',
        'ASSESSOR',
        'user123'
      );

      expect(result).toBe(true);
      expect(prisma.entityAssignment.create).toHaveBeenCalledWith({
        data: {
          userId: 'user123',
          entityId: 'target123',
          assignedBy: 'user123'
        }
      });
    });

    it('should not inherit when inheritance is disabled globally', async () => {
      AutoAssignmentService.updateConfig({
        globalSettings: {
          enableAutoAssignment: true,
          enableInheritance: false,
          enableNotifications: true
        }
      });

      const result = await AutoAssignmentService.inheritAssignments(
        'user123',
        'entity123',
        'target123',
        'ASSESSOR',
        'user123'
      );

      expect(result).toBe(false);
      expect(prisma.entity.findUnique).not.toHaveBeenCalled();
    });

    it('should not inherit when no source assignment exists', async () => {
      const targetEntity = { ...mockEntity, id: 'target123' };
      
      (prisma.entity.findUnique as jest.Mock).mockResolvedValue(targetEntity);
      (prisma.entityAssignment.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await AutoAssignmentService.inheritAssignments(
        'user123',
        'entity123',
        'target123',
        'ASSESSOR',
        'user123'
      );

      expect(result).toBe(false);
      expect(prisma.entityAssignment.create).not.toHaveBeenCalled();
    });
  });

  describe('autoAssignAssessor', () => {
    it('should call autoAssignOnCreation with ASSESSOR role', async () => {
      const spy = jest.spyOn(AutoAssignmentService, 'autoAssignOnCreation')
        .mockResolvedValue(true);

      const result = await AutoAssignmentService.autoAssignAssessor(
        'assessor123',
        'entity123',
        'coordinator123'
      );

      expect(result).toBe(true);
      expect(spy).toHaveBeenCalledWith('assessor123', 'entity123', 'ASSESSOR', 'coordinator123');

      spy.mockRestore();
    });
  });

  describe('autoAssignResponder', () => {
    it('should call autoAssignOnCreation with RESPONDER role', async () => {
      const spy = jest.spyOn(AutoAssignmentService, 'autoAssignOnCreation')
        .mockResolvedValue(true);

      const result = await AutoAssignmentService.autoAssignResponder(
        'responder123',
        'entity123',
        'coordinator123'
      );

      expect(result).toBe(true);
      expect(spy).toHaveBeenCalledWith('responder123', 'entity123', 'RESPONDER', 'coordinator123');

      spy.mockRestore();
    });
  });

  describe('configuration management', () => {
    it('should get current configuration', () => {
      const config = AutoAssignmentService.getConfig();
      
      expect(config).toHaveProperty('rules');
      expect(config).toHaveProperty('globalSettings');
      expect(config.globalSettings.enableAutoAssignment).toBe(true);
    });

    it('should update configuration', () => {
      const newConfig = {
        globalSettings: {
          enableAutoAssignment: false,
          enableInheritance: false,
          enableNotifications: false
        }
      };

      AutoAssignmentService.updateConfig(newConfig);
      const config = AutoAssignmentService.getConfig();

      expect(config.globalSettings.enableAutoAssignment).toBe(false);
      expect(config.globalSettings.enableInheritance).toBe(false);
      expect(config.globalSettings.enableNotifications).toBe(false);
    });

    it('should check if auto-assignment is enabled for entity type and role', () => {
      expect(AutoAssignmentService.isAutoAssignmentEnabled('COMMUNITY', 'ASSESSOR')).toBe(true);
      expect(AutoAssignmentService.isAutoAssignmentEnabled('STATE', 'ASSESSOR')).toBe(false);
    });

    it('should check if inheritance is enabled for entity type and role', () => {
      expect(AutoAssignmentService.isInheritanceEnabled('COMMUNITY', 'ASSESSOR')).toBe(true);
      expect(AutoAssignmentService.isInheritanceEnabled('STATE', 'ASSESSOR')).toBe(false);
    });
  });

  describe('bulkAutoAssignOnEntityCreation', () => {
    it('should auto-assign creator when they have appropriate roles', async () => {
      const entity = { ...mockEntity, type: 'COMMUNITY' };
      const creator = {
        id: 'creator123',
        roles: [
          { role: { name: 'ASSESSOR' } },
          { role: { name: 'RESPONDER' } }
        ]
      };

      (prisma.entity.findUnique as jest.Mock).mockResolvedValue(entity);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(creator);

      const autoAssignSpy = jest.spyOn(AutoAssignmentService, 'autoAssignOnCreation')
        .mockResolvedValue(true);

      await AutoAssignmentService.bulkAutoAssignOnEntityCreation('entity123', 'creator123');

      expect(autoAssignSpy).toHaveBeenCalledWith('creator123', 'entity123', 'ASSESSOR', 'creator123');
      expect(autoAssignSpy).toHaveBeenCalledWith('creator123', 'entity123', 'RESPONDER', 'creator123');

      autoAssignSpy.mockRestore();
    });

    it('should handle missing entity gracefully', async () => {
      (prisma.entity.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        AutoAssignmentService.bulkAutoAssignOnEntityCreation('nonexistent', 'creator123')
      ).resolves.not.toThrow();
    });

    it('should handle missing creator gracefully', async () => {
      (prisma.entity.findUnique as jest.Mock).mockResolvedValue(mockEntity);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        AutoAssignmentService.bulkAutoAssignOnEntityCreation('entity123', 'nonexistent')
      ).resolves.not.toThrow();
    });
  });
});