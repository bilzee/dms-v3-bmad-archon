import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withAuth, requireAnyRole } from '@/lib/auth/middleware'
import { PreliminaryAssessmentService } from '@/lib/services/preliminary-assessment.service'
import { QueryPreliminaryAssessmentSchema } from '@/lib/validation/preliminary-assessment'
import { PreliminaryAssessmentListResponse } from '@/types/preliminary-assessment'

export const GET = withAuth(
  requireAnyRole('ASSESSOR', 'COORDINATOR', 'ADMIN')(async (request, context) => {
    try {
      const { userId } = context.params
      
      if (!userId) {
        return NextResponse.json(
          {
            error: 'User ID is required',
            meta: {
              timestamp: new Date().toISOString(),
              version: '1.0.0',
              requestId: uuidv4()
            }
          },
          { status: 400 }
        )
      }

      // Only allow users to see their own assessments unless they're coordinator/admin
      const requestingUserId = context.user.userId
      const isCoordinatorOrAdmin = context.roles.includes('COORDINATOR') || 
                                  context.roles.includes('ADMIN')
      
      if (userId !== requestingUserId && !isCoordinatorOrAdmin) {
        return NextResponse.json(
          {
            error: 'Unauthorized to access assessments for this user',
            meta: {
              timestamp: new Date().toISOString(),
              version: '1.0.0',
              requestId: uuidv4()
            }
          },
          { status: 403 }
        )
      }

      const url = new URL(request.url)
      const searchParams = Object.fromEntries(url.searchParams)
      
      const query = QueryPreliminaryAssessmentSchema.parse(searchParams)
      
      const { assessments, total, totalPages } = await PreliminaryAssessmentService.findByUserId(userId, query)

      const response: PreliminaryAssessmentListResponse = {
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
      console.error('Get user preliminary assessments error:', error)
      
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
)