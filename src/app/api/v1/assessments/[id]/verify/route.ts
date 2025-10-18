import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';

const verifyAssessmentSchema = z.object({
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

export const POST = withAuth(async (
  request: NextRequest,
  context: { params: { id: string } }
) => {
  try {
    const { user } = context;
    const body = await request.json();
    const validatedData = verifyAssessmentSchema.parse(body);

    const assessmentId = context.params.id;

    // Start transaction for verification
    const result = await prisma.$transaction(async (tx) => {
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

      // Check if assessment is in verifiable state
      if (assessment.verificationStatus !== 'SUBMITTED') {
        throw new Error(
          `Cannot verify assessment with status: ${assessment.verificationStatus}`
        );
      }

      // Update assessment to verified status
      const updatedAssessment = await tx.rapidAssessment.update({
        where: { id: assessmentId },
        data: {
          verificationStatus: 'VERIFIED',
          verifiedAt: new Date(),
          verifiedBy: user.id
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
          userId: user.id,
          action: 'ASSESSMENT_VERIFIED',
          entityType: 'RapidAssessment',
          entityId: assessmentId,
          details: {
            assessmentType: assessment.rapidAssessmentType,
            entityName: assessment.entity.name,
            verificationNotes: validatedData.notes,
            ...validatedData.metadata
          }
        }
      });

      return updatedAssessment;
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Assessment verified successfully',
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        requestId: crypto.randomUUID()
      }
    });

  } catch (error) {
    console.error('Assessment verification error:', error);

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
});