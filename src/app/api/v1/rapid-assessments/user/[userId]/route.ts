import { NextRequest, NextResponse } from 'next/server';
import { rapidAssessmentService } from '@/lib/services/rapid-assessment.service';
import { paginationSchema } from '@/lib/validation/rapid-assessment';
import { requireRole } from '@/lib/auth/role-check';
import { getCurrentUser } from '@/lib/auth/get-current-user';

interface RouteParams {
  params: {
    userId: string;
  };
}

/**
 * GET /api/v1/rapid-assessments/user/[userId]
 * Get all rapid assessments for a specific user
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Check if user is authenticated and has assessor role
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const hasAssessorRole = await requireRole(user.id, 'ASSESSOR');
    if (!hasAssessorRole) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Assessor role required' },
        { status: 403 }
      );
    }

    const { userId } = params;
    
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: 'User ID is required',
          errors: ['User ID parameter is missing']
        },
        { status: 400 }
      );
    }

    // Parse query parameters for pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Validate pagination parameters
    const pagination = paginationSchema.parse({ page, limit });

    const result = await rapidAssessmentService.getAssessmentsByUserId(
      userId,
      pagination.page,
      pagination.limit
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching user rapid assessments:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      },
      { status: 500 }
    );
  }
}