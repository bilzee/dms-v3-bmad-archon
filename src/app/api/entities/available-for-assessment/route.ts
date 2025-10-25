import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthContext } from '@/lib/auth/middleware'
import { entityAssignmentService } from '@/lib/services/entity-assignment.service'

export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || context.userId

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get user's roles to determine which method to use
    const userRoles = context.roles || []

    let availableEntities

    // Check if user has RESPONDER or ASSESSOR role and use the appropriate method
    if (userRoles.includes('RESPONDER') || userRoles.includes('ASSESSOR')) {
      availableEntities = await entityAssignmentService.getAssignedEntities(userId)
    }
    // For other roles (COORDINATOR, ADMIN), get all entities they can access
    else {
      // Get entities assigned to this user regardless of role
      const assignments = await entityAssignmentService.getUserAssignedEntities(userId)
      availableEntities = assignments.map(assignment => ({
        id: assignment.id,
        name: assignment.name,
        type: assignment.type,
        location: assignment.location,
        coordinates: null,
        metadata: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }))
    }
    
    // Enhance with assignment information
    const entitiesWithInfo = await Promise.all(
      availableEntities.map(async (entity) => {
        try {
          const assignedUsers = await entityAssignmentService.getEntityAssignedUsers(entity.id)
          
          // Check permissions based on user role
          let canCreate = false
          if (userRoles.includes('RESPONDER')) {
            // For responders, check response creation permission
            canCreate = await entityAssignmentService.canCreateResponse(userId, entity.id)
          } else if (userRoles.includes('ASSESSOR')) {
            // For assessors, check assessment creation permission
            canCreate = await entityAssignmentService.canCreateAssessment(userId, entity.id)
          } else {
            // For other roles (coordinators, admins), they can create both
            canCreate = true
          }
          
          return {
            ...entity,
            assignedUsersCount: assignedUsers.length,
            canCreateAssessment: canCreate
          }
        } catch (err) {
          console.error(`Error loading assignment info for entity ${entity.id}:`, err)
          return {
            ...entity,
            assignedUsersCount: 0,
            canCreateAssessment: false
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      entities: entitiesWithInfo
    })
  } catch (error) {
    console.error('Error getting available entities for assessment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get available entities' },
      { status: 500 }
    )
  }
})