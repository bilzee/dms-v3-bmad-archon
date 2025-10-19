import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withAuth, requireRole } from '@/lib/auth/middleware'
import { RapidAssessmentService } from '@/lib/services/rapid-assessment.service'
import { 
  CreateRapidAssessmentSchema,
  QueryRapidAssessmentSchema 
} from '@/lib/validation/rapid-assessment'
import { RapidAssessmentListResponse } from '@/types/rapid-assessment'

export const GET = withAuth(async (request, context) => {
  try {
    const url = new URL(request.url)
    const searchParams = Object.fromEntries(url.searchParams)
    
    const query = QueryRapidAssessmentSchema.parse(searchParams)
    
    console.log('DEBUG: Rapid Assessments API - Context structure:', {
      contextKeys: Object.keys(context),
      userId: context.userId,
      userKeys: context.user ? Object.keys(context.user) : 'no user',
      originalUserId: query.userId
    });
    
    // Handle userId "me" substitution
    const effectiveUserId = query.userId === 'me' ? context.userId : query.userId
    
    console.log('DEBUG: Rapid Assessments API - Effective userId:', effectiveUserId);
    
    // If userId is provided and matches current user, use user-specific endpoint
    
    // For ASSESSOR role users requesting their own assessments (userId=me), always use user-specific path
    const shouldUseUserPath = (effectiveUserId && effectiveUserId === context.userId) || 
                             (context.roles.includes('ASSESSOR') && query.userId === 'me');
    
    console.log('DEBUG: Rapid Assessments API - Path decision:', {
      effectiveUserId,
      contextUserId: context.userId,
      queryUserId: query.userId,
      userRoles: context.roles,
      hasAssessorRole: context.roles.includes('ASSESSOR'),
      isRequestingOwnAssessments: query.userId === 'me',
      shouldUseUserPath
    });
    
    if (shouldUseUserPath) {
      console.log('DEBUG: Rapid Assessments API - Condition passed! Entering user-specific branch...');
      console.log('DEBUG: Rapid Assessments API - Calling findByUserId with:', {
        userId: context.userId,
        query: { ...query, userId: effectiveUserId }
      });
      
      const result = await RapidAssessmentService.findByUserId(
        context.userId,
        { ...query, userId: effectiveUserId }
      );
      
      console.log('DEBUG: Rapid Assessments API - findByUserId result:', {
        total: result.total,
        assessmentsCount: result.assessments?.length || 0,
        firstAssessmentId: result.assessments?.[0]?.id || 'none',
        totalPages: result.totalPages
      });
      
      const { assessments, total, totalPages } = result;

      const response: RapidAssessmentListResponse = {
        data: assessments,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: uuidv4(),
          debug: {
            userId: context.userId,
            assessmentsCount: assessments.length,
            total,
            effectiveUserId
          }
        }
      }

      console.log('DEBUG: Rapid Assessments API - Response being sent:', {
        assessmentsCount: assessments.length,
        total,
        effectiveUserId,
        sampleAssessment: assessments[0]?.id || 'none'
      });

      return NextResponse.json(response, { status: 200 })
    } else {
      console.log('DEBUG: Rapid Assessments API - Condition failed! Entering admin/coordinator branch...');
      console.log('DEBUG: Rapid Assessments API - Falling back to findAll() method');
    }
    
    // Otherwise, get all assessments (admin/coordinator access)
    const { assessments, total, totalPages } = await RapidAssessmentService.findAll(query)
    console.log('DEBUG: Rapid Assessments API - findAll result:', {
      total,
      assessmentsCount: assessments?.length || 0,
      firstAssessmentId: assessments?.[0]?.id || 'none',
      totalPages
    });

    const response: RapidAssessmentListResponse = {
      data: assessments,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: uuidv4()
      }
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('Get rapid assessments error:', error)
    
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
    )
  }
})

export const POST = withAuth(
  requireRole('ASSESSOR')(async (request, context) => {
    try {
      const body = await request.json()
      const input = CreateRapidAssessmentSchema.parse(body)
      
      const assessment = await RapidAssessmentService.create(input, context.user.userId)

      return NextResponse.json(
        {
          data: assessment,
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 201 }
      )
    } catch (error) {
      console.error('Create rapid assessment error:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      if (errorMessage.includes('validation') || errorMessage.includes('Zod')) {
        return NextResponse.json(
          {
            error: errorMessage,
            meta: {
              timestamp: new Date().toISOString(),
              version: '1.0.0',
              requestId: uuidv4()
            }
          },
          { status: 400 }
        )
      }
      
      if (errorMessage.includes('assigned') || errorMessage.includes('EntityAssignment')) {
        return NextResponse.json(
          {
            error: errorMessage,
            meta: {
              timestamp: new Date().toISOString(),
              version: '1.0.0',
              requestId: uuidv4()
            }
          },
          { status: 403 }
        )
      }
      
      return NextResponse.json(
        {
          error: errorMessage,
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 500 }
      )
    }
  })
)