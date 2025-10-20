import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withAuth, AuthContext, requireRole } from '@/lib/auth/middleware'
import { ResponseService } from '@/lib/services/response.service'
import { GetResponseResponse, UpdateResponseResponse } from '@/types/response'
import { UpdatePlannedResponseSchema } from '@/lib/validation/response'

interface RouteParams {
  params: Promise<{ id: string }>
}

export const GET = withAuth(
  requireRole('RESPONDER')(
    async (request: NextRequest, context: AuthContext, { params }: RouteParams) => {
      try {
        const { id } = await params
        
        // Get response details
        const response = await ResponseService.getResponseById(
          id,
          context.userId
        )

        const apiResponse: GetResponseResponse = {
          data: response,
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        }

        return NextResponse.json(apiResponse, { status: 200 })
      } catch (error) {
        console.error('Get response error:', error)
        
        if (error instanceof Error) {
          if (error.message.includes('not found')) {
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
          
          if (error.message.includes('not assigned')) {
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
)

export const PUT = withAuth(
  requireRole('RESPONDER')(
    async (request: NextRequest, context: AuthContext, { params }: RouteParams) => {
      try {
        const { id } = await params
        const body = await request.json()
        
        // Validate input
        const validationResult = UpdatePlannedResponseSchema.safeParse(body)
        if (!validationResult.success) {
          return NextResponse.json(
            {
              error: 'Validation failed',
              details: validationResult.error.errors,
              meta: {
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                requestId: uuidv4()
              }
            },
            { status: 400 }
          )
        }

        // Update planned response
        const response = await ResponseService.updatePlannedResponse(
          id,
          validationResult.data,
          context.userId
        )

        const apiResponse: UpdateResponseResponse = {
          data: response,
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        }

        return NextResponse.json(apiResponse, { status: 200 })
      } catch (error) {
        console.error('Update response error:', error)
        
        if (error instanceof Error) {
          if (error.message.includes('not found')) {
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
          
          if (error.message.includes('not assigned')) {
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
          
          if (error.message.includes('Only planned responses can be updated')) {
            return NextResponse.json(
              {
                error: error.message,
                meta: {
                  timestamp: new Date().toISOString(),
                  version: '1.0.0',
                  requestId: uuidv4()
                }
              },
              { status: 409 }
            )
          }
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
)