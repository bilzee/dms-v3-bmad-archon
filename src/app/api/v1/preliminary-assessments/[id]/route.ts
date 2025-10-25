import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { withAuth } from '@/lib/auth/middleware';
import { PreliminaryAssessmentService } from '@/lib/services/preliminary-assessment.service';
import { 
  CreatePreliminaryAssessmentSchema,
  QueryPreliminaryAssessmentSchema,
  UpdatePreliminaryAssessmentSchema
} from '@/lib/validation/preliminary-assessment';
import { PreliminaryAssessmentListResponse } from '@/types/preliminary-assessment';

export const GET = withAuth(async (request, context) => {
  try {
    const { id } = context.params;
    
    if (!id) {
      return NextResponse.json(
        {
          error: 'Assessment ID is required',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 400 }
      );
    }

    const assessment = await PreliminaryAssessmentService.findById(id);
    
    if (!assessment) {
      return NextResponse.json(
        {
          error: 'Assessment not found',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 404 }
      );
    }

    const response: PreliminaryAssessmentListResponse = {
      data: assessment,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: uuidv4()
      }
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Get preliminary assessment error:', error);
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: uuidv4()
        }
      },
      { status: 500 }
    );
  }
});

export const PUT = withAuth(async (request, context) => {
  const { user, roles } = context;
  
  if (!roles.includes('ASSESSOR')) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions. Assessor role required.' },
      { status: 403 }
    );
  }
  
  try {
    const { id } = context.params;
    
    if (!id) {
      return NextResponse.json(
        {
          error: 'Assessment ID is required',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const input = UpdatePreliminaryAssessmentSchema.parse(body);
    
    const assessment = await PreliminaryAssessmentService.update(id, input);

    const response: PreliminaryAssessmentListResponse = {
      data: assessment,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: uuidv4()
      }
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Update preliminary assessment error:', error);
    
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        {
          error: error.message,
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 400 }
      );
    }
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        {
          error: 'Assessment not found',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: uuidv4()
        }
      },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (request, context) => {
  const { user, roles } = context;
  
  if (!roles.includes('ASSESSOR')) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions. Assessor role required.' },
      { status: 403 }
    );
  }
  
  try {
    const { id } = context.params;
    
    if (!id) {
      return NextResponse.json(
        {
          error: 'Assessment ID is required',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 400 }
      );
    }

    await PreliminaryAssessmentService.delete(id);

    return NextResponse.json(
      {
        data: { message: 'Assessment deleted successfully' },
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: uuidv4()
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete preliminary assessment error:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        {
          error: 'Assessment not found',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: uuidv4()
        }
      },
      { status: 500 }
    );
  }
});