import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { entityAssignmentService } from '@/lib/services/entity-assignment.service'

export async function GET(request: NextRequest) {
  try {
    // Get user from session/token
    const { searchParams } = new URL(request.url)
    let userId = searchParams.get('userId')
    
    // Temporary fix: Try to find the assessor user by email if no userId provided
    if (!userId) {
      // For testing purposes, find the assessor user by email
      // TODO: Get this from the session/token in production
      try {
        const { prisma } = await import('@/lib/db/client')
        const assessorUser = await prisma.user.findUnique({
          where: { email: 'assessor@test.com' }
        })
        if (assessorUser) {
          userId = assessorUser.id
        }
      } catch (err) {
        console.error('Error finding assessor user:', err)
      }
      
      // If still no userId, return an error
      if (!userId) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }
    }

    // Get available entities for assessment
    const availableEntities = await entityAssignmentService.getAvailableEntitiesForAssessment(userId)
    
    // Enhance with assignment information
    const entitiesWithInfo = await Promise.all(
      availableEntities.map(async (entity) => {
        try {
          const assignedUsers = await entityAssignmentService.getEntityAssignedUsers(entity.id)
          const canCreate = await entityAssignmentService.canCreateAssessment(userId, entity.id)
          
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
      { error: 'Failed to get available entities' },
      { status: 500 }
    )
  }
}