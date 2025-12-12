import { prisma } from '@/lib/db/client'
import { 
  RapidResponse, 
  ResponseStatus, 
  VerificationStatus,
  SyncStatus 
} from '@prisma/client'
import { 
  CreatePlannedResponseInput,
  CreateDeliveredResponseInput,
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

  static async createDeliveredResponse(
    input: CreateDeliveredResponseInput,
    responderId: string
  ): Promise<RapidResponseWithData> {
    const { assessmentId, entityId, items, deliveryNotes, ...baseData } = input

    // Validate responder has assignment to this entity
    await this.validateEntityAssignment(responderId, entityId)
    
    // Validate assessment exists and is verified
    const assessment = await this.validateAssessmentAccess(assessmentId, entityId)

    // Create the delivered response
    const result = await prisma.$transaction(async (tx) => {
      const response = await tx.rapidResponse.create({
        data: {
          ...baseData,
          responderId,
          assessmentId,
          entityId,
          status: 'DELIVERED',
          verificationStatus: 'SUBMITTED', // Delivered responses go straight to verification queue
          verifiedAt: new Date(), // Mark as verified for delivery timestamp
          items: items,
          resources: deliveryNotes ? { deliveryNotes } : null,
          versionNumber: 1,
          isOfflineCreated: false,
          syncStatus: 'SYNCED'
        }
      })

      // Create audit log
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
          status: 'DELIVERED',
          itemsCount: items.length,
          deliveryNotes
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
            location: true,
            coordinates: true,
            entity: {
              select: {
                id: true,
                name: true,
                type: true,
                location: true,
                coordinates: true
              }
            }
          }
        },
        entity: {
          select: {
            id: true,
            name: true,
            type: true,
            location: true,
            coordinates: true
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

  static async getAssignedResponsesForResponder(
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

    // Build where clause - include ALL statuses, not just PLANNED
    const where: any = {
      entityId: { in: entityIds }
    }

    if (filters.assessmentId) where.assessmentId = filters.assessmentId
    if (filters.entityId) where.entityId = filters.entityId
    if (filters.type) where.type = filters.type
    if (filters.status) where.status = filters.status

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

    // Check if entity has auto-approval configured
    const entityAutoApproval = await prisma.entity.findUnique({
      where: { id: existingResponse.entityId },
      select: {
        id: true,
        autoApproveEnabled: true,
        metadata: true
      }
    })

    // Determine verification status based on auto-approval
    let verificationStatus: VerificationStatus = 'SUBMITTED'
    
    console.log('🔍 Auto-approval check:', {
      entityId: existingResponse.entityId,
      entityFound: !!entityAutoApproval,
      autoApproveEnabled: entityAutoApproval?.autoApproveEnabled,
      metadata: entityAutoApproval?.metadata,
      hasConfig: !!(entityAutoApproval?.metadata as any)?.autoApproval
    })

    if (entityAutoApproval?.autoApproveEnabled) {
      // Check if auto-approval conditions are met
      const config = (entityAutoApproval.metadata as any)?.autoApproval
      
      console.log('🔍 Auto-approval config:', config)
      
      // Create enhanced response object with delivery data for evaluation
      const responseWithDeliveryData = {
        ...existingResponse,
        resources: {
          deliveryLocation: input.deliveryLocation,
          deliveryNotes: input.deliveryNotes,
          mediaAttachmentIds: input.mediaAttachmentIds,
          deliveredAt: new Date().toISOString()
        }
      }
      
      const shouldAutoVerify = this.checkAutoApprovalConditions(responseWithDeliveryData, config)
      
      console.log('🔍 Auto-approval evaluation:', {
        shouldAutoVerify,
        responseType: existingResponse.type,
        priority: existingResponse.priority,
        hasDeliveryData: {
          location: !!input.deliveryLocation,
          notes: !!input.deliveryNotes,
          media: !!input.mediaAttachmentIds?.length
        }
      })
      
      if (shouldAutoVerify) {
        verificationStatus = 'VERIFIED'
      }
    }

    // Update the response to delivered status
    const result = await prisma.$transaction(async (tx) => {
      const oldValues = {
        status: existingResponse.status,
        deliveredItems: (existingResponse as any).deliveredItems,
        deliveryLocation: (existingResponse as any).deliveryLocation,
        deliveryNotes: (existingResponse as any).deliveryNotes,
        mediaAttachmentIds: (existingResponse as any).mediaAttachmentIds,
        verificationStatus: existingResponse.verificationStatus
      }

      const updateData: any = {
        status: 'DELIVERED',
        verificationStatus,
        items: input.deliveredItems, // Store delivered items in the existing JSON field
        resources: {
          deliveryLocation: input.deliveryLocation,
          deliveryNotes: input.deliveryNotes,
          mediaAttachmentIds: input.mediaAttachmentIds,
          deliveredAt: new Date().toISOString()
        }, // Store delivery data in resources JSON field
        responseDate: new Date(), // Capture delivery timestamp
        updatedAt: new Date()
      }

      // If auto-verified, add verification details
      if (verificationStatus === 'VERIFIED') {
        updateData.verifiedAt = new Date()
        updateData.verifiedBy = 'auto-approval'
      }

      const response = await tx.rapidResponse.update({
        where: { id: responseId },
        data: updateData,
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
          verificationStatus,
          items: input.deliveredItems,
          resources: {
            deliveryLocation: input.deliveryLocation,
            deliveryNotes: input.deliveryNotes,
            mediaAttachmentIds: input.mediaAttachmentIds
          },
          responseDate: response.responseDate,
          verifiedAt: verificationStatus === 'VERIFIED' ? new Date() : null,
          verifiedBy: verificationStatus === 'VERIFIED' ? 'auto-approval' : null
        }
      )

      return response
    })

    return result
  }

  private static checkAutoApprovalConditions(
    response: any,
    config: any
  ): boolean {
    console.log('🔍 Checking auto-approval conditions:', {
      hasConfig: !!config,
      configStructure: config
    })

    if (!config) {
      console.log('❌ No auto-approval config found')
      return false
    }

    // Check response scope
    if (config.scope && config.scope !== 'both' && config.scope !== 'responses') {
      console.log('❌ Scope check failed:', config.scope)
      return false
    }
    
    // Check response types (if specified)
    if (config.responseTypes && config.responseTypes.length > 0) {
      if (!config.responseTypes.includes(response.type)) {
        console.log('❌ Response type check failed:', { 
          allowedTypes: config.responseTypes, 
          actualType: response.type 
        })
        return false
      }
    }
    
    // Check priority level
    if (config.maxPriority) {
      const priorityLevels = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4 } as const
      const maxPriorityLevel = priorityLevels[config.maxPriority as keyof typeof priorityLevels] || 2
      const responsePriorityLevel = priorityLevels[response.priority as keyof typeof priorityLevels] || 2
      
      if (responsePriorityLevel > maxPriorityLevel) {
        console.log('❌ Priority check failed:', { 
          maxAllowed: config.maxPriority, 
          actualPriority: response.priority 
        })
        return false
      }
    }
    
    // Check documentation requirement
    if (config.requiresDocumentation) {
      const resources = response.resources || {}
      const hasDocumentation = resources.deliveryNotes && 
        (resources.mediaAttachmentIds?.length > 0 || resources.deliveryLocation)
      
      console.log('🔍 Documentation check:', {
        requiresDocumentation: config.requiresDocumentation,
        hasDeliveryNotes: !!resources.deliveryNotes,
        hasMediaAttachments: !!resources.mediaAttachmentIds?.length,
        hasDeliveryLocation: !!resources.deliveryLocation,
        hasDocumentation
      })
      
      if (!hasDocumentation) {
        console.log('❌ Documentation check failed')
        return false
      }
    }
    
    console.log('✅ All auto-approval conditions passed')
    return true
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