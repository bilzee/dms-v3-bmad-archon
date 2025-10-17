import { prisma } from '@/lib/db/client'
import { RapidAssessment, AssessmentType } from '@prisma/client'
import { 
  CreateRapidAssessmentInput,
  UpdateRapidAssessmentInput,
  QueryRapidAssessmentInput,
  HealthAssessmentInput,
  PopulationAssessmentInput,
  FoodAssessmentInput,
  WASHAssessmentInput,
  ShelterAssessmentInput,
  SecurityAssessmentInput
} from '@/lib/validation/rapid-assessment'

// Type for returned assessments with their specific data
export type RapidAssessmentWithData = RapidAssessment & {
  healthAssessment?: any
  populationAssessment?: any
  foodAssessment?: any
  washAssessment?: any
  shelterAssessment?: any
  securityAssessment?: any
}

export class RapidAssessmentService {
  static async create(
    input: CreateRapidAssessmentInput,
    createdBy: string
  ): Promise<RapidAssessmentWithData> {
    const { type, entityId, ...baseData } = input

    // Verify user is assigned to this entity
    await this.validateEntityAssignment(createdBy, entityId)

    // Start transaction to create both rapid assessment and type-specific assessment
    const result = await prisma.$transaction(async (tx) => {
      // Create base rapid assessment
      const rapidAssessment = await tx.rapidAssessment.create({
        data: {
          rapidAssessmentType: type,
          rapidAssessmentDate: input.rapidAssessmentDate,
          assessorId: createdBy,
          assessorName: input.assessorName,
          entityId: input.entityId,
          location: input.location,
          coordinates: input.coordinates,
          status: 'SUBMITTED',
          priority: input.priority,
          mediaAttachments: input.mediaAttachments || [],
          versionNumber: 1,
          isOfflineCreated: false,
          syncStatus: 'SYNCED',
          verificationStatus: 'SUBMITTED'
        }
      })

      // Create type-specific assessment based on type
      let typeSpecificAssessment = null
      switch (type) {
        case 'HEALTH':
          const healthData = (input as any).healthData
          typeSpecificAssessment = await tx.healthAssessment.create({
            data: {
              rapidAssessmentId: rapidAssessment.id,
              ...healthData,
              commonHealthIssues: JSON.stringify(healthData.commonHealthIssues || [])
            }
          })
          break

        case 'POPULATION':
          const populationData = (input as any).populationData
          typeSpecificAssessment = await tx.populationAssessment.create({
            data: {
              rapidAssessmentId: rapidAssessment.id,
              ...populationData
            }
          })
          break

        case 'FOOD':
          const foodData = (input as any).foodData
          typeSpecificAssessment = await tx.foodAssessment.create({
            data: {
              rapidAssessmentId: rapidAssessment.id,
              ...foodData,
              foodSource: JSON.stringify(foodData.foodSource || [])
            }
          })
          break

        case 'WASH':
          const washData = (input as any).washData
          if (!washData) {
            throw new Error('WASH assessment data (washData) is required but missing from input')
          }
          typeSpecificAssessment = await tx.washAssessment.create({
            data: {
              rapidAssessmentId: rapidAssessment.id,
              ...washData,
              waterSource: JSON.stringify(washData.waterSource || [])
            }
          })
          break

        case 'SHELTER':
          const shelterData = (input as any).shelterData
          typeSpecificAssessment = await tx.shelterAssessment.create({
            data: {
              rapidAssessmentId: rapidAssessment.id,
              ...shelterData,
              shelterTypes: JSON.stringify(shelterData.shelterTypes || []),
              requiredShelterType: JSON.stringify(shelterData.requiredShelterType || [])
            }
          })
          break

        case 'SECURITY':
          const securityData = (input as any).securityData
          typeSpecificAssessment = await tx.securityAssessment.create({
            data: {
              rapidAssessmentId: rapidAssessment.id,
              ...securityData
            }
          })
          break

        default:
          throw new Error(`Unsupported assessment type: ${type}`)
      }

      return { rapidAssessment, typeSpecificAssessment }
    })

    // Return the combined assessment
    return {
      ...result.rapidAssessment,
      [this.getTypeSpecificFieldName(result.rapidAssessment.rapidAssessmentType)]: result.typeSpecificAssessment
    }
  }

  static async findById(id: string): Promise<RapidAssessmentWithData | null> {
    const assessment = await prisma.rapidAssessment.findUnique({
      where: { id },
      include: {
        healthAssessment: true,
        populationAssessment: true,
        foodAssessment: true,
        washAssessment: true,
        shelterAssessment: true,
        securityAssessment: true,
        assessor: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        entity: {
          select: {
            id: true,
            name: true,
            type: true,
            location: true
          }
        }
      }
    })

    return assessment
  }

  static async findByUserId(
    userId: string,
    query: QueryRapidAssessmentInput
  ): Promise<{
    assessments: RapidAssessmentWithData[]
    total: number
    totalPages: number
  }> {
    const { page, limit, entityId, type, status, priority, startDate, endDate } = query
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = { assessorId: userId }

    if (entityId) where.entityId = entityId
    if (type) where.rapidAssessmentType = type
    if (status) where.status = status
    if (priority) where.priority = priority
    if (startDate || endDate) {
      where.rapidAssessmentDate = {}
      if (startDate) where.rapidAssessmentDate.gte = startDate
      if (endDate) where.rapidAssessmentDate.lte = endDate
    }

    // Get total count
    const total = await prisma.rapidAssessment.count({ where })

    // Get assessments with pagination
    const assessments = await prisma.rapidAssessment.findMany({
      where,
      include: {
        healthAssessment: true,
        populationAssessment: true,
        foodAssessment: true,
        washAssessment: true,
        shelterAssessment: true,
        securityAssessment: true,
        entity: {
          select: {
            id: true,
            name: true,
            type: true,
            location: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    })

    return {
      assessments,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }

  static async findAll(
    query: QueryRapidAssessmentInput
  ): Promise<{
    assessments: RapidAssessmentWithData[]
    total: number
    totalPages: number
  }> {
    const { page, limit, userId, entityId, type, status, priority, startDate, endDate } = query
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    if (userId) where.assessorId = userId
    if (entityId) where.entityId = entityId
    if (type) where.rapidAssessmentType = type
    if (status) where.status = status
    if (priority) where.priority = priority
    if (startDate || endDate) {
      where.rapidAssessmentDate = {}
      if (startDate) where.rapidAssessmentDate.gte = startDate
      if (endDate) where.rapidAssessmentDate.lte = endDate
    }

    // Get total count
    const total = await prisma.rapidAssessment.count({ where })

    // Get assessments with pagination
    const assessments = await prisma.rapidAssessment.findMany({
      where,
      include: {
        healthAssessment: true,
        populationAssessment: true,
        foodAssessment: true,
        washAssessment: true,
        shelterAssessment: true,
        securityAssessment: true,
        assessor: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        entity: {
          select: {
            id: true,
            name: true,
            type: true,
            location: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    })

    return {
      assessments,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }

  static async update(
    id: string,
    input: UpdateRapidAssessmentInput,
    updatedBy: string
  ): Promise<RapidAssessmentWithData> {
    // First check if assessment exists and user has permission
    const existingAssessment = await this.findById(id)
    if (!existingAssessment) {
      throw new Error('Assessment not found')
    }

    if (existingAssessment.assessorId !== updatedBy) {
      throw new Error('Not authorized to update this assessment')
    }

    const { type, ...baseData } = input

    // Update base rapid assessment
    const updatedAssessment = await prisma.rapidAssessment.update({
      where: { id },
      data: {
        ...baseData,
        updatedAt: new Date()
      },
      include: {
        healthAssessment: true,
        populationAssessment: true,
        foodAssessment: true,
        washAssessment: true,
        shelterAssessment: true,
        securityAssessment: true
      }
    })

    return updatedAssessment
  }

  static async delete(id: string, deletedBy: string): Promise<void> {
    // Check if assessment exists and user has permission
    const existingAssessment = await prisma.rapidAssessment.findUnique({
      where: { id },
      select: { assessorId: true }
    })

    if (!existingAssessment) {
      throw new Error('Assessment not found')
    }

    if (existingAssessment.assessorId !== deletedBy) {
      throw new Error('Not authorized to delete this assessment')
    }

    // Delete assessment (cascade will handle type-specific assessment)
    await prisma.rapidAssessment.delete({
      where: { id }
    })
  }

  static async submit(id: string, submittedBy: string): Promise<RapidAssessmentWithData> {
    const assessment = await this.findById(id)
    if (!assessment) {
      throw new Error('Assessment not found')
    }

    if (assessment.assessorId !== submittedBy) {
      throw new Error('Not authorized to submit this assessment')
    }

    const updatedAssessment = await prisma.rapidAssessment.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        updatedAt: new Date()
      },
      include: {
        healthAssessment: true,
        populationAssessment: true,
        foodAssessment: true,
        washAssessment: true,
        shelterAssessment: true,
        securityAssessment: true
      }
    })

    return updatedAssessment
  }

  private static async validateEntityAssignment(userId: string, entityId: string): Promise<void> {
    // Check if user is assigned to this entity
    const assignment = await prisma.entityAssignment.findFirst({
      where: {
        userId,
        entityId
      }
    })

    if (!assignment) {
      throw new Error('User is not assigned to this entity')
    }
  }

  private static getTypeSpecificFieldName(type: AssessmentType): string {
    const fieldMap = {
      'HEALTH': 'healthAssessment',
      'POPULATION': 'populationAssessment',
      'FOOD': 'foodAssessment',
      'WASH': 'washAssessment',
      'SHELTER': 'shelterAssessment',
      'SECURITY': 'securityAssessment'
    }

    return fieldMap[type] || 'healthAssessment'
  }
}