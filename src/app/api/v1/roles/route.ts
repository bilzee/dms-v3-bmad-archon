import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withAuth, requireAnyPermission } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/client'

// Get all roles - requires MANAGE_USERS or ASSIGN_ROLES permission
export const GET = withAuth(requireAnyPermission('MANAGE_USERS', 'ASSIGN_ROLES')(async (request, context) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

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
    console.error('Get roles error:', error)
    
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