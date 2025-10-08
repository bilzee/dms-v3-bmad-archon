import { NextRequest, NextResponse } from 'next/server';
import { rapidAssessmentService } from '@/lib/services/rapid-assessment.service';
import { rapidAssessmentSchemas } from '@/lib/validation/rapid-assessment';
import { requireRole } from '@/lib/auth/role-check';
import { getCurrentUser } from '@/lib/auth/get-current-user';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/v1/rapid-assessments/[id]
 * Get a specific rapid assessment by ID
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

    const result = await rapidAssessmentService.getAssessmentById(id);

    if (!result.success) {
      if (result.message?.includes('not found')) {
        return NextResponse.json(result, { status: 404 });
      }
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching rapid assessment:', error);
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

/**
 * PUT /api/v1/rapid-assessments/[id]
 * Update a specific rapid assessment
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    const body = await request.json();
    const { rapidAssessmentType } = body;

    // Validate assessment type and use appropriate schema
    const schema = rapidAssessmentSchemas[rapidAssessmentType?.toLowerCase()];
    if (!schema) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid assessment type',
          errors: ['Valid assessment type is required']
        },
        { status: 400 }
      );
    }

    // Validate the request body (partial update allowed)
    const validatedData = schema.parse(body);

    // Update the assessment
    const result = await rapidAssessmentService.updateAssessment(
      id,
      validatedData,
      validatedData.rapidAssessmentType
    );

    if (!result.success) {
      if (result.message?.includes('not found')) {
        return NextResponse.json(result, { status: 404 });
      }
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating rapid assessment:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation error',
          errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        },
        { status: 400 }
      );
    }

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

/**
 * DELETE /api/v1/rapid-assessments/[id]
 * Delete a specific rapid assessment
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const result = await rapidAssessmentService.deleteAssessment(id);

    if (!result.success) {
      if (result.message?.includes('not found')) {
        return NextResponse.json(result, { status: 404 });
      }
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error deleting rapid assessment:', error);
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