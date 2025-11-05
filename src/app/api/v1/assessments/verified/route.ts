import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { z } from 'zod'

// Validation schema for query parameters
const VerifiedAssessmentsQuerySchema = z.object({
  entityId: z.string().min(1, 'Entity ID is required'),
})

export const GET = withAuth(async (request, context) => {
  try {
    const url = new URL(request.url)
    const searchParams = Object.fromEntries(url.searchParams)
    
    // Validate query parameters
    const query = VerifiedAssessmentsQuerySchema.parse(searchParams)
    
    // Import the service function
    const { entityAssignmentService } = await import('@/lib/services/entity-assignment.service')
    
    // Get verified assessments for the entity
    const assessments = await entityAssignmentService.getVerifiedAssessments(query.entityId)
    
    return NextResponse.json({
      data: assessments,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        count: assessments.length
      }
    }, { status: 200 })
    
  } catch (error) {
    console.error('Error fetching verified assessments:', error)
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: error.errors,
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0'
          }
        },
        { status: 400 }
      )
    }
    
    // Handle other errors
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    
    return NextResponse.json(
      {
        error: errorMessage,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      },
      { status: 500 }
    )
  }
})