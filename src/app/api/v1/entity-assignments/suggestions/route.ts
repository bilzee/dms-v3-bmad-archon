import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/verify';
import { MultiUserAssignmentService } from '@/lib/assignment/multi-user-service';
import { z } from 'zod';

const suggestionQuerySchema = z.object({
  entityId: z.string().cuid(),
  requiredRoles: z.array(z.enum(['ASSESSOR', 'RESPONDER'])).optional()
});

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyToken(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const entityId = url.searchParams.get('entityId');
    const requiredRolesParam = url.searchParams.get('roles');

    if (!entityId) {
      return NextResponse.json(
        { error: 'Entity ID is required' },
        { status: 400 }
      );
    }

    // Parse required roles
    let requiredRoles: string[] = ['ASSESSOR', 'RESPONDER'];
    if (requiredRolesParam) {
      try {
        requiredRoles = requiredRolesParam.split(',').filter(role => 
          ['ASSESSOR', 'RESPONDER'].includes(role)
        );
      } catch {
        // Use default if parsing fails
      }
    }

    const validatedData = suggestionQuerySchema.parse({
      entityId,
      requiredRoles
    });

    // Get optimal assignment suggestions
    const suggestions = await MultiUserAssignmentService.suggestOptimalAssignments(
      validatedData.entityId,
      validatedData.requiredRoles
    );

    return NextResponse.json({
      success: true,
      data: suggestions,
      meta: {
        entityId: validatedData.entityId,
        requiredRoles: validatedData.requiredRoles,
        suggestionCount: suggestions.length
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error getting assignment suggestions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication and coordinator role
    const authResult = await verifyToken(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has coordinator role
    const hasCoordinatorRole = authResult.user.roles.some(
      userRole => userRole.role.name === 'COORDINATOR'
    );

    if (!hasCoordinatorRole) {
      return NextResponse.json(
        { error: 'Forbidden: Only coordinators can check assignment conflicts' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { entityId, userIds } = body;

    if (!entityId || !Array.isArray(userIds)) {
      return NextResponse.json(
        { error: 'Entity ID and user IDs array are required' },
        { status: 400 }
      );
    }

    // Check for assignment conflicts
    const conflictCheck = await MultiUserAssignmentService.checkAssignmentConflicts(
      entityId,
      userIds
    );

    return NextResponse.json({
      success: true,
      data: conflictCheck,
      meta: {
        entityId,
        checkedUsers: userIds.length,
        conflictCount: conflictCheck.conflicts.length,
        warningCount: conflictCheck.warnings.length
      }
    });

  } catch (error) {
    console.error('Error checking assignment conflicts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}