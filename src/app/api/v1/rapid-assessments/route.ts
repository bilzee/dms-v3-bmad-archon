import { NextRequest, NextResponse } from 'next/server';
import { rapidAssessmentService } from '@/lib/services/rapid-assessment.service';
import { rapidAssessmentSchemas, paginationSchema } from '@/lib/validation/rapid-assessment';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { RapidAssessmentType } from '@/types/rapid-assessment';

/**
 * GET /api/v1/rapid-assessments
 * Get all rapid assessments with pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and has assessor role
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has assessor role
    const hasAssessorRole = user.roles && user.roles.includes('ASSESSOR');
    if (!hasAssessorRole) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Assessor role required' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const userId = searchParams.get('userId');
    const assessmentType = searchParams.get('type') as RapidAssessmentType;

    // Validate pagination parameters
    const pagination = paginationSchema.parse({ page, limit });

    let result;
    if (userId) {
      result = await rapidAssessmentService.getAssessmentsByUserId(userId, pagination.page, pagination.limit, assessmentType);
    } else {
      // For now, return all assessments (can be filtered by user assignments later)
      result = await rapidAssessmentService.getAssessmentsByUserId('temp', pagination.page, pagination.limit, assessmentType);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching rapid assessments:', error);
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
 * POST /api/v1/rapid-assessments
 * Create a new rapid assessment
 */
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and has assessor role
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has assessor role
    const hasAssessorRole = user.roles && user.roles.includes('ASSESSOR');
    if (!hasAssessorRole) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Assessor role required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    console.log('Received body:', JSON.stringify(body, null, 2));
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

    // Convert date strings back to Date objects for validation
    const processedBody = {
      ...body,
      rapidAssessmentDate: body.rapidAssessmentDate ? new Date(body.rapidAssessmentDate) : undefined,
      gpsCoordinates: body.gpsCoordinates ? {
        ...body.gpsCoordinates,
        timestamp: body.gpsCoordinates.timestamp ? new Date(body.gpsCoordinates.timestamp) : undefined
      } : undefined
    };
    
    console.log('Processed body:', JSON.stringify(processedBody, null, 2));

    // Validate the request body
    const validatedData = schema.parse(processedBody);
    console.log('Validated data successfully');

    // Create the assessment
    const result = await rapidAssessmentService.createAssessment(
      validatedData,
      validatedData.rapidAssessmentType
    );

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating rapid assessment:', error);

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