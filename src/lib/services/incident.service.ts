import { prisma } from '@/lib/db/client'
import { Incident } from '@prisma/client'
import { 
  CreateIncidentInput,
  QueryIncidentInput 
} from '@/lib/validation/incidents'

export class IncidentService {
  static async create(
    input: CreateIncidentInput,
    createdBy: string
  ): Promise<Incident> {
    const { data, preliminaryAssessmentId } = input

    const incident = await prisma.incident.create({
      data: {
        ...data,
        createdBy
      }
    })

    // Link preliminary assessment if provided
    if (preliminaryAssessmentId) {
      await prisma.preliminaryAssessment.update({
        where: { id: preliminaryAssessmentId },
        data: { incidentId: incident.id }
      })
    }

    return incident
  }

  static async createFromAssessment(
    assessmentId: string,
    incidentData: CreateIncidentInput['data'],
    createdBy: string
  ): Promise<{ incident: Incident; updatedAssessment: any }> {
    // Get the assessment to use its data for the incident
    const assessment = await prisma.preliminaryAssessment.findUnique({
      where: { id: assessmentId }
    })

    if (!assessment) {
      throw new Error('Assessment not found')
    }

    // Create incident with data from assessment
    const incident = await prisma.incident.create({
      data: {
        ...incidentData,
        location: incidentData.location || `${assessment.reportingLGA}, ${assessment.reportingWard}`,
        coordinates: incidentData.coordinates || {
          lat: assessment.reportingLatitude,
          lng: assessment.reportingLongitude
        },
        createdBy
      }
    })

    // Link the assessment to the incident
    const updatedAssessment = await prisma.preliminaryAssessment.update({
      where: { id: assessmentId },
      data: { incidentId: incident.id },
      include: { incident: true }
    })

    return { incident, updatedAssessment }
  }

  static async findById(id: string): Promise<Incident | null> {
    return await prisma.incident.findUnique({
      where: { id }
    })
  }

  static async findWithAssessments(id: string) {
    return await prisma.incident.findUnique({
      where: { id },
      include: {
        preliminaryAssessments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })
  }

  static async findAll(
    query: QueryIncidentInput
  ): Promise<{
    incidents: Incident[]
    total: number
    totalPages: number
  }> {
    const { page, limit, type, severity, status, entityId } = query

    const where: any = {}

    // Add filters
    if (type) {
      where.type = type
    }

    if (severity) {
      where.severity = severity
    }

    if (status) {
      where.status = status
    }

    // Filter by entity if specified
    if (entityId) {
      where.entities = {
        some: {
          entityId: entityId
        }
      }
    }

    // Get total count
    const total = await prisma.incident.count({ where })
    const totalPages = Math.ceil(total / limit)

    // Get incidents with pagination
    const incidents = await prisma.incident.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    })

    return {
      incidents,
      total,
      totalPages
    }
  }

  static async update(
    id: string,
    data: Partial<CreateIncidentInput['data']>
  ): Promise<Incident> {
    return await prisma.incident.update({
      where: { id },
      data
    })
  }

  static async updateStatus(
    id: string,
    status: 'ACTIVE' | 'CONTAINED' | 'RESOLVED'
  ): Promise<Incident> {
    return await prisma.incident.update({
      where: { id },
      data: { status }
    })
  }

  static async delete(id: string): Promise<void> {
    await prisma.incident.delete({
      where: { id }
    })
  }

  static async getIncidentTypes(): Promise<string[]> {
    // Get unique incident types from the database
    const types = await prisma.incident.findMany({
      select: { type: true },
      distinct: ['type']
    })
    
    return types.map(t => t.type)
  }

  static async getActiveIncidentsCount(): Promise<number> {
    return await prisma.incident.count({
      where: { status: 'ACTIVE' }
    })
  }

  static async getCriticalIncidentsCount(): Promise<number> {
    return await prisma.incident.count({
      where: { 
        status: 'ACTIVE',
        severity: 'CRITICAL'
      }
    })
  }
}