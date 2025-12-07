/**
 * Gap Field Severities API
 * 
 * CRUD operations for managing gap field severity configurations
 * - GET: List gap field severities (with filtering by assessment type)
 * - PUT: Update field severity (Coordinator access)
 * - POST: Create new gap field (Admin access)
 * - DELETE: Deactivate gap field (Admin access)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
import { z } from 'zod'
import { AssessmentType, Priority } from '@prisma/client'

// Validation schemas
const getGapFieldsSchema = z.object({
  assessmentType: z.nativeEnum(AssessmentType).optional(),
  isActive: z.string().nullable().optional().transform((val) => val ? val === 'true' : undefined)
})

const createGapFieldSchema = z.object({
  fieldName: z.string().min(1).max(100),
  assessmentType: z.nativeEnum(AssessmentType),
  severity: z.nativeEnum(Priority).default(Priority.MEDIUM),
  displayName: z.string().min(1).max(150),
  description: z.string().optional()
})

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
 * GET /api/v1/gap-field-severities
 * List gap field severities with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Debug logging
    console.log('Gap Field API - Session:', session?.user ? { userId: session.user.id, email: session.user.email } : 'No session')
    
    // If no session, check if we're in development and allow access
    if (!session && process.env.NODE_ENV === 'development') {
      console.log('Development mode: allowing access without authentication for gap fields')
      // Skip permission check in development
    } else {
      const { hasPermission } = await checkPermissions(session, 'COORDINATOR')
      
      if (!hasPermission) {
        return NextResponse.json(
          { 
            error: 'Insufficient permissions',
            details: session ? 'User logged in but lacks coordinator role' : 'No active session'
          }, 
          { status: 403 }
        )
      }
    }

    const { searchParams } = new URL(request.url)
    const filters = getGapFieldsSchema.parse({
      assessmentType: searchParams.get('assessmentType'),
      isActive: searchParams.get('isActive')
    })

    const gapFields = await prisma.gapFieldSeverity.findMany({
      where: {
        ...(filters.assessmentType && { assessmentType: filters.assessmentType }),
        ...(filters.isActive !== undefined && { isActive: filters.isActive })
      },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true }
        },
        updatedByUser: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: [
        { assessmentType: 'asc' },
        { displayName: 'asc' }
      ]
    })

    return NextResponse.json({
      success: true,
      data: gapFields,
      count: gapFields.length
    })

  } catch (error) {
    console.error('Error fetching gap field severities:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch gap field severities',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

/**
 * POST /api/v1/gap-field-severities
 * Create new gap field (Admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { hasPermission, user } = await checkPermissions(session, 'ADMIN')
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Admin permissions required' }, 
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = createGapFieldSchema.parse(body)

    // Check if field already exists
    const existing = await prisma.gapFieldSeverity.findUnique({
      where: {
        unique_field_assessment: {
          fieldName: data.fieldName,
          assessmentType: data.assessmentType
        }
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Gap field already exists for this assessment type' },
        { status: 409 }
      )
    }

    const gapField = await prisma.gapFieldSeverity.create({
      data: {
        ...data,
        createdBy: user!.id
      },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: gapField,
      message: 'Gap field created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating gap field:', error)
    
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
        error: 'Failed to create gap field',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}