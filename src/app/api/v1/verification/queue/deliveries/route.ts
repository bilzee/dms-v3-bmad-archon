import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withAuth, AuthContext } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/client'

interface RouteParams {
  params: Promise<{}>
}

export const GET = withAuth(
  async (request: NextRequest, context: AuthContext) => {
    const { user, roles } = context;
    
    // Only coordinators can access delivery verification queue
    if (!roles.includes('COORDINATOR')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Insufficient permissions. Coordinator role required.' 
        },
        { status: 403 }
      );
    }
    
    try {
      const { searchParams } = new URL(request.url)
      
      // Parse query parameters
      const page = parseInt(searchParams.get('page') || '1')
      const limit = parseInt(searchParams.get('limit') || '20')
      const status = searchParams.get('status') // Optional: SUBMITTED, VERIFIED, REJECTED
      const entityId = searchParams.get('entityId')
      const responderId = searchParams.get('responderId')
      const dateFrom = searchParams.get('dateFrom')
      const dateTo = searchParams.get('dateTo')
      
      console.log('📋 API Debug - Getting delivery verification queue:', {
        userId: context.userId,
        filters: { page, limit, status, entityId, responderId, dateFrom, dateTo }
      })
      
      // Build where clause for delivered responses submitted for verification
      const where: any = {
        status: 'DELIVERED',
        verificationStatus: 'SUBMITTED'
      }
      
      // Add optional filters
      if (entityId) where.entityId = entityId
      if (responderId) where.responderId = responderId
      
      // Date range filter on responseDate
      if (dateFrom || dateTo) {
        where.responseDate = {}
        if (dateFrom) where.responseDate.gte = new Date(dateFrom)
        if (dateTo) where.responseDate.lte = new Date(dateTo)
      }
      
      // Get total count
      const total = await prisma.rapidResponse.count({ where })
      
      // Get paginated delivered responses for verification
      const deliveries = await prisma.rapidResponse.findMany({
        where,
        include: {
          entity: {
            select: {
              id: true,
              name: true,
              type: true,
              location: true
            }
          },
          responder: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          assessment: {
            select: {
              id: true,
              rapidAssessmentType: true,
              rapidAssessmentDate: true
            }
          },
          mediaAttachments: {
            select: {
              id: true,
              filename: true,
              filePath: true,
              thumbnailPath: true,
              uploadedAt: true
            },
            orderBy: {
              uploadedAt: 'desc'
            }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { responseDate: 'desc' }
        ],
        skip: (page - 1) * limit,
        take: Math.min(limit, 100) // Max 100 per page
      })
      
      // Format delivery data for response
      const formattedDeliveries = deliveries.map((delivery: any) => {
        const timeline = delivery.timeline as any || {}
        const deliveryInfo = timeline.delivery || {}
        
        return {
          id: delivery.id,
          type: delivery.type,
          priority: delivery.priority,
          status: delivery.status,
          verificationStatus: delivery.verificationStatus,
          responseDate: delivery.responseDate,
          plannedDate: delivery.plannedDate,
          
          // Delivery information
          deliveryInfo: {
            confirmedAt: deliveryInfo.confirmedAt,
            deliveredBy: deliveryInfo.deliveredBy,
            deliveryLocation: deliveryInfo.deliveryLocation,
            deliveryNotes: deliveryInfo.deliveryNotes,
            deliveredItems: deliveryInfo.deliveredItems || delivery.items,
            mediaAttachmentIds: deliveryInfo.mediaAttachmentIds || []
          },
          
          // Related data
          entity: delivery.entity,
          responder: delivery.responder,
          assessment: delivery.assessment,
          
          // Delivery proof media
          deliveryProof: delivery.mediaAttachments.map((media: any) => ({
            id: media.id,
            filename: media.filename,
            filePath: media.filePath,
            thumbnailPath: media.thumbnailPath,
            uploadedAt: media.uploadedAt,
            metadata: media.metadata
          })),
          
          // Metadata
          createdAt: delivery.createdAt,
          updatedAt: delivery.updatedAt
        }
      })
      
      const responseData = {
        success: true,
        data: formattedDeliveries,
        meta: {
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          },
          filters: {
            status,
            entityId,
            responderId,
            dateFrom,
            dateTo
          },
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: uuidv4()
        }
      }

      console.log('✅ Delivery verification queue retrieved successfully:', {
        totalDeliveries: total,
        currentPage: page,
        totalPages: Math.ceil(total / limit)
      })

      return NextResponse.json(responseData, { status: 200 })
    } catch (error) {
      console.error('❌ Get delivery verification queue error:', error)
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack',
        userId: context.userId
      })
      
      return NextResponse.json(
        {
          success: false,
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