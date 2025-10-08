import { NextRequest, NextResponse } from 'next/server';
import { rapidAssessmentService } from '@/lib/services/rapid-assessment.service';
import { requireRole } from '@/lib/auth/role-check';
import { getCurrentUser } from '@/lib/auth/get-current-user';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/v1/rapid-assessments/[id]/gap-analysis
 * Perform gap analysis on a specific rapid assessment
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

    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Assessment ID is required',
          errors: ['Assessment ID parameter is missing']
        },
        { status: 400 }
      );
    }

    const result = await rapidAssessmentService.performGapAnalysis(id);

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          message: 'Assessment not found or gap analysis failed',
          errors: ['Unable to perform gap analysis on the provided assessment']
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Gap analysis completed successfully'
    });
  } catch (error) {
    console.error('Error performing gap analysis:', error);
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