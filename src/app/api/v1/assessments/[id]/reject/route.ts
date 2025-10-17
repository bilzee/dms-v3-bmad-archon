import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { authConfig } from '@/lib/auth/config';

const rejectAssessmentSchema = z.object({
  reason: z.enum([
    'INCOMPLETE_DATA',
    'INACCURATE_INFORMATION', 
    'MISSING_DOCUMENTATION',
    'LOCATION_MISMATCH',
    'DUPLICATE_ASSESSMENT',
    'QUALITY_ISSUES',
    'OTHER'
  ]),
  feedback: z.string().min(1, 'Feedback is required when rejecting an assessment'),
  metadata: z.record(z.any()).optional()
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authConfig);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is coordinator
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { roles: { include: { role: true } } }
    });

    const hasCoordinatorRole = user?.roles.some(
      userRole => userRole.role.name === 'COORDINATOR'
    );

    if (!hasCoordinatorRole) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Coordinator role required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = rejectAssessmentSchema.parse(body);

    const assessmentId = params.id;

    // Start transaction for rejection
    const result = await db.$transaction(async (tx) => {
      // Get assessment with current status
      const assessment = await tx.rapidAssessment.findUnique({
        where: { id: assessmentId },
        include: {
          entity: true,
          assessor: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      if (!assessment) {
        throw new Error('Assessment not found');
      }

      // Check if assessment is in rejectable state
      if (assessment.verificationStatus !== 'SUBMITTED') {
        throw new Error(
          `Cannot reject assessment with status: ${assessment.verificationStatus}`
        );
      }

      // Update assessment to rejected status
      const updatedAssessment = await tx.rapidAssessment.update({
        where: { id: assessmentId },
        data: {
          verificationStatus: 'REJECTED',
          rejectionReason: validatedData.reason,
          rejectionFeedback: validatedData.feedback,
          verifiedAt: new Date(),
          verifiedBy: session.user.id
        },
        include: {
          entity: {
            select: {
              id: true,
              name: true,
              type: true,
              location: true
            }
          },
          assessor: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Create audit log entry
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'ASSESSMENT_REJECTED',
          entityType: 'RapidAssessment',
          entityId: assessmentId,
          details: {
            assessmentType: assessment.rapidAssessmentType,
            entityName: assessment.entity.name,
            rejectionReason: validatedData.reason,
            rejectionFeedback: validatedData.feedback,
            ...validatedData.metadata
          }
        }
      });

      return updatedAssessment;
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Assessment rejected successfully',
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        requestId: crypto.randomUUID()
      }
    });

  } catch (error) {
    console.error('Assessment rejection error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }, { status: 400 });
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}