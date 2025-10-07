import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withAuth, requireAnyRole } from '@/lib/auth/middleware'
import { IncidentService } from '@/lib/services/incident.service'
import { 
  CreateIncidentSchema,
  QueryIncidentSchema 
} from '@/lib/validation/incidents'
import { IncidentListResponse } from '@/types/incidents'

export const GET = withAuth(async (request, context) => {
  try {
    const url = new URL(request.url)
    const searchParams = Object.fromEntries(url.searchParams)
    
    const query = QueryIncidentSchema.parse(searchParams)
    
    const { incidents, total, totalPages } = await IncidentService.findAll(query)

    const response: IncidentListResponse = {
      data: incidents,
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
    console.error('Get incidents error:', error)
    
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
  requireAnyRole('ASSESSOR', 'COORDINATOR', 'ADMIN')(async (request, context) => {
    try {
      const body = await request.json()
      const input = CreateIncidentSchema.parse(body)
      
      const incident = await IncidentService.create(input, context.user.userId)

      return NextResponse.json(
        {
          data: incident,
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 201 }
      )
    } catch (error) {
      console.error('Create incident error:', error)
      
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
        )
      }
      
      return NextResponse.json(
        {
          error: 'Internal server error',
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