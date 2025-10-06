import { prisma } from '@/lib/db/client';

export interface EntityCollaboration {
  entityId: string;
  entityName: string;
  entityType: string;
  assignedUsers: Array<{
    userId: string;
    email: string;
    name: string;
    roles: string[];
    assignedAt: Date;
    assignedBy: string;
  }>;
  assessorCount: number;
  responderCount: number;
  totalAssignments: number;
}

export interface UserAssignmentOverview {
  userId: string;
  email: string;
  name: string;
  roles: string[];
  assignedEntities: Array<{
    entityId: string;
    entityName: string;
    entityType: string;
    assignedAt: Date;
    sharedWith: string[]; // Other users assigned to same entity
  }>;
  collaborations: number; // Count of entities with multiple users
}

export class MultiUserAssignmentService {
  /**
   * Get collaboration overview for an entity (all assigned users)
   */
  static async getEntityCollaboration(entityId: string): Promise<EntityCollaboration | null> {
    try {
      const entity = await prisma.entity.findUnique({
        where: { id: entityId },
        include: {
          assignments: {
            include: {
              user: {
                include: {
                  roles: {
                    include: {
                      role: true
                    }
                  }
                }
              }
            },
            orderBy: {
              assignedAt: 'asc'
            }
          }
        }
      });

      if (!entity) {
        return null;
      }

      const assignedUsers = entity.assignments.map(assignment => ({
        userId: assignment.user.id,
        email: assignment.user.email,
        name: assignment.user.firstName && assignment.user.lastName 
          ? `${assignment.user.firstName} ${assignment.user.lastName}`
          : assignment.user.email,
        roles: assignment.user.roles.map(ur => ur.role.name),
        assignedAt: assignment.assignedAt,
        assignedBy: assignment.assignedBy
      }));

      const assessorCount = assignedUsers.filter(user => 
        user.roles.includes('ASSESSOR')
      ).length;

      const responderCount = assignedUsers.filter(user => 
        user.roles.includes('RESPONDER')
      ).length;

      return {
        entityId: entity.id,
        entityName: entity.name,
        entityType: entity.type,
        assignedUsers,
        assessorCount,
        responderCount,
        totalAssignments: assignedUsers.length
      };

    } catch (error) {
      console.error('Error getting entity collaboration:', error);
      return null;
    }
  }

  /**
   * Get user assignment overview with collaboration details
   */
  static async getUserAssignmentOverview(userId: string): Promise<UserAssignmentOverview | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          roles: {
            include: {
              role: true
            }
          },
          assignments: {
            include: {
              entity: {
                include: {
                  assignments: {
                    include: {
                      user: {
                        select: {
                          id: true,
                          email: true,
                          firstName: true,
                          lastName: true
                        }
                      }
                    }
                  }
                }
              }
            },
            orderBy: {
              assignedAt: 'desc'
            }
          }
        }
      });

      if (!user) {
        return null;
      }

      const assignedEntities = user.assignments.map(assignment => {
        const sharedWith = assignment.entity.assignments
          .filter(a => a.userId !== userId)
          .map(a => a.user.firstName && a.user.lastName 
            ? `${a.user.firstName} ${a.user.lastName}`
            : a.user.email
          );

        return {
          entityId: assignment.entity.id,
          entityName: assignment.entity.name,
          entityType: assignment.entity.type,
          assignedAt: assignment.assignedAt,
          sharedWith
        };
      });

      const collaborations = assignedEntities.filter(entity => 
        entity.sharedWith.length > 0
      ).length;

      return {
        userId: user.id,
        email: user.email,
        name: user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}`
          : user.email,
        roles: user.roles.map(ur => ur.role.name),
        assignedEntities,
        collaborations
      };

    } catch (error) {
      console.error('Error getting user assignment overview:', error);
      return null;
    }
  }

  /**
   * Find entities with multiple assigned users (collaborative entities)
   */
  static async getCollaborativeEntities(limit = 10): Promise<EntityCollaboration[]> {
    try {
      const entities = await prisma.entity.findMany({
        include: {
          assignments: {
            include: {
              user: {
                include: {
                  roles: {
                    include: {
                      role: true
                    }
                  }
                }
              }
            }
          }
        },
        where: {
          assignments: {
            some: {} // Has at least one assignment
          }
        },
        take: limit,
        orderBy: {
          updatedAt: 'desc'
        }
      });

      const collaborativeEntities = entities
        .filter(entity => entity.assignments.length > 1)
        .map(entity => {
          const assignedUsers = entity.assignments.map(assignment => ({
            userId: assignment.user.id,
            email: assignment.user.email,
            name: assignment.user.firstName && assignment.user.lastName 
              ? `${assignment.user.firstName} ${assignment.user.lastName}`
              : assignment.user.email,
            roles: assignment.user.roles.map(ur => ur.role.name),
            assignedAt: assignment.assignedAt,
            assignedBy: assignment.assignedBy
          }));

          const assessorCount = assignedUsers.filter(user => 
            user.roles.includes('ASSESSOR')
          ).length;

          const responderCount = assignedUsers.filter(user => 
            user.roles.includes('RESPONDER')
          ).length;

          return {
            entityId: entity.id,
            entityName: entity.name,
            entityType: entity.type,
            assignedUsers,
            assessorCount,
            responderCount,
            totalAssignments: assignedUsers.length
          };
        });

      return collaborativeEntities;

    } catch (error) {
      console.error('Error getting collaborative entities:', error);
      return [];
    }
  }

  /**
   * Check for assignment conflicts when assigning multiple users
   */
  static async checkAssignmentConflicts(
    entityId: string,
    newUserIds: string[]
  ): Promise<{
    conflicts: Array<{
      userId: string;
      email: string;
      conflictReason: string;
    }>;
    warnings: Array<{
      userId: string;
      email: string;
      warningMessage: string;
    }>;
  }> {
    try {
      const conflicts: Array<{ userId: string; email: string; conflictReason: string; }> = [];
      const warnings: Array<{ userId: string; email: string; warningMessage: string; }> = [];

      // Get existing assignments
      const existingAssignments = await prisma.entityAssignment.findMany({
        where: { entityId },
        include: {
          user: {
            include: {
              roles: {
                include: {
                  role: true
                }
              }
            }
          }
        }
      });

      // Check each new user for conflicts
      for (const userId of newUserIds) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            roles: {
              include: {
                role: true
              }
            }
          }
        });

        if (!user) {
          conflicts.push({
            userId,
            email: 'unknown',
            conflictReason: 'User not found'
          });
          continue;
        }

        // Check if already assigned
        const alreadyAssigned = existingAssignments.some(a => a.userId === userId);
        if (alreadyAssigned) {
          conflicts.push({
            userId,
            email: user.email,
            conflictReason: 'Already assigned to this entity'
          });
          continue;
        }

        // Check if user has appropriate roles
        const userRoles = user.roles.map(ur => ur.role.name);
        const hasAppropriateRole = userRoles.some(role => 
          ['ASSESSOR', 'RESPONDER'].includes(role)
        );

        if (!hasAppropriateRole) {
          conflicts.push({
            userId,
            email: user.email,
            conflictReason: 'User does not have ASSESSOR or RESPONDER role'
          });
          continue;
        }

        // Check for role balance warnings
        const existingAssessors = existingAssignments.filter(a => 
          a.user.roles.some(ur => ur.role.name === 'ASSESSOR')
        ).length;

        const existingResponders = existingAssignments.filter(a => 
          a.user.roles.some(ur => ur.role.name === 'RESPONDER')
        ).length;

        if (userRoles.includes('ASSESSOR') && existingAssessors > 2) {
          warnings.push({
            userId,
            email: user.email,
            warningMessage: 'Entity already has multiple assessors assigned'
          });
        }

        if (userRoles.includes('RESPONDER') && existingResponders > 3) {
          warnings.push({
            userId,
            email: user.email,
            warningMessage: 'Entity already has multiple responders assigned'
          });
        }
      }

      return { conflicts, warnings };

    } catch (error) {
      console.error('Error checking assignment conflicts:', error);
      return { conflicts: [], warnings: [] };
    }
  }

  /**
   * Get assignment statistics for multiple user support
   */
  static async getAssignmentStatistics(): Promise<{
    totalEntities: number;
    entitiesWithAssignments: number;
    entitiesWithMultipleUsers: number;
    averageUsersPerEntity: number;
    totalAssignments: number;
    collaborationRate: number;
  }> {
    try {
      const [totalEntities, assignmentStats] = await Promise.all([
        prisma.entity.count(),
        prisma.entity.findMany({
          include: {
            _count: {
              select: {
                assignments: true
              }
            }
          }
        })
      ]);

      const entitiesWithAssignments = assignmentStats.filter(
        entity => entity._count.assignments > 0
      ).length;

      const entitiesWithMultipleUsers = assignmentStats.filter(
        entity => entity._count.assignments > 1
      ).length;

      const totalAssignments = assignmentStats.reduce(
        (sum, entity) => sum + entity._count.assignments, 0
      );

      const averageUsersPerEntity = entitiesWithAssignments > 0 
        ? totalAssignments / entitiesWithAssignments 
        : 0;

      const collaborationRate = entitiesWithAssignments > 0 
        ? (entitiesWithMultipleUsers / entitiesWithAssignments) * 100 
        : 0;

      return {
        totalEntities,
        entitiesWithAssignments,
        entitiesWithMultipleUsers,
        averageUsersPerEntity: Math.round(averageUsersPerEntity * 100) / 100,
        totalAssignments,
        collaborationRate: Math.round(collaborationRate * 100) / 100
      };

    } catch (error) {
      console.error('Error getting assignment statistics:', error);
      return {
        totalEntities: 0,
        entitiesWithAssignments: 0,
        entitiesWithMultipleUsers: 0,
        averageUsersPerEntity: 0,
        totalAssignments: 0,
        collaborationRate: 0
      };
    }
  }

  /**
   * Suggest optimal user assignments for entity
   */
  static async suggestOptimalAssignments(
    entityId: string,
    requiredRoles: string[] = ['ASSESSOR', 'RESPONDER']
  ): Promise<Array<{
    userId: string;
    email: string;
    name: string;
    roles: string[];
    reason: string;
    priority: number;
  }>> {
    try {
      // Get entity details
      const entity = await prisma.entity.findUnique({
        where: { id: entityId },
        include: {
          assignments: {
            include: {
              user: {
                include: {
                  roles: {
                    include: {
                      role: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!entity) {
        return [];
      }

      // Get users with required roles not already assigned
      const assignedUserIds = entity.assignments.map(a => a.userId);
      
      const availableUsers = await prisma.user.findMany({
        where: {
          id: {
            notIn: assignedUserIds
          },
          roles: {
            some: {
              role: {
                name: {
                  in: requiredRoles
                }
              }
            }
          },
          isActive: true,
          isLocked: false
        },
        include: {
          roles: {
            include: {
              role: true
            }
          },
          assignments: {
            include: {
              entity: true
            }
          }
        }
      });

      // Score and rank users
      const suggestions = availableUsers.map(user => {
        const userRoles = user.roles.map(ur => ur.role.name);
        const assignmentCount = user.assignments.length;
        
        // Calculate priority based on various factors
        let priority = 100;
        let reasons: string[] = [];

        // Prefer users with required roles
        if (userRoles.includes('ASSESSOR')) {
          priority += 20;
          reasons.push('Has assessor role');
        }
        if (userRoles.includes('RESPONDER')) {
          priority += 15;
          reasons.push('Has responder role');
        }

        // Prefer users with fewer existing assignments (load balancing)
        if (assignmentCount < 3) {
          priority += 10;
          reasons.push('Low assignment load');
        } else if (assignmentCount > 5) {
          priority -= 5;
          reasons.push('High assignment load');
        }

        // Prefer users assigned to similar entity types
        const similarEntityAssignments = user.assignments.filter(
          a => a.entity.type === entity.type
        ).length;
        
        if (similarEntityAssignments > 0) {
          priority += 5;
          reasons.push(`Experience with ${entity.type} entities`);
        }

        return {
          userId: user.id,
          email: user.email,
          name: user.firstName && user.lastName 
            ? `${user.firstName} ${user.lastName}`
            : user.email,
          roles: userRoles,
          reason: reasons.join(', '),
          priority
        };
      });

      // Sort by priority and return top suggestions
      return suggestions
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 5);

    } catch (error) {
      console.error('Error suggesting optimal assignments:', error);
      return [];
    }
  }
}