import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db/client';
import { auditLog } from '@/lib/services/audit.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication check
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Authorization check - COORDINATOR role required
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (!user || user.role !== 'COORDINATOR') {
      await auditLog({
        userId: session.user.id,
        action: 'UNAUTHORIZED_ACCESS',
        resource: 'DONOR_RECOMMENDATIONS',
        resourceId: params.id,
        oldValues: null,
        newValues: null,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      });
      
      return NextResponse.json(
        { success: false, error: 'Forbidden - Coordinator access required' },
        { status: 403 }
      );
    }

    const entityId = params.id;

    // Verify entity exists
    const entity = await db.entity.findUnique({
      where: { id: entityId },
      select: {
        id: true,
        name: true,
        type: true,
        location: true
      }
    });

    if (!entity) {
      return NextResponse.json(
        { success: false, error: 'Entity not found' },
        { status: 404 }
      );
    }

    // Get the latest verified assessment for the entity to identify gaps
    const latestAssessment = await db.assessment.findFirst({
      where: {
        entityId: entityId,
        status: 'VERIFIED'
      },
      select: {
        id: true,
        resources: {
          select: {
            resourceType: true,
            requiredQuantity: true,
            committedQuantity: true,
            deliveredQuantity: true,
            gap: true,
            severity: true,
            priority: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!latestAssessment || latestAssessment.resources.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          data: [],
          message: 'No verified assessments found for this entity'
        }
      });
    }

    // Extract resource gaps from the assessment
    const resourceGaps = latestAssessment.resources
      .filter(resource => resource.gap > 0)
      .sort((a, b) => {
        // Sort by severity first, then by gap size
        const severityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
        if (severityDiff !== 0) return severityDiff;
        return b.gap - a.gap;
      });

    if (resourceGaps.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          data: [],
          message: 'No resource gaps found for this entity'
        }
      });
    }

    // Get all active donors
    const donors = await db.donor.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        type: true,
        contactEmail: true,
        contactPhone: true,
        organization: true,
        selfReportedDeliveryRate: true,
        verifiedDeliveryRate: true,
        commitments: {
          select: {
            items: true,
            status: true,
            totalCommittedQuantity: true,
            deliveredQuantity: true,
            totalValueEstimated: true
          }
        }
      }
    });

    // Calculate donor capabilities and compatibility scores
    const recommendations = donors.map(donor => {
      const donorCapabilities = analyzeDonorCapabilities(donor);
      const compatibilityScore = calculateCompatibilityScore(resourceGaps, donorCapabilities);
      const recommendedItems = generateRecommendations(resourceGaps, donorCapabilities);

      return {
        donorId: donor.id,
        donor: {
          id: donor.id,
          name: donor.name,
          type: donor.type,
          contactEmail: donor.contactEmail,
          contactPhone: donor.contactPhone,
          organization: donor.organization,
          selfReportedDeliveryRate: donor.selfReportedDeliveryRate,
          verifiedDeliveryRate: donor.verifiedDeliveryRate
        },
        compatibilityScore,
        recommendedItems,
        totalCapacity: recommendedItems.reduce((sum, item) => sum + item.maxQuantity, 0)
      };
    })
    .filter(rec => rec.compatibilityScore > 0) // Only include donors with some compatibility
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore) // Sort by compatibility score
    .slice(0, 10); // Top 10 recommendations

    // Log successful access
    await auditLog({
      userId: session.user.id,
      action: 'ACCESS_DONOR_RECOMMENDATIONS',
      resource: 'DONOR_RECOMMENDATIONS',
      resourceId: entityId,
      oldValues: null,
      newValues: { 
        entityId,
        resourceGaps: resourceGaps.length,
        recommendations: recommendations.length
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    });

    return NextResponse.json({
      success: true,
      data: {
        data: recommendations
      }
    });

  } catch (error) {
    console.error('Error fetching donor recommendations:', error);
    
    // Log error
    try {
      const session = await getServerSession();
      if (session?.user?.id) {
        await auditLog({
          userId: session.user.id,
          action: 'ERROR_ACCESS_DONOR_RECOMMENDATIONS',
          resource: 'DONOR_RECOMMENDATIONS',
          resourceId: params.id,
          oldValues: null,
          newValues: { error: error instanceof Error ? error.message : 'Unknown error' },
          ipAddress: request.headers.get('x-forwarded-for') || undefined,
          userAgent: request.headers.get('user-agent') || undefined
        });
      }
    } catch (auditError) {
      // Ignore audit log errors
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Analyze donor capabilities based on past commitments
function analyzeDonorCapabilities(donor: any): Record<string, number> {
  const capabilities: Record<string, number> = {};
  
  // Extract items from all commitments
  donor.commitments.forEach((commitment: any) => {
    if (Array.isArray(commitment.items)) {
      commitment.items.forEach((item: any) => {
        const resourceName = item.name?.toUpperCase();
        if (resourceName && item.quantity) {
          capabilities[resourceName] = (capabilities[resourceName] || 0) + item.quantity;
        }
      });
    }
  });

  return capabilities;
}

// Calculate compatibility score between resource gaps and donor capabilities
function calculateCompatibilityScore(
  resourceGaps: any[],
  donorCapabilities: Record<string, number>
): number {
  let totalScore = 0;
  let maxPossibleScore = 0;

  resourceGaps.forEach(gap => {
    maxPossibleScore += 100; // Each gap is worth up to 100 points
    
    const resourceName = gap.resourceType?.toUpperCase();
    const capability = donorCapabilities[resourceName] || 0;
    
    if (capability > 0) {
      // Score based on how much of the gap the donor can fill
      const fillPercentage = Math.min((capability / gap.gap) * 100, 100);
      
      // Weight by severity and priority
      let weight = 1;
      if (gap.severity === 'HIGH') weight = 3;
      else if (gap.severity === 'MEDIUM') weight = 2;
      
      const weightedScore = fillPercentage * weight;
      totalScore += weightedScore;
    }
  });

  // Normalize to 0-100 scale
  return maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;
}

// Generate specific item recommendations for a donor
function generateRecommendations(
  resourceGaps: any[],
  donorCapabilities: Record<string, number>
): Array<{
  itemName: string;
  maxQuantity: number;
  matchReason: string;
}> {
  const recommendations: Array<{
    itemName: string;
    maxQuantity: number;
    matchReason: string;
  }> = [];

  resourceGaps.forEach(gap => {
    const resourceName = gap.resourceType?.toUpperCase();
    const capability = donorCapabilities[resourceName] || 0;

    if (capability > 0) {
      const recommendedQuantity = Math.min(capability, gap.gap);
      
      let reason = 'Has previous experience with this resource';
      if (capability >= gap.gap) {
        reason = 'Can fully meet the requirement';
      } else if (capability >= gap.gap * 0.7) {
        reason = 'Can meet most of the requirement';
      } else if (capability >= gap.gap * 0.3) {
        reason = 'Can partially meet the requirement';
      }

      recommendations.push({
        itemName: gap.resourceType,
        maxQuantity: recommendedQuantity,
        matchReason: reason
      });
    }
  });

  return recommendations.sort((a, b) => b.maxQuantity - a.maxQuantity);
}