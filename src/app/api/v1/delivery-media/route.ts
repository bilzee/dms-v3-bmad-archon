import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withAuth, AuthContext } from '@/lib/auth/middleware'
import { deliveryMediaService } from '@/lib/services/delivery-media.service'
import { DeliveryMediaMetadata } from '@/types/media'

interface RouteParams {
  params: Promise<{ id: string }>
}

export const GET = withAuth(
  async (request: NextRequest, context: AuthContext) => {
    const { user, roles } = context;
    
    // Both RESPONDER and COORDINATOR can view delivery media
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
      const { searchParams } = new URL(request.url)
      const responseId = searchParams.get('responseId')
      
      if (!responseId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Response ID is required',
            meta: {
              timestamp: new Date().toISOString(),
              version: '1.0.0',
              requestId: uuidv4()
            }
          },
          { status: 400 }
        )
      }
      
      console.log('📸 API Debug - Getting delivery media:', {
        responseId,
        userId: context.userId,
        userRole: roles
      })
      
      const media = await deliveryMediaService.getMediaByResponse(responseId)
      
      return NextResponse.json({
        success: true,
        data: media,
        meta: {
          count: media.length,
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: uuidv4()
        }
      })
    } catch (error) {
      console.error('❌ Get delivery media error:', error)
      
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

export const POST = withAuth(
  async (request: NextRequest, context: AuthContext) => {
    const { user, roles } = context;
    
    // Only RESPONDER can upload delivery media
    if (!roles.includes('RESPONDER')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Insufficient permissions. Responder role required.' 
        },
        { status: 403 }
      );
    }
    
    try {
      const formData = await request.formData()
      const file = formData.get('file') as File
      const responseId = formData.get('responseId') as string
      const capturedFor = formData.get('capturedFor') as string || 'delivery_proof'
      const deliveryNotes = formData.get('deliveryNotes') as string
      const gpsData = formData.get('gpsData') as string
      
      if (!file) {
        return NextResponse.json(
          {
            success: false,
            error: 'File is required',
            meta: {
              timestamp: new Date().toISOString(),
              version: '1.0.0',
              requestId: uuidv4()
            }
          },
          { status: 400 }
        )
      }
      
      if (!responseId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Response ID is required',
            meta: {
              timestamp: new Date().toISOString(),
              version: '1.0.0',
              requestId: uuidv4()
            }
          },
          { status: 400 }
        )
      }
      
      console.log('📸 API Debug - Uploading delivery media:', {
        responseId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        capturedFor,
        userId: context.userId
      })
      
      // Parse GPS data if provided
      let gpsMetadata
      if (gpsData) {
        try {
          gpsMetadata = JSON.parse(gpsData)
        } catch (error) {
          console.error('Failed to parse GPS data:', error)
          // Continue without GPS data
        }
      } else {
        // Try to capture GPS location automatically
        try {
          gpsMetadata = await deliveryMediaService.captureGPSLocation()
        } catch (error) {
          console.warn('Failed to capture GPS location:', error)
          // Continue without GPS data
        }
      }
      
      // Create delivery metadata
      const deliveryMetadata: DeliveryMediaMetadata = {
        capturedFor: capturedFor as any,
        deliveryId: responseId,
        gps: gpsMetadata || {
          latitude: 0,
          longitude: 0,
          accuracy: 999999,
          timestamp: new Date()
        },
        deliveryTimestamp: new Date(),
        deliveryNotes: deliveryNotes || undefined,
        verificationStatus: 'pending'
      }
      
      // Upload media with GPS metadata
      const media = await deliveryMediaService.uploadDeliveryMedia(
        file,
        deliveryMetadata,
        responseId
      )
      
      console.log('✅ Delivery media uploaded successfully:', {
        mediaId: (media as any).id,
        fileName: (media as any).filename,
        hasGPS: !!gpsMetadata
      })
      
      return NextResponse.json({
        success: true,
        data: media,
        message: 'Delivery media uploaded successfully',
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: uuidv4()
        }
      }, { status: 201 })
      
    } catch (error) {
      console.error('❌ Upload delivery media error:', error)
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack',
        userId: context.userId
      })
      
      // Handle specific errors
      if (error instanceof Error) {
        if (error.message.includes('File size exceeds')) {
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
            { status: 400 }
          )
        }
        
        if (error.message.includes('not supported')) {
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
            { status: 400 }
          )
        }
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