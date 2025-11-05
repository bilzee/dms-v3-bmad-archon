import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withAuth, AuthContext } from '@/lib/auth/middleware'
import { deliveryMediaService } from '@/lib/services/delivery-media.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

export const DELETE = withAuth(
  async (request: NextRequest, context: AuthContext, { params }: RouteParams) => {
    const { user, roles } = context;
    
    // Only RESPONDER who uploaded the media or COORDINATOR can delete
    if (!roles.includes('RESPONDER') && !roles.includes('COORDINATOR')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Insufficient permissions. Responder or Coordinator role required.' 
        },
        { status: 403 }
      );
    }
    
    try {
      const { id } = await params
      
      console.log('🗑️ API Debug - Deleting delivery media:', {
        mediaId: id,
        userId: context.userId,
        userRole: roles
      })
      
      await deliveryMediaService.deleteMedia(id)
      
      console.log('✅ Delivery media deleted successfully:', { mediaId: id })
      
      return NextResponse.json({
        success: true,
        message: 'Delivery media deleted successfully',
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: uuidv4()
        }
      })
    } catch (error) {
      console.error('❌ Delete delivery media error:', error)
      
      if (error instanceof Error && error.message.includes('not found')) {
        return NextResponse.json(
          {
            success: false,
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

export const PUT = withAuth(
  async (request: NextRequest, context: AuthContext, { params }: RouteParams) => {
    const { user, roles } = context;
    
    // Only COORDINATOR can update media verification status
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
      const { id } = await params
      const body = await request.json()
      const { action, feedback } = body
      
      console.log('🔍 API Debug - Updating delivery media:', {
        mediaId: id,
        action,
        userId: context.userId,
        userRole: roles
      })
      
      if (action === 'mark_for_verification') {
        await deliveryMediaService.markMediaForVerification(id)
        
        return NextResponse.json({
          success: true,
          message: 'Media marked for verification',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        })
      }
      
      if (action === 'update_verification_status') {
        const { status } = body
        
        if (!['verified', 'rejected'].includes(status)) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid verification status. Must be "verified" or "rejected"',
              meta: {
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                requestId: uuidv4()
              }
            },
            { status: 400 }
          )
        }
        
        await deliveryMediaService.updateMediaVerificationStatus(
          id,
          status as 'verified' | 'rejected',
          feedback
        )
        
        console.log('✅ Media verification status updated:', {
          mediaId: id,
          newStatus: status,
          feedback
        })
        
        return NextResponse.json({
          success: true,
          message: `Media ${status} successfully`,
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        })
      }
      
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action. Supported actions: mark_for_verification, update_verification_status',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 400 }
      )
      
    } catch (error) {
      console.error('❌ Update delivery media error:', error)
      
      if (error instanceof Error && error.message.includes('not found')) {
        return NextResponse.json(
          {
            success: false,
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