import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { withAuth, AuthContext, requireRole } from '@/lib/auth/middleware';

interface RouteParams {
  params: Promise<{ id: string }>
}

export const DELETE = withAuth(
  requireRole('COORDINATOR')(
    async (request: NextRequest, context: AuthContext, { params }: RouteParams) => {
      try {
        const { id } = await params;

    // Check if assignment exists
    const assignment = await prisma.entityAssignment.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        entity: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Delete the assignment
    await prisma.entityAssignment.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Assignment deleted successfully',
      data: assignment
    });

  } catch (error) {
    console.error('Error deleting entity assignment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
    }
  )
)

export const GET = withAuth(async (request: NextRequest, context: RouteParams) => {
  try {
    const { id } = context.params;

    // Get specific assignment
    const assignment = await prisma.entityAssignment.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            roles: {
              include: {
                role: true
              }
            }
          }
        },
        entity: {
          select: {
            id: true,
            name: true,
            type: true,
            location: true,
            coordinates: true,
            metadata: true
          }
        }
      }
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: assignment
    });

  } catch (error) {
    console.error('Error fetching entity assignment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});