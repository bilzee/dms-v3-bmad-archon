import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { withAuth, requirePermission } from '@/lib/auth/middleware'
import { AuthService } from '@/lib/auth/service'
import { prisma } from '@/lib/db/client'
import { AssignRolesRequest } from '@/types/auth'

const assignRolesSchema = z.object({
  roleIds: z.array(z.string()).min(1, 'At least one role is required')
})

interface RouteParams {
  params: {
    userId: string
  }
}

// Assign roles to user - requires ASSIGN_ROLES permission  
export const PUT = withAuth(requirePermission('ASSIGN_ROLES')(async (
  request: NextRequest,
  context
) => {
  const url = new URL(request.url)
  const params = { userId: url.pathname.split('/')[4] }
  try {
    const { userId } = params
    const body = await request.json() as AssignRolesRequest
    
    // Validate input
    const validation = assignRolesSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 400 }
      )
    }

    const { roleIds } = validation.data

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

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

    // Verify that all role IDs exist
    const roles = await prisma.role.findMany({
      where: { id: { in: roleIds } }
    })

    if (roles.length !== roleIds.length) {
      return NextResponse.json(
        {
          error: 'One or more role IDs are invalid',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 400 }
      )
    }

    // Assign roles
    await AuthService.assignRoles(userId, roleIds, context.user.userId)

    return NextResponse.json(
      {
        data: {
          message: 'Roles assigned successfully'
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
    console.error('Assign roles error:', error)
    
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
}))

// Get user roles - requires MANAGE_USERS permission
export const GET = withAuth(requirePermission('MANAGE_USERS')(async (
  request: NextRequest,
  context
) => {
  const url = new URL(request.url)
  const params = { userId: url.pathname.split('/')[4] }
  try {
    const { userId } = params

    const user = await AuthService.getUserWithRoles(userId)

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

    const roles = user.roles.map(ur => ur.role)

    return NextResponse.json(
      {
        data: {
          roles
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
    console.error('Get user roles error:', error)
    
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
}))