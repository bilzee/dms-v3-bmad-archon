import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { withAuth, requirePermission } from '@/lib/auth/middleware'
import { AuthService } from '@/lib/auth/service'
import { prisma } from '@/lib/db/client'

const updateUserSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  username: z.string().min(3, 'Username must be at least 3 characters').optional(),
  name: z.string().min(1, 'Name is required').optional(),
  phone: z.string().optional(),
  organization: z.string().optional(),
  isActive: z.boolean().optional(),
  roleIds: z.array(z.string()).optional(),
  resetPassword: z.boolean().optional()
})

// Update user - requires MANAGE_USERS permission
export const PUT = withAuth(requirePermission('MANAGE_USERS')(async (request, context) => {
  try {
    const userId = context.params?.userId
    
    if (!userId) {
      return NextResponse.json(
        {
          error: 'User ID is required',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 400 }
      )
    }

    const body = await request.json()
    
    // Validate input
    const validation = updateUserSchema.safeParse(body)
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

    const validatedData = validation.data

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    })

    if (!existingUser) {
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

    // Check for email uniqueness if email is being updated
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: validatedData.email }
      })
      
      if (emailExists) {
        return NextResponse.json(
          {
            error: 'Email already exists',
            meta: {
              timestamp: new Date().toISOString(),
              version: '1.0.0',
              requestId: uuidv4()
            }
          },
          { status: 409 }
        )
      }
    }

    // Check for username uniqueness if username is being updated
    if (validatedData.username && validatedData.username !== existingUser.username) {
      const usernameExists = await prisma.user.findUnique({
        where: { username: validatedData.username }
      })
      
      if (usernameExists) {
        return NextResponse.json(
          {
            error: 'Username already exists',
            meta: {
              timestamp: new Date().toISOString(),
              version: '1.0.0',
              requestId: uuidv4()
            }
          },
          { status: 409 }
        )
      }
    }

    // If roleIds are provided, verify they exist
    if (validatedData.roleIds) {
      const roles = await prisma.role.findMany({
        where: { id: { in: validatedData.roleIds } }
      })

      if (roles.length !== validatedData.roleIds.length) {
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
    }

    // Prepare update data
    const updateData: any = {}
    
    if (validatedData.email !== undefined) updateData.email = validatedData.email
    if (validatedData.username !== undefined) updateData.username = validatedData.username
    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone
    if (validatedData.organization !== undefined) updateData.organization = validatedData.organization
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive

    // Handle password reset
    if (validatedData.resetPassword) {
      const hashedPassword = await AuthService.hashPassword('defaultpass123!')
      updateData.passwordHash = hashedPassword
    }

    // Update user with transaction to handle role updates
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Update user basic info
      const user = await tx.user.update({
        where: { id: userId },
        data: updateData
      })

      // Update roles if provided
      if (validatedData.roleIds) {
        // Remove existing roles
        await tx.userRole.deleteMany({
          where: { userId: userId }
        })

        // Add new roles
        await tx.userRole.createMany({
          data: validatedData.roleIds.map(roleId => ({
            userId: userId,
            roleId: roleId,
            assignedBy: context.user.userId,
            assignedAt: new Date()
          }))
        })
      }

      // Return updated user with roles
      return await tx.user.findUnique({
        where: { id: userId },
        include: {
          roles: {
            include: {
              role: true
            }
          }
        }
      })
    })

    // Remove password hash from response
    const { passwordHash, ...userWithoutPassword } = updatedUser!

    return NextResponse.json(
      {
        data: {
          user: userWithoutPassword
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
    console.error('Update user error:', error)
    
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

// Get single user - requires MANAGE_USERS permission
export const GET = withAuth(requirePermission('MANAGE_USERS')(async (request, context) => {
  try {
    const userId = context.params?.userId
    
    if (!userId) {
      return NextResponse.json(
        {
          error: 'User ID is required',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
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

    // Remove password hash from response
    const { passwordHash, ...userWithoutPassword } = user

    return NextResponse.json(
      {
        data: {
          user: userWithoutPassword
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
    console.error('Get user error:', error)
    
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