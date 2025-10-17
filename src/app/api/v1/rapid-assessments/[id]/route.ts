import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withAuth } from '@/lib/auth/middleware'
import { RapidAssessmentService } from '@/lib/services/rapid-assessment.service'
import { UpdateRapidAssessmentSchema } from '@/lib/validation/rapid-assessment'
import { RapidAssessmentResponse } from '@/types/rapid-assessment'

interface RouteParams {
  params: Promise<{ id: string }>
}

export const GET = withAuth(
  async (request: NextRequest, { params }: RouteParams) => {
    try {
      const { id } = await params
      
      const assessment = await RapidAssessmentService.findById(id)
      
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
        )
      }

      // Check if user has permission to view this assessment
      if (assessment.assessorId !== (request as any).user.userId) {
        // TODO: Add role-based access for coordinators/admins
        return NextResponse.json(
          {
            error: 'Not authorized to view this assessment',
            meta: {
              timestamp: new Date().toISOString(),
              version: '1.0.0',
              requestId: uuidv4()
            }
          },
          { status: 403 }
        )
      }

      const response: RapidAssessmentResponse = {
        data: assessment,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: uuidv4()
        }
      }

      return NextResponse.json(response, { status: 200 })
    } catch (error) {
      console.error('Get rapid assessment error:', error)
      
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
  }
)

export const PUT = withAuth(
  async (request: NextRequest, { params }: RouteParams) => {
    try {
      const { id } = await params
      const body = await request.json()
      const input = UpdateRapidAssessmentSchema.parse(body)
      
      const assessment = await RapidAssessmentService.update(
        id,
        input,
        (request as any).user.userId
      )

      const response: RapidAssessmentResponse = {
        data: assessment,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: uuidv4()
        }
      }

      return NextResponse.json(response, { status: 200 })
    } catch (error) {
      console.error('Update rapid assessment error:', error)
      
      if (error instanceof Error && error.message.includes('not found')) {
        return NextResponse.json(
          {
            error: error.message,
            meta: {
              timestamp: new Date().toISOString(),
              version: '1.0.0',
              requestId: uuidv4()
            }
          },
          { status: 404 }
        )
      }
      
      if (error instanceof Error && error.message.includes('authorized')) {
        return NextResponse.json(
          {
            error: error.message,
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
  }
)

export const DELETE = withAuth(
  async (request: NextRequest, { params }: RouteParams) => {
    try {
      const { id } = await params
      
      await RapidAssessmentService.delete(id, (request as any).user.userId)

      return NextResponse.json(
        {
          message: 'Assessment deleted successfully',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 200 }
      )
    } catch (error) {
      console.error('Delete rapid assessment error:', error)
      
      if (error instanceof Error && error.message.includes('not found')) {
        return NextResponse.json(
          {
            error: error.message,
            meta: {
              timestamp: new Date().toISOString(),
              version: '1.0.0',
              requestId: uuidv4()
            }
          },
          { status: 404 }
        )
      }
      
      if (error instanceof Error && error.message.includes('authorized')) {
        return NextResponse.json(
          {
            error: error.message,
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
  }
)