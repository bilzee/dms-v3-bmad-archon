import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withAuth } from '@/lib/auth/middleware'
import { AuthService } from '@/lib/auth/service'
import { RefreshTokenResponse } from '@/types/auth'

export const POST = withAuth(async (request, context) => {
  try {
    // Generate new token with current user data
    const token = await AuthService.refreshToken(context.userId)

    const response: RefreshTokenResponse = {
      data: {
        token
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: uuidv4()
      }
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('Refresh token error:', error)
    
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