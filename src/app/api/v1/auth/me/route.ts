import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withAuth } from '@/lib/auth/middleware'
import { AuthService } from '@/lib/auth/service'
import { UserMeResponse } from '@/types/auth'

export const GET = withAuth(async (request, context) => {
  try {
    const user = await AuthService.getUserWithRoles(context.user.userId)
    
    if (!user) {
      return NextResponse.json(
        {
          error: 'User not found',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 404 }
      )
    }

    // Remove password hash from response
    const { passwordHash, ...userWithoutPassword } = user

    // Extract permissions from user roles
    const permissions = Array.from(
      new Set(
        user.roles.flatMap(ur => 
          ur.role.permissions.map(rp => rp.permission.code)
        )
      )
    )

    const response: UserMeResponse = {
      data: {
        user: userWithoutPassword,
        permissions
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: uuidv4()
      }
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('Get user error:', error)
    
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