import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from './get-current-user'

export type UserRole = 'ASSESSOR' | 'COORDINATOR' | 'RESPONDER' | 'DONOR' | 'ADMIN'

export async function requireRole(request: NextRequest, requiredRoles: UserRole[]): Promise<NextResponse | null> {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const hasRequiredRole = user.roles.some(role => 
      requiredRoles.includes(role as UserRole)
    )

    if (!hasRequiredRole) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    return null // User has required role
  } catch (error) {
    console.error('Error in role check:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function hasRole(request: NextRequest, requiredRoles: UserRole[]): Promise<boolean> {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return false
    }

    return user.roles.some(role => 
      requiredRoles.includes(role as UserRole)
    )
  } catch (error) {
    console.error('Error checking role:', error)
    return false
  }
}