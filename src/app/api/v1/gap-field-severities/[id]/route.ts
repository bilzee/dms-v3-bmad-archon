/**
 * Individual Gap Field Severity API
 * 
 * Operations for specific gap field severities
 * - GET: Get specific gap field details
 * - PUT: Update field severity (Coordinator access)
 * - DELETE: Deactivate gap field (Admin access)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
import { z } from 'zod'
import { Priority } from '@prisma/client'

// Validation schemas
const updateGapFieldSchema = z.object({
  severity: z.nativeEnum(Priority)
})

// Helper to check user permissions
async function checkPermissions(session: any, requiredRole: 'COORDINATOR' | 'ADMIN') {
  if (!session?.user?.id) {
    return { hasPermission: false, user: null }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      roles: {
        include: {
          role: true
        }
      }
    }
  })

  if (!user) {
    return { hasPermission: false, user: null }
  }

  const userRoles = user.roles.map(ur => ur.role.name)
  
  // Admin has all permissions
  if (userRoles.includes('ADMIN')) {
    return { hasPermission: true, user }
  }

  // Check specific role requirement
  if (requiredRole === 'COORDINATOR' && userRoles.includes('COORDINATOR')) {
    return { hasPermission: true, user }
  }

  return { hasPermission: false, user }
}

/**
 * GET /api/v1/gap-field-severities/[id]
 * Get specific gap field details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const { hasPermission } = await checkPermissions(session, 'COORDINATOR')
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' }, 
        { status: 403 }
      )
    }

    const gapField = await prisma.gapFieldSeverity.findUnique({
      where: { id: params.id },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true }
        },
        updatedByUser: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    if (!gapField) {
      return NextResponse.json(
        { error: 'Gap field not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: gapField
    })

  } catch (error) {
    console.error('Error fetching gap field:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch gap field',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

/**
 * PUT /api/v1/gap-field-severities/[id]
 * Update field severity (Coordinator access)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const { hasPermission, user } = await checkPermissions(session, 'COORDINATOR')
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Coordinator permissions required' }, 
        { status: 403 }
      )
    }

    const body = await request.json()
    const { severity } = updateGapFieldSchema.parse(body)

    // Check if gap field exists
    const existingField = await prisma.gapFieldSeverity.findUnique({
      where: { id: params.id }
    })

    if (!existingField) {
      return NextResponse.json(
        { error: 'Gap field not found' },
        { status: 404 }
      )
    }

    // Update the gap field severity
    const updatedField = await prisma.gapFieldSeverity.update({
      where: { id: params.id },
      data: {
        severity,
        updatedBy: user!.id
      },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true }
        },
        updatedByUser: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    // Log the severity change for audit trail
    await prisma.auditLog.create({
      data: {
        userId: user!.id,
        action: 'UPDATE_GAP_FIELD_SEVERITY',
        resource: 'gap_field_severities',
        resourceId: params.id,
        oldValues: { severity: existingField.severity },
        newValues: { severity },
        timestamp: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedField,
      message: `Severity updated to ${severity}`
    })

  } catch (error) {
    console.error('Error updating gap field:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid input data',
          details: error.errors
        }, 
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to update gap field',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/v1/gap-field-severities/[id]
 * Deactivate gap field (Admin access)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const { hasPermission, user } = await checkPermissions(session, 'ADMIN')
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Admin permissions required' }, 
        { status: 403 }
      )
    }

    // Check if gap field exists
    const existingField = await prisma.gapFieldSeverity.findUnique({
      where: { id: params.id }
    })

    if (!existingField) {
      return NextResponse.json(
        { error: 'Gap field not found' },
        { status: 404 }
      )
    }

    // Soft delete by setting isActive to false
    const deactivatedField = await prisma.gapFieldSeverity.update({
      where: { id: params.id },
      data: {
        isActive: false,
        updatedBy: user!.id
      }
    })

    // Log the deactivation for audit trail
    await prisma.auditLog.create({
      data: {
        userId: user!.id,
        action: 'DEACTIVATE_GAP_FIELD',
        resource: 'gap_field_severities',
        resourceId: params.id,
        oldValues: { isActive: true },
        newValues: { isActive: false },
        timestamp: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: deactivatedField,
      message: 'Gap field deactivated successfully'
    })

  } catch (error) {
    console.error('Error deactivating gap field:', error)
    return NextResponse.json(
      { 
        error: 'Failed to deactivate gap field',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}