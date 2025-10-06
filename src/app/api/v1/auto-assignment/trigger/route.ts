import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/verify';
import { triggerAutoAssignment } from '@/lib/assignment/middleware';
import { z } from 'zod';

const triggerAutoAssignmentSchema = z.object({
  type: z.enum(['assessment', 'response', 'entity']),
  userId: z.string().cuid(),
  entityId: z.string().cuid(),
  userRole: z.enum(['ASSESSOR', 'RESPONDER']).optional(),
  assignedBy: z.string().cuid().optional()
});

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyToken(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has coordinator role for manual triggers
    const hasCoordinatorRole = authResult.user.roles.some(
      userRole => userRole.role.name === 'COORDINATOR'
    );

    if (!hasCoordinatorRole) {
      return NextResponse.json(
        { error: 'Forbidden: Only coordinators can manually trigger auto-assignments' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = triggerAutoAssignmentSchema.parse(body);

    // Set assignedBy to current user if not provided
    const assignedBy = validatedData.assignedBy || authResult.user.id;

    // Trigger auto-assignment
    const success = await triggerAutoAssignment(validatedData.type, {
      userId: validatedData.userId,
      entityId: validatedData.entityId,
      userRole: validatedData.userRole,
      assignedBy
    });

    if (success) {
      return NextResponse.json({
        success: true,
        message: `Auto-assignment triggered successfully for ${validatedData.type}`,
        data: {
          type: validatedData.type,
          userId: validatedData.userId,
          entityId: validatedData.entityId,
          assignedBy
        }
      });
    } else {
      return NextResponse.json(
        { error: 'Auto-assignment failed. Check configuration and entity/user validity.' },
        { status: 400 }
      );
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error triggering auto-assignment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}