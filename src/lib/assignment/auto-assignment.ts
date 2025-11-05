import { prisma } from '@/lib/db/client';

export interface AutoAssignmentRule {
  entityType: string;
  userRole: string;
  autoAssignOnCreation: boolean;
  inheritFromWorkflow: boolean;
  notificationEnabled: boolean;
}

export interface AutoAssignmentConfig {
  rules: AutoAssignmentRule[];
  globalSettings: {
    enableAutoAssignment: boolean;
    enableInheritance: boolean;
    enableNotifications: boolean;
  };
}

// Default auto-assignment configuration
const DEFAULT_CONFIG: AutoAssignmentConfig = {
  rules: [
    // Assessors auto-assigned to communities when creating assessments
    {
      entityType: 'COMMUNITY',
      userRole: 'ASSESSOR',
      autoAssignOnCreation: true,
      inheritFromWorkflow: true,
      notificationEnabled: true
    },
    // Responders auto-assigned to entities when creating responses
    {
      entityType: 'COMMUNITY',
      userRole: 'RESPONDER',
      autoAssignOnCreation: true,
      inheritFromWorkflow: true,
      notificationEnabled: true
    },
    {
      entityType: 'WARD',
      userRole: 'ASSESSOR',
      autoAssignOnCreation: true,
      inheritFromWorkflow: true,
      notificationEnabled: false
    },
    {
      entityType: 'WARD',
      userRole: 'RESPONDER',
      autoAssignOnCreation: true,
      inheritFromWorkflow: true,
      notificationEnabled: false
    },
    {
      entityType: 'LGA',
      userRole: 'ASSESSOR',
      autoAssignOnCreation: false,
      inheritFromWorkflow: false,
      notificationEnabled: false
    },
    {
      entityType: 'LGA',
      userRole: 'RESPONDER',
      autoAssignOnCreation: false,
      inheritFromWorkflow: false,
      notificationEnabled: false
    }
  ],
  globalSettings: {
    enableAutoAssignment: true,
    enableInheritance: true,
    enableNotifications: true
  }
};

export class AutoAssignmentService {
  private static config: AutoAssignmentConfig = DEFAULT_CONFIG;

  /**
   * Auto-assign user to entity when they create an assessment or response
   */
  static async autoAssignOnCreation(
    userId: string,
    entityId: string,
    userRole: string,
    assignedBy: string = userId
  ): Promise<boolean> {
    try {
      if (!this.config.globalSettings.enableAutoAssignment) {
        return false;
      }

      // Get entity details
      const entity = await prisma.entity.findUnique({
        where: { id: entityId }
      });

      if (!entity) {
        console.error(`Entity not found: ${entityId}`);
        return false;
      }

      // Check if auto-assignment rule exists for this entity type and user role
      const rule = this.config.rules.find(
        r => r.entityType === entity.type && r.userRole === userRole && r.autoAssignOnCreation
      );

      if (!rule) {
        // No auto-assignment rule for this combination
        return false;
      }

      // Check if assignment already exists
      const existingAssignment = await prisma.entityAssignment.findUnique({
        where: {
          userId_entityId: {
            userId,
            entityId
          }
        }
      });

      if (existingAssignment) {
        // Assignment already exists
        return true;
      }

      // Create the auto-assignment
      await prisma.entityAssignment.create({
        data: {
          userId,
          entityId,
          assignedBy
        }
      });

      // Send notification if enabled
      if (rule.notificationEnabled && this.config.globalSettings.enableNotifications) {
        await this.sendAutoAssignmentNotification(userId, entityId, userRole);
      }

      console.log(`Auto-assigned user ${userId} to entity ${entityId} (${entity.type})`);
      return true;

    } catch (error) {
      console.error('Error in auto-assignment:', error);
      return false;
    }
  }

  /**
   * Inherit assignments from related entities in workflow context
   */
  static async inheritAssignments(
    userId: string,
    sourceEntityId: string,
    targetEntityId: string,
    userRole: string,
    assignedBy: string = userId
  ): Promise<boolean> {
    try {
      if (!this.config.globalSettings.enableInheritance) {
        return false;
      }

      // Get target entity details
      const targetEntity = await prisma.entity.findUnique({
        where: { id: targetEntityId }
      });

      if (!targetEntity) {
        return false;
      }

      // Check if inheritance rule exists
      const rule = this.config.rules.find(
        r => r.entityType === targetEntity.type && r.userRole === userRole && r.inheritFromWorkflow
      );

      if (!rule) {
        return false;
      }

      // Check if user is assigned to source entity
      const sourceAssignment = await prisma.entityAssignment.findUnique({
        where: {
          userId_entityId: {
            userId,
            entityId: sourceEntityId
          }
        }
      });

      if (!sourceAssignment) {
        return false;
      }

      // Check if assignment already exists for target
      const existingTargetAssignment = await prisma.entityAssignment.findUnique({
        where: {
          userId_entityId: {
            userId,
            entityId: targetEntityId
          }
        }
      });

      if (existingTargetAssignment) {
        return true;
      }

      // Create inherited assignment
      await prisma.entityAssignment.create({
        data: {
          userId,
          entityId: targetEntityId,
          assignedBy
        }
      });

      console.log(`Inherited assignment for user ${userId} from ${sourceEntityId} to ${targetEntityId}`);
      return true;

    } catch (error) {
      console.error('Error in assignment inheritance:', error);
      return false;
    }
  }

  /**
   * Auto-assign assessor when creating assessment
   */
  static async autoAssignAssessor(
    assessorId: string,
    entityId: string,
    assignedBy: string = assessorId
  ): Promise<boolean> {
    return this.autoAssignOnCreation(assessorId, entityId, 'ASSESSOR', assignedBy);
  }

  /**
   * Auto-assign responder when creating response
   */
  static async autoAssignResponder(
    responderId: string,
    entityId: string,
    assignedBy: string = responderId
  ): Promise<boolean> {
    return this.autoAssignOnCreation(responderId, entityId, 'RESPONDER', assignedBy);
  }

  /**
   * Get auto-assignment configuration
   */
  static getConfig(): AutoAssignmentConfig {
    return this.config;
  }

  /**
   * Update auto-assignment configuration
   */
  static updateConfig(newConfig: Partial<AutoAssignmentConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      rules: newConfig.rules || this.config.rules,
      globalSettings: {
        ...this.config.globalSettings,
        ...(newConfig.globalSettings || {})
      }
    };
  }

  /**
   * Check if auto-assignment is enabled for entity type and role
   */
  static isAutoAssignmentEnabled(entityType: string, userRole: string): boolean {
    if (!this.config.globalSettings.enableAutoAssignment) {
      return false;
    }

    const rule = this.config.rules.find(
      r => r.entityType === entityType && r.userRole === userRole
    );

    return rule?.autoAssignOnCreation || false;
  }

  /**
   * Check if assignment inheritance is enabled
   */
  static isInheritanceEnabled(entityType: string, userRole: string): boolean {
    if (!this.config.globalSettings.enableInheritance) {
      return false;
    }

    const rule = this.config.rules.find(
      r => r.entityType === entityType && r.userRole === userRole
    );

    return rule?.inheritFromWorkflow || false;
  }

  /**
   * Send notification for auto-assignment (placeholder)
   */
  private static async sendAutoAssignmentNotification(
    userId: string,
    entityId: string,
    userRole: string
  ): Promise<void> {
    // In a real implementation, this would integrate with a notification service
    // For now, we'll just log the notification
    try {
      const [user, entity] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, name: true }
        }),
        prisma.entity.findUnique({
          where: { id: entityId },
          select: { name: true, type: true }
        })
      ]);

      if (user && entity) {
        console.log(`Notification: User ${user.email} auto-assigned to ${entity.name} (${entity.type}) as ${userRole}`);
        
        // TODO: Implement actual notification system
        // - Email notification
        // - In-app notification
        // - SMS notification (if configured)
      }
    } catch (error) {
      console.error('Error sending auto-assignment notification:', error);
    }
  }

  /**
   * Bulk auto-assign users based on entity creation
   */
  static async bulkAutoAssignOnEntityCreation(
    entityId: string,
    createdBy: string
  ): Promise<void> {
    try {
      const entity = await prisma.entity.findUnique({
        where: { id: entityId }
      });

      if (!entity) {
        return;
      }

      // Find users who should be auto-assigned to this entity type
      const assessorRule = this.config.rules.find(
        r => r.entityType === entity.type && r.userRole === 'ASSESSOR' && r.autoAssignOnCreation
      );
      
      const responderRule = this.config.rules.find(
        r => r.entityType === entity.type && r.userRole === 'RESPONDER' && r.autoAssignOnCreation
      );

      if (!assessorRule && !responderRule) {
        return;
      }

      // Get users in the same organization or area (this logic would be customized)
      // For now, we'll auto-assign the creator if they have the appropriate role
      const creator = await prisma.user.findUnique({
        where: { id: createdBy },
        include: {
          roles: {
            include: {
              role: true
            }
          }
        }
      });

      if (!creator) {
        return;
      }

      const userRoles = creator.roles.map((ur: any) => ur.role.name);

      // Auto-assign creator if they have assessor role and rule allows it
      if (assessorRule && userRoles.includes('ASSESSOR')) {
        await this.autoAssignOnCreation(createdBy, entityId, 'ASSESSOR', createdBy);
      }

      // Auto-assign creator if they have responder role and rule allows it
      if (responderRule && userRoles.includes('RESPONDER')) {
        await this.autoAssignOnCreation(createdBy, entityId, 'RESPONDER', createdBy);
      }

    } catch (error) {
      console.error('Error in bulk auto-assignment:', error);
    }
  }
}