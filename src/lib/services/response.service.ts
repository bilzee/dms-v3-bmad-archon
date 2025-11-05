import { prisma } from '@/lib/db/client'
import { 
  RapidResponse, 
  ResponseStatus, 
  VerificationStatus,
  SyncStatus 
} from '@prisma/client'
import { 
  CreatePlannedResponseInput,
  UpdatePlannedResponseInput,
  ResponseQueryInput,
  ResponseItem,
  ConfirmDeliveryInput
} from '@/lib/validation/response'

export type RapidResponseWithData = RapidResponse & {
  assessment?: any
  entity?: any
  responder?: any
  donor?: any
}

export class ResponseService {
  static async createPlannedResponse(
    input: CreatePlannedResponseInput,
    responderId: string
  ): Promise<RapidResponseWithData> {
    const { assessmentId, entityId, items, ...baseData } = input

    // Validate responder has assignment to this entity
    await this.validateEntityAssignment(responderId, entityId)
    
    // Validate assessment exists and is verified
    const assessment = await this.validateAssessmentAccess(assessmentId, entityId)

    // Check for existing planned response for this assessment
    const existingResponse = await prisma.rapidResponse.findFirst({
      where: {
        assessmentId,
        status: 'PLANNED'
      }
    })

    if (existingResponse) {
      throw new Error('A planned response already exists for this assessment')
    }

    // Create the planned response
    const result = await prisma.$transaction(async (tx) => {
      const response = await tx.rapidResponse.create({
        data: {
          ...baseData,
          assessmentId,
          entityId,
          responderId,
          status: 'PLANNED' as ResponseStatus,
          verificationStatus: 'DRAFT' as VerificationStatus,
          syncStatus: 'LOCAL' as SyncStatus,
          items: items as any, // JSON field
          plannedDate: new Date()
        },
        include: {
          assessment: {
            select: {
              id: true,
              rapidAssessmentType: true,
              rapidAssessmentDate: true,
              status: true,
              verificationStatus: true,
              entity: {
                select: {
                  id: true,
                  name: true,
                  type: true
                }
              }
            }
          },
          entity: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          responder: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })

      // Log audit trail
      await this.createAuditLog(
        tx,
        responderId,
        'CREATE',
        'response',
        response.id,
        null,
        {
          assessmentId,
          entityId,
          type: baseData.type,
          priority: baseData.priority,
          itemsCount: items.length
        }
      )

      return response
    })

    return result
  }

  static async getResponseById(
    responseId: string,
    requesterId: string
  ): Promise<RapidResponseWithData> {
    const response = await prisma.rapidResponse.findUnique({
      where: { id: responseId },
      include: {
        assessment: {
          select: {
            id: true,
            rapidAssessmentType: true,
            rapidAssessmentDate: true,
            status: true,
            verificationStatus: true,
            entity: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          }
        },
        entity: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        responder: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        donor: {
          select: {
            id: true,
            name: true,
            type: true,
            contactEmail: true
          }
        }
      }
    })

    if (!response) {
      throw new Error('Response not found')
    }

    // Validate requester has access to this entity's responses
    await this.validateEntityAssignment(requesterId, response.entityId)

    return response
  }

  static async updatePlannedResponse(
    responseId: string,
    input: UpdatePlannedResponseInput,
    requesterId: string
  ): Promise<RapidResponseWithData> {
    // Get existing response and validate access
    const existingResponse = await this.getResponseById(responseId, requesterId)

    // Can only update responses in PLANNED status
    if (existingResponse.status !== 'PLANNED') {
      throw new Error('Only planned responses can be updated')
    }

    // Update the response
    const result = await prisma.$transaction(async (tx) => {
      const oldValues = {
        type: existingResponse.type,
        priority: existingResponse.priority,
        description: existingResponse.description,
        items: existingResponse.items
      }

      const response = await tx.rapidResponse.update({
        where: { id: responseId },
        data: {
          ...input,
          updatedAt: new Date()
        },
        include: {
          assessment: {
            select: {
              id: true,
              rapidAssessmentType: true,
              rapidAssessmentDate: true,
              status: true,
              verificationStatus: true
            }
          },
          entity: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          responder: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })

      // Log audit trail
      await this.createAuditLog(
        tx,
        requesterId,
        'UPDATE',
        'response',
        responseId,
        oldValues,
        input
      )

      return response
    })

    return result
  }

  static async getPlannedResponsesForResponder(
    responderId: string,
    query: ResponseQueryInput = { limit: 20, page: 1 }
  ): Promise<{ responses: RapidResponseWithData[], total: number }> {
    const { page = 1, limit = 20, ...filters } = query

    // Get entities assigned to this responder
    const assignedEntities = await prisma.entityAssignment.findMany({
      where: { userId: responderId },
      select: { entityId: true }
    })

    const entityIds = assignedEntities.map(ea => ea.entityId)

    if (entityIds.length === 0) {
      return { responses: [], total: 0 }
    }

    // Build where clause
    const where: any = {
      entityId: { in: entityIds },
      status: 'PLANNED'
    }

    if (filters.assessmentId) where.assessmentId = filters.assessmentId
    if (filters.entityId) where.entityId = filters.entityId
    if (filters.type) where.type = filters.type

    // Get total count
    const total = await prisma.rapidResponse.count({ where })

    // Get paginated responses
    const responses = await prisma.rapidResponse.findMany({
      where,
      include: {
        assessment: {
          select: {
            id: true,
            rapidAssessmentType: true,
            rapidAssessmentDate: true,
            status: true,
            verificationStatus: true
          }
        },
        entity: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        responder: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { plannedDate: 'desc' }
      ],
      skip: (page - 1) * limit,
      take: limit
    })

    return { responses, total }
  }

  static async confirmDelivery(
    responseId: string,
    input: ConfirmDeliveryInput,
    requesterId: string
  ): Promise<RapidResponseWithData> {
    // Get existing response and validate access
    const existingResponse = await this.getResponseById(responseId, requesterId)

    // Can only confirm delivery for responses in PLANNED status
    if (existingResponse.status !== 'PLANNED') {
      throw new Error('Only planned responses can have delivery confirmed')
    }

    // Update the response to delivered status
    const result = await prisma.$transaction(async (tx) => {
      const oldValues = {
        status: existingResponse.status,
        deliveredItems: (existingResponse as any).deliveredItems,
        deliveryLocation: (existingResponse as any).deliveryLocation,
        deliveryNotes: (existingResponse as any).deliveryNotes,
        mediaAttachmentIds: (existingResponse as any).mediaAttachmentIds
      }

      const response = await tx.rapidResponse.update({
        where: { id: responseId },
        data: {
          status: 'DELIVERED',
          deliveredItems: input.deliveredItems,
          deliveryLocation: input.deliveryLocation,
          deliveryNotes: input.deliveryNotes,
          mediaAttachmentIds: input.mediaAttachmentIds,
          deliveredAt: new Date(),
          updatedAt: new Date()
        } as any,
        include: {
          assessment: {
            select: {
              id: true,
              rapidAssessmentType: true,
              rapidAssessmentDate: true,
              status: true,
              verificationStatus: true
            }
          },
          entity: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          responder: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })

      // Create audit log
      await this.createAuditLog(
        tx,
        requesterId,
        'CONFIRM_DELIVERY',
        'RapidResponse',
        responseId,
        oldValues,
        {
          status: 'DELIVERED',
          deliveredItems: input.deliveredItems,
          deliveryLocation: input.deliveryLocation,
          deliveryNotes: input.deliveryNotes,
          mediaAttachmentIds: input.mediaAttachmentIds,
          deliveredAt: (response as any).deliveredAt
        }
      )

      return response
    })

    return result
  }

  private static async validateEntityAssignment(
    userId: string,
    entityId: string
  ): Promise<void> {
    const assignment = await prisma.entityAssignment.findUnique({
      where: {
        userId_entityId: {
          userId,
          entityId
        }
      }
    })

    if (!assignment) {
      throw new Error('User is not assigned to this entity')
    }
  }

  private static async validateAssessmentAccess(
    assessmentId: string,
    entityId: string
  ): Promise<any> {
    const assessment = await prisma.rapidAssessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        entityId: true,
        verificationStatus: true,
        status: true
      }
    })

    if (!assessment) {
      throw new Error('Assessment not found')
    }

    if (assessment.entityId !== entityId) {
      throw new Error('Assessment does not belong to this entity')
    }

    if (assessment.verificationStatus !== 'VERIFIED' && assessment.verificationStatus !== 'AUTO_VERIFIED') {
      throw new Error('Assessment must be verified before response planning')
    }

    return assessment
  }

  private static async createAuditLog(
    tx: any,
    userId: string,
    action: string,
    resource: string,
    resourceId: string,
    oldValues: any,
    newValues: any
  ): Promise<void> {
    await tx.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        oldValues: oldValues as any,
        newValues: newValues as any
      }
    })
  }
}