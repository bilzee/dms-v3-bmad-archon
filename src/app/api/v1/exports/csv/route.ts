import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db/client';
import { z } from 'zod';

const CSVExportRequestSchema = z.object({
  dataType: z.enum(['assessments', 'responses', 'entities', 'incidents', 'commitments']),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  format: z.enum(['csv', 'xlsx']).default('csv'),
  filters: z.record(z.any()).optional(),
});

const ROLE_PERMISSIONS = {
  assessor: ['assessments'],
  coordinator: ['assessments', 'responses', 'entities', 'incidents'],
  responder: ['responses', 'entities', 'incidents'],
  donor: ['commitments'],
  admin: ['assessments', 'responses', 'entities', 'incidents', 'commitments'],
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = CSVExportRequestSchema.parse(body);

    // Check role-based permissions
    const userRole = (session.user as any).role as string;
    const allowedDataTypes = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS] || [];
    
    if (!allowedDataTypes.includes(validatedData.dataType)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions for this data type' },
        { status: 403 }
      );
    }

    // Generate CSV data based on type
    const csvData = await generateCSVData(validatedData, userRole);
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${validatedData.dataType}_export_${timestamp}.${validatedData.format}`;
    
    // Return CSV file
    return new NextResponse(csvData, {
      headers: {
        'Content-Type': validatedData.format === 'csv' 
          ? 'text/csv' 
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('CSV export error:', error);
    return NextResponse.json(
      { success: false, error: 'Export failed' },
      { status: 500 }
    );
  }
}

async function generateCSVData(request: z.infer<typeof CSVExportRequestSchema>, userRole: string): Promise<string> {
  const { dataType, startDate, endDate, filters } = request;

  switch (dataType) {
    case 'assessments':
      return generateAssessmentsCSV(startDate, endDate, filters);
    case 'responses':
      return generateResponsesCSV(startDate, endDate, filters);
    case 'entities':
      return generateEntitiesCSV(startDate, endDate, filters);
    case 'incidents':
      return generateIncidentsCSV(startDate, endDate, filters);
    case 'commitments':
      return generateCommitmentsCSV(startDate, endDate, filters, userRole);
    default:
      throw new Error(`Unsupported data type: ${dataType}`);
  }
}

async function generateAssessmentsCSV(startDate?: string, endDate?: string, filters?: Record<any, any>): Promise<string> {
  const assessments = await db.rapidAssessment.findMany({
    where: {
      ...(startDate && { createdAt: { gte: new Date(startDate) } }),
      ...(endDate && { createdAt: { lte: new Date(endDate) } }),
      ...(filters && {
        assessmentType: filters.assessmentType,
        verificationStatus: filters.verificationStatus,
        locationId: filters.locationId,
      }),
    },
    include: {
      assessor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const headers = [
    'ID', 'Assessment Type', 'Assessment Date', 'Status', 'Location', 'Coordinates',
    'Created Date', 'Last Updated', 'Assessor Name', 'Priority', 'Version',
    'Is Offline Created', 'Sync Status', 'Verification Status', 'Verified At'
  ];

  const csvRows = assessments.map(assessment => [
    assessment.id,
    assessment.rapidAssessmentType,
    assessment.rapidAssessmentDate.toISOString(),
    assessment.status,
    assessment.location || 'Unknown',
    assessment.coordinates ? JSON.stringify(assessment.coordinates) : 'N/A',
    assessment.createdAt.toISOString(),
    assessment.updatedAt.toISOString(),
    assessment.assessor?.name || assessment.assessorName || 'Unassigned',
    assessment.priority,
    assessment.versionNumber,
    assessment.isOfflineCreated,
    assessment.syncStatus,
    assessment.verificationStatus,
    assessment.verifiedAt?.toISOString() || '',
  ]);

  return [headers, ...csvRows].map(row => row.join(',')).join('\n');
}

async function generateResponsesCSV(startDate?: string, endDate?: string, filters?: Record<any, any>): Promise<string> {
  const responses = await db.rapidResponse.findMany({
    where: {
      ...(startDate && { createdAt: { gte: new Date(startDate) } }),
      ...(endDate && { createdAt: { lte: new Date(endDate) } }),
      ...(filters && {
        status: filters.status,
        responsePriority: filters.responsePriority,
        assessmentId: filters.assessmentId,
      }),
    },
    include: {
      assessment: {
        select: {
          id: true,
          assessmentType: true,
          location: {
            select: { name: true, coordinates: true }
          }
        }
      },
      entity: {
        select: {
          id: true,
          name: true,
          type: true,
        }
      },
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const headers = [
    'ID', 'Assessment ID', 'Assessment Type', 'Response Priority',
    'Status', 'Entity Name', 'Entity Type', 'Assigned To', 'Created Date',
    'Target Completion Date', 'Actual Completion Date', 'Progress Percentage',
    'Resources Required', 'Resources Deployed', 'Cost Estimate', 'Actual Cost',
    'Notes', 'Location Name', 'Coordinates'
  ];

  const csvRows = responses.map(response => [
    response.id,
    response.assessmentId,
    response.assessment?.assessmentType || 'Unknown',
    response.responsePriority || 'Medium',
    response.status,
    response.entity?.name || 'Unknown',
    response.entity?.type || 'Unknown',
    response.assignedTo?.name || 'Unassigned',
    response.createdAt.toISOString(),
    response.targetCompletionDate?.toISOString() || '',
    response.actualCompletionDate?.toISOString() || '',
    response.progressPercentage || 0,
    response.resourcesRequired || '',
    response.resourcesDeployed || '',
    response.costEstimate || 0,
    response.actualCost || 0,
    response.notes || '',
    response.assessment?.location?.name || 'Unknown',
    response.assessment?.location?.coordinates || 'N/A',
  ]);

  return [headers, ...csvRows].map(row => row.join(',')).join('\n');
}

async function generateEntitiesCSV(startDate?: string, endDate?: string, filters?: Record<any, any>): Promise<string> {
  const entities = await db.entity.findMany({
    where: {
      ...(filters && {
        type: filters.type,
        status: filters.status,
        jurisdictionId: filters.jurisdictionId,
      }),
    },
    include: {
      jurisdiction: {
        select: {
          id: true,
          name: true,
          level: true,
        },
      },
      assignedAssessors: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          assessments: true,
          responses: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const headers = [
    'ID', 'Name', 'Type', 'Status', 'Coordinates', 'Address',
    'Jurisdiction Name', 'Jurisdiction Level', 'Population Size',
    'Contact Person', 'Contact Phone', 'Contact Email', 'Operating Hours',
    'Capacity', 'Current Load', 'Assessment Count', 'Response Count',
    'Created Date', 'Last Updated'
  ];

  const csvRows = entities.map(entity => [
    entity.id,
    entity.name,
    entity.type,
    entity.status,
    entity.coordinates || 'N/A',
    entity.address || 'N/A',
    entity.jurisdiction?.name || 'Unknown',
    entity.jurisdiction?.level || 'Unknown',
    entity.populationSize || 0,
    entity.contactPerson || '',
    entity.contactPhone || '',
    entity.contactEmail || '',
    entity.operatingHours || '',
    entity.capacity || 0,
    entity.currentLoad || 0,
    entity._count.assessments,
    entity._count.responses,
    entity.createdAt.toISOString(),
    entity.updatedAt.toISOString(),
  ]);

  return [headers, ...csvRows].map(row => row.join(',')).join('\n');
}

async function generateIncidentsCSV(startDate?: string, endDate?: string, filters?: Record<any, any>): Promise<string> {
  const incidents = await db.incident.findMany({
    where: {
      ...(startDate && { createdAt: { gte: new Date(startDate) } }),
      ...(endDate && { createdAt: { lte: new Date(endDate) } }),
      ...(filters && {
        type: filters.type,
        severity: filters.severity,
        status: filters.status,
        locationId: filters.locationId,
      }),
    },
    include: {
      location: {
        select: {
          id: true,
          name: true,
          coordinates: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          assessments: true,
          responses: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const headers = [
    'ID', 'Type', 'Severity', 'Status', 'Title', 'Description',
    'Location Name', 'Coordinates', 'Affected Area Radius (km)',
    'Estimated Population Affected', 'Created Date', 'Last Updated',
    'Reported By', 'Assigned To', 'Assessment Count', 'Response Count',
    'Estimated Resolution Time', 'Communication Channels Status'
  ];

  const csvRows = incidents.map(incident => [
    incident.id,
    incident.type,
    incident.severity,
    incident.status,
    incident.title || '',
    incident.description || '',
    incident.location?.name || 'Unknown',
    incident.location?.coordinates || 'N/A',
    incident.affectedAreaRadius || 0,
    incident.estimatedPopulationAffected || 0,
    incident.createdAt.toISOString(),
    incident.updatedAt.toISOString(),
    incident.reportedBy || '',
    incident.assignedTo?.name || 'Unassigned',
    incident._count.assessments,
    incident._count.responses,
    incident.estimatedResolutionTime || '',
    incident.communicationChannelsStatus || 'Unknown',
  ]);

  return [headers, ...csvRows].map(row => row.join(',')).join('\n');
}

async function generateCommitmentsCSV(startDate?: string, endDate?: string, filters?: Record<any, any>, userRole: string): Promise<string> {
  // Donors can only see their own commitments
  const whereClause: any = {
    ...(startDate && { createdAt: { gte: new Date(startDate) } }),
    ...(endDate && { createdAt: { lte: new Date(endDate) } }),
    ...(filters && {
      status: filters.status,
      incidentId: filters.incidentId,
      entityId: filters.entityId,
    }),
  };

  if (userRole === 'donor') {
    // Filter by donor's organization (this would need to be determined from session)
    whereClause.donorId = session?.user?.organizationId;
  }

  const commitments = await db.commitment.findMany({
    where: whereClause,
    include: {
      donor: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
      entity: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
      incident: {
        select: {
          id: true,
          title: true,
          type: true,
        },
      },
      _count: {
        select: {
          items: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const headers = [
    'ID', 'Donor Name', 'Donor Type', 'Entity Name', 'Entity Type',
    'Incident Title', 'Incident Type', 'Status', 'Created Date',
    'Expected Delivery Date', 'Actual Delivery Date', 'Total Items',
    'Total Estimated Value', 'Notes', 'Priority Level'
  ];

  const csvRows = commitments.map(commitment => [
    commitment.id,
    commitment.donor?.name || 'Unknown',
    commitment.donor?.type || 'Unknown',
    commitment.entity?.name || 'Unknown',
    commitment.entity?.type || 'Unknown',
    commitment.incident?.title || 'Unknown',
    commitment.incident?.type || 'Unknown',
    commitment.status,
    commitment.createdAt.toISOString(),
    commitment.expectedDeliveryDate?.toISOString() || '',
    commitment.actualDeliveryDate?.toISOString() || '',
    commitment._count.items,
    commitment.totalEstimatedValue || 0,
    commitment.notes || '',
    commitment.priorityLevel || 'Medium',
  ]);

  return [headers, ...csvRows].map(row => row.join(',')).join('\n');
}

// Get available export types for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userRole = (session.user as any).role as string;
    const allowedDataTypes = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS] || [];

    return NextResponse.json({
      success: true,
      data: {
        availableExports: allowedDataTypes,
        formats: ['csv', 'xlsx'],
        maxFileSize: '50MB',
      },
    });
  } catch (error) {
    console.error('Get export types error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get export options' },
      { status: 500 }
    );
  }
}