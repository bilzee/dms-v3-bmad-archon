import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { AuthService } from '@/lib/auth/service'
import { LoginRequest, LoginResponse } from '@/types/auth'
import { v4 as uuidv4 } from 'uuid'

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as LoginRequest
    
    // Validate input
    const validation = loginSchema.safeParse(body)
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

    const { email, password } = validation.data

    // Authenticate user
    const authResult = await AuthService.authenticate(email, password)
    
    if (!authResult) {
      return NextResponse.json(
        {
          error: 'Invalid email or password',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: uuidv4()
          }
        },
        { status: 401 }
      )
    }

    const { user, token } = authResult

    // Remove password hash from response
    const { passwordHash, ...userWithoutPassword } = user as any
    
    // Extract roles for response
    const roles = user.roles.map(ur => ur.role)

    const response: LoginResponse = {
      data: {
        user: userWithoutPassword,
        token,
        roles
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: uuidv4()
      }
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('Login error:', error)
    
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
}