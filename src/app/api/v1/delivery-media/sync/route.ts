import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withAuth, AuthContext } from '@/lib/auth/middleware'
import { deliveryMediaService } from '@/lib/services/delivery-media.service'

export const POST = withAuth(
  async (request: NextRequest, context: AuthContext) => {
    const { user, roles } = context;
    
    // RESPONDER can sync their own media, COORDINATOR can view sync status
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
      const body = await request.json()
      const { action } = body
      
      console.log('🔄 API Debug - Delivery media sync operation:', {
        action,
        userId: context.userId,
        userRole: roles
      })
      
      if (action === 'sync_pending') {
        const syncedMedia = await deliveryMediaService.syncPendingMedia()
        
        console.log('✅ Media sync completed:', {
          syncedCount: syncedMedia.length,
          userId: context.userId
        })
        
        return NextResponse.json({
          success: true,
          data: {
            syncedMedia,
            syncedCount: syncedMedia.length
          },
          message: `Successfully synced ${syncedMedia.length} media files`,
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        })
      }
      
      if (action === 'get_sync_status') {
        const syncStatus = await deliveryMediaService.getOfflineMediaSyncStatus()
        
        return NextResponse.json({
          success: true,
          data: {
            syncStatus,
            pendingCount: syncStatus.length,
            hasOfflineMedia: syncStatus.length > 0
          },
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
          error: 'Invalid action. Supported actions: sync_pending, get_sync_status',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 400 }
      )
      
    } catch (error) {
      console.error('❌ Delivery media sync error:', error)
      
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