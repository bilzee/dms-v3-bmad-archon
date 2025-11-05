import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { withAuth } from '@/lib/auth/middleware'
import { AuthService } from '@/lib/auth/service'
import { prisma } from '@/lib/db/client'
import { CreateUserRequest, CreateUserResponse } from '@/types/auth'

const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  organization: z.string().optional(),
  roleIds: z.array(z.string()).min(1, 'At least one role is required')
})

// Create user - requires MANAGE_USERS permission
export const POST = withAuth(async (request: NextRequest, context) => {
  const { permissions } = context;
  if (!permissions.includes('MANAGE_USERS')) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions. Manage users permission required.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json() as CreateUserRequest
    
    // Validate input
    const validation = createUserSchema.safeParse(body)
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

    // Check if user with email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })

    if (existingUser) {
      return NextResponse.json(
        {
          error: 'User with this email already exists',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 409 }
      )
    }

    // Check if user with username already exists
    const existingUsername = await prisma.user.findUnique({
      where: { username: validatedData.username }
    })

    if (existingUsername) {
      return NextResponse.json(
        {
          error: 'User with this username already exists',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 409 }
      )
    }

    // Verify that all role IDs exist
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

    // Create user
    const user = await AuthService.createUser({
      email: validatedData.email,
      username: validatedData.username,
      password: validatedData.password,
      name: validatedData.name,
      phone: validatedData.phone,
      organization: validatedData.organization,
      roleIds: validatedData.roleIds,
      assignedBy: context.userId
    })

    // Remove password hash from response
    const { passwordHash, ...userWithoutPassword } = user as any

    const response: CreateUserResponse = {
      data: {
        user: userWithoutPassword
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: uuidv4()
      }
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Create user error:', error)
    
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

// List users - requires MANAGE_USERS permission
export const GET = withAuth(async (request: NextRequest, context) => {
  const { permissions } = context;
  if (!permissions.includes('MANAGE_USERS')) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions. Manage users permission required.' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''

    const skip = (page - 1) * limit

    // Build search condition
    const searchCondition = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } }
      ]
    } : {}

    // Get users with pagination
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: searchCondition as any,
        include: {
          roles: {
            include: {
              role: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({
        where: searchCondition as any
      })
    ])

    // Remove password hashes
    const usersWithoutPasswords = users.map(({ passwordHash, ...user }: any) => user)

    return NextResponse.json(
      {
        data: {
          users: usersWithoutPasswords,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
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
    console.error('List users error:', error)
    
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