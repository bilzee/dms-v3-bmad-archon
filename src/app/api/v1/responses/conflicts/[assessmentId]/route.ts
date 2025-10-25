import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withAuth, AuthContext, requireRole } from '@/lib/auth/middleware'
import { ResponseService } from '@/lib/services/response.service'
import { prisma } from '@/lib/db/client'

interface RouteParams {
  params: Promise<{ assessmentId: string }>
}

export const GET = withAuth(
  async (request: NextRequest, context: AuthContext, { params }: RouteParams) => {
    const { user, roles } = context;
    
    if (!roles.includes('RESPONDER')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Responder role required.' },
        { status: 403 }
      );
    }
      try {
        const { assessmentId } = await params
        
        // Check if there are existing responses for this assessment
        const { data: responses, total } = await ResponseService.getPlannedResponsesForResponder(
          context.userId,
          { assessmentId, page: 1, limit: 10 }
        )

        const conflictData = {
          hasExistingResponses: total > 0,
          totalExistingResponses: total,
          existingResponses: responses.map(response => ({
            id: response.id,
            type: response.type,
            priority: response.priority,
            status: response.status,
            plannedDate: response.plannedDate,
            responderName: response.responder?.name,
            itemsCount: Array.isArray(response.items) ? response.items.length : 0
          }))
        }

        return NextResponse.json({
          data: conflictData,
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        }, { status: 200 })
      } catch (error) {
        console.error('Check assessment conflicts error:', error)
        
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