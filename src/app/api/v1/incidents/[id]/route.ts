import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withAuth } from '@/lib/auth/middleware'
import { IncidentService } from '@/lib/services/incident.service'
import { UpdateIncidentSchema } from '@/lib/validation/incidents'
import { z } from 'zod'

const paramsSchema = z.object({
  id: z.string().min(1, 'Incident ID is required')
})

interface RouteParams {
  params: { id: string }
}

export const GET = withAuth(async (request: NextRequest, context, { params }: RouteParams) => {
  try {
    const { id } = paramsSchema.parse(params)
    const incident = await IncidentService.findById(id)
    
    if (!incident) {
      return NextResponse.json(
        { 
          error: 'Incident not found',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 404 }
      )
    }

    // Include population impact calculation
    const populationImpact = await IncidentService.calculatePopulationImpact(id)

    return NextResponse.json(
      {
        data: {
          ...incident,
          populationImpact
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: uuidv4()
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get incident error:', error)
    
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

export const PUT = withAuth(async (request: NextRequest, context, { params }: RouteParams) => {
  const { roles } = context;
  if (!roles.includes('COORDINATOR') && !roles.includes('ADMIN')) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Insufficient permissions. Coordinator or Admin role required.',
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: uuidv4()
        }
      },
      { status: 403 }
    );
  }

  try {
    const { id } = paramsSchema.parse(params)
    const body = await request.json()
    
    // Handle empty body
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        {
          error: 'Request body is required and must be a valid JSON object',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 400 }
      )
    }
    
    const updateData = UpdateIncidentSchema.parse(body)
    
    const incident = await IncidentService.update(id, updateData)
    
    if (!incident) {
      return NextResponse.json(
        { 
          error: 'Incident not found',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 404 }
      )
    }

    // Include updated population impact calculation
    const populationImpact = await IncidentService.calculatePopulationImpact(id)

    return NextResponse.json(
      {
        data: {
          ...incident,
          populationImpact
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: uuidv4()
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update incident error:', error)
    
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

export const DELETE = withAuth(async (request: NextRequest, context, { params }: RouteParams) => {
  const { roles } = context;
  if (!roles.includes('COORDINATOR') && !roles.includes('ADMIN')) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Insufficient permissions. Coordinator or Admin role required.',
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: uuidv4()
        }
      },
      { status: 403 }
    );
  }

  try {
    const { id } = paramsSchema.parse(params)
    
    const incident = await IncidentService.softDelete(id, context.userId)
    
    if (!incident) {
      return NextResponse.json(
        { 
          error: 'Incident not found',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        data: {
          success: true,
          message: 'Incident deleted successfully',
          deletedIncident: incident
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: uuidv4()
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete incident error:', error)
    
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