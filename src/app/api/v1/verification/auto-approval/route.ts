import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';

const bulkUpdateSchema = z.object({
  entityIds: z.array(z.string()),
  enabled: z.boolean(),
  conditions: z.object({
    assessmentTypes: z.array(z.string()).optional(),
    maxPriority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    requiresDocumentation: z.boolean().optional(),
  }).optional(),
});

// GET - Get all auto-approval configurations
export const GET = withAuth(async (request: NextRequest, context) => {
  try {
    const { user } = context;
    
    // Check if user has coordinator role
    if (!user.roles.includes('COORDINATOR')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Coordinator role required.' },
        { status: 403 }
      );
    }
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const enabledOnly = searchParams.get('enabledOnly') === 'true';

    // Build where clause
    const whereClause: any = {
      isActive: true
    };

    if (entityType) {
      whereClause.type = entityType;
    }

    if (enabledOnly) {
      whereClause.autoApproveEnabled = true;
    }

    // Get entities with auto-approval configurations
    const entities = await prisma.entity.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        type: true,
        location: true,
        autoApproveEnabled: true,
        metadata: true,
        updatedAt: true,
        _count: {
          select: {
            rapidAssessments: {
              where: {
                verificationStatus: 'AUTO_VERIFIED'
              }
            }
          }
        }
      },
      orderBy: [
        { autoApproveEnabled: 'desc' },
        { name: 'asc' }
      ]
    });

    // Format response with auto-approval configs
    const configurations = entities.map(entity => {
      const metadata = entity.metadata as any;
      const autoApprovalConfig = metadata?.autoApproval || {};
      
      return {
        entityId: entity.id,
        entityName: entity.name,
        entityType: entity.type,
        entityLocation: entity.location,
        enabled: entity.autoApproveEnabled,
        conditions: {
          assessmentTypes: autoApprovalConfig.assessmentTypes || [],
          maxPriority: autoApprovalConfig.maxPriority || 'MEDIUM',
          requiresDocumentation: autoApprovalConfig.requiresDocumentation || false,
        },
        lastModified: entity.updatedAt,
        stats: {
          autoVerifiedCount: entity._count.rapidAssessments
        }
      };
    });

    // Calculate summary statistics
    const summary = {
      totalEntities: entities.length,
      enabledCount: entities.filter(e => e.autoApproveEnabled).length,
      disabledCount: entities.filter(e => !e.autoApproveEnabled).length,
      totalAutoVerified: entities.reduce((sum, e) => sum + e._count.rapidAssessments, 0)
    };

    return NextResponse.json({
      success: true,
      data: configurations,
      summary,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        requestId: crypto.randomUUID()
      }
    });

  } catch (error) {
    console.error('Get auto-approval configs error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// PUT - Bulk update auto-approval configurations
export const PUT = withAuth(async (request: NextRequest, context) => {
  try {
    const { user } = context;
    
    // Check if user has coordinator role
    if (!user.roles.includes('COORDINATOR')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Coordinator role required.' },
        { status: 403 }
      );
    }
    const body = await request.json();
    const validatedData = bulkUpdateSchema.parse(body);

    if (validatedData.entityIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one entity ID is required' },
        { status: 400 }
      );
    }

    // Start transaction for bulk auto-approval configuration update
    const result = await prisma.$transaction(async (tx) => {
      // Get entities to update
      const entities = await tx.entity.findMany({
        where: {
          id: { in: validatedData.entityIds },
          isActive: true
        }
      });

      if (entities.length === 0) {
        throw new Error('No valid entities found for update');
      }

      const updatedEntities = [];

      // Update each entity
      for (const entity of entities) {
        const currentMetadata = (entity.metadata as any) || {};
        
        // Update metadata with auto-approval conditions
        const updatedMetadata = {
          ...currentMetadata,
          autoApproval: {
            assessmentTypes: validatedData.conditions?.assessmentTypes || [],
            maxPriority: validatedData.conditions?.maxPriority || 'MEDIUM',
            requiresDocumentation: validatedData.conditions?.requiresDocumentation || false,
            lastModifiedBy: user.userId,
            lastModifiedAt: new Date().toISOString(),
          }
        };

        // Update entity
        const updatedEntity = await tx.entity.update({
          where: { id: entity.id },
          data: {
            autoApproveEnabled: validatedData.enabled,
            metadata: updatedMetadata
          },
          select: {
            id: true,
            name: true,
            type: true,
            autoApproveEnabled: true,
            metadata: true,
            updatedAt: true
          }
        });

        updatedEntities.push(updatedEntity);

        // Create audit log entry for each entity
        await tx.auditLog.create({
          data: {
            userId: user.userId,
            action: 'BULK_AUTO_APPROVAL_CONFIG_UPDATED',
            resource: 'Entity',
            resourceId: entity.id,
            newValues: {
              entityName: entity.name,
              previousEnabled: entity.autoApproveEnabled,
              newEnabled: validatedData.enabled,
              conditions: validatedData.conditions,
              bulkUpdate: true,
              totalEntitiesUpdated: entities.length,
              configuredBy: user.name || user.userId
            }
          }
        });
      }

      return updatedEntities;
    });

    // Format response
    const configurations = result.map(entity => {
      const metadata = entity.metadata as any;
      const autoApprovalConfig = metadata?.autoApproval || {};
      
      return {
        entityId: entity.id,
        entityName: entity.name,
        entityType: entity.type,
        enabled: entity.autoApproveEnabled,
        conditions: autoApprovalConfig,
        lastModified: entity.updatedAt,
      };
    });

    return NextResponse.json({
      success: true,
      data: configurations,
      message: `Auto-approval configuration updated for ${result.length} entities`,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        requestId: crypto.randomUUID(),
        updatedCount: result.length
      }
    });

  } catch (error) {
    console.error('Bulk update auto-approval config error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }, { status: 400 });
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});