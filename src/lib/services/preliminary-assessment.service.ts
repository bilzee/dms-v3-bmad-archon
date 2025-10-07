import { prisma } from '@/lib/db/client'
import { PreliminaryAssessment, Incident } from '@prisma/client'
import { 
  PreliminaryAssessmentInput, 
  CreatePreliminaryAssessmentInput,
  UpdatePreliminaryAssessmentInput,
  QueryPreliminaryAssessmentInput 
} from '@/lib/validation/preliminary-assessment'

export class PreliminaryAssessmentService {
  static async create(
    input: CreatePreliminaryAssessmentInput,
    createdBy: string
  ): Promise<PreliminaryAssessment & { incident?: Incident }> {
    const { data, createIncident, incidentData } = input

    let incident: Incident | undefined

    // Create incident if requested
    if (createIncident && incidentData) {
      incident = await prisma.incident.create({
        data: {
          type: incidentData.type,
          subType: incidentData.subType,
          severity: incidentData.severity,
          description: incidentData.description,
          location: incidentData.location,
          coordinates: {
            lat: data.reportingLatitude,
            lng: data.reportingLongitude
          },
          createdBy
        }
      })
    }

    // Create preliminary assessment
    const assessment = await prisma.preliminaryAssessment.create({
      data: {
        ...data,
        incidentId: incident?.id || data.incidentId,
      },
      include: {
        incident: true
      }
    })

    return assessment
  }

  static async findById(id: string): Promise<(PreliminaryAssessment & { incident?: Incident }) | null> {
    return await prisma.preliminaryAssessment.findUnique({
      where: { id },
      include: {
        incident: true
      }
    })
  }

  static async findByUserId(
    userId: string,
    query: QueryPreliminaryAssessmentInput
  ): Promise<{
    assessments: (PreliminaryAssessment & { incident?: Incident })[]
    total: number
    totalPages: number
  }> {
    const { page, limit, incidentId, lga, ward } = query

    const where: any = {}

    // Add filters
    if (incidentId) {
      where.incidentId = incidentId
    }

    if (lga) {
      where.reportingLGA = lga
    }

    if (ward) {
      where.reportingWard = ward
    }

    // Get total count
    const total = await prisma.preliminaryAssessment.count({ where })
    const totalPages = Math.ceil(total / limit)

    // Get assessments with pagination
    const assessments = await prisma.preliminaryAssessment.findMany({
      where,
      include: {
        incident: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    })

    return {
      assessments,
      total,
      totalPages
    }
  }

  static async findAll(
    query: QueryPreliminaryAssessmentInput
  ): Promise<{
    assessments: (PreliminaryAssessment & { incident?: Incident })[]
    total: number
    totalPages: number
  }> {
    const { page, limit, userId, incidentId, lga, ward } = query

    const where: any = {}

    // Add filters
    if (userId) {
      // Note: PreliminaryAssessment doesn't have userId, so we can't filter by it directly
      // This would need to be handled differently if we need user-based filtering
    }

    if (incidentId) {
      where.incidentId = incidentId
    }

    if (lga) {
      where.reportingLGA = lga
    }

    if (ward) {
      where.reportingWard = ward
    }

    // Get total count
    const total = await prisma.preliminaryAssessment.count({ where })
    const totalPages = Math.ceil(total / limit)

    // Get assessments with pagination
    const assessments = await prisma.preliminaryAssessment.findMany({
      where,
      include: {
        incident: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    })

    return {
      assessments,
      total,
      totalPages
    }
  }

  static async update(
    id: string,
    input: UpdatePreliminaryAssessmentInput
  ): Promise<PreliminaryAssessment & { incident?: Incident }> {
    const assessment = await prisma.preliminaryAssessment.update({
      where: { id },
      data: input.data,
      include: {
        incident: true
      }
    })

    return assessment
  }

  static async delete(id: string): Promise<void> {
    await prisma.preliminaryAssessment.delete({
      where: { id }
    })
  }

  static async linkToIncident(assessmentId: string, incidentId: string): Promise<PreliminaryAssessment> {
    return await prisma.preliminaryAssessment.update({
      where: { id: assessmentId },
      data: { incidentId }
    })
  }
}