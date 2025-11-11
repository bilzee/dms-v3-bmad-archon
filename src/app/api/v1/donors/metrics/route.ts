import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/client';

export const GET = withAuth(async (request: NextRequest, context) => {
  try {
    const { roles } = context;
    
    // Check if user has coordinator or donor role
    if (!roles.includes('COORDINATOR') && !roles.includes('DONOR')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Coordinator or Donor role required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange') || '30d';
    const donorId = searchParams.get('donorId');

    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    switch (dateRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Get donor metrics
    const [
      donorStats,
      topDonors,
      donorTrends,
      responseVerificationStats
    ] = await Promise.all([
      // Overall donor statistics
      prisma.donor.aggregate({
        _count: {
          id: true
        }
      }),

      // Top donors by commitments
      prisma.donor.findMany({
        take: 10,
        select: {
          id: true,
          name: true,
          contactEmail: true,
          _count: {
            select: {
              commitments: true
            }
          }
        },
        orderBy: {
          commitments: {
            _count: 'desc'
          }
        }
      }),

      // Donor trends over time
      (prisma.$queryRaw`
        SELECT 
          DATE(d.createdAt) as date,
          COUNT(*) as newDonors
        FROM Donor d
        WHERE d.createdAt >= ${startDate}
        GROUP BY DATE(d.createdAt)
        ORDER BY date DESC
        LIMIT 30
      ` as Promise<Array<{
        date: string;
        newDonors: number;
      }>>),

      // Response verification statistics by donor
      prisma.rapidResponse.groupBy({
        by: ['donorId'],
        where: {
          createdAt: {
            gte: startDate,
            lte: now
          },
          donorId: {
            not: null
          }
        },
        _count: {
          id: true
        }
      })
    ]);

    // Get detailed donor metrics with response verification data
    const donorsWithVerificationData = await prisma.donor.findMany({
      select: {
        id: true,
        name: true,
        contactEmail: true,
        createdAt: true,
        commitments: {
          select: {
            id: true,
            totalCommittedQuantity: true,
            status: true
          }
        },
        responses: {
          where: {
            createdAt: {
              gte: startDate,
              lte: now
            }
          },
          select: {
            id: true,
            verificationStatus: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      ...(donorId && { where: { id: donorId } })
    });

    // Calculate verification metrics for each donor
    const donorMetrics = donorsWithVerificationData.map(donor => {
      const totalResponses = donor.responses.length;
      const verifiedResponses = donor.responses.filter(r => 
        r.verificationStatus === 'VERIFIED' || r.verificationStatus === 'AUTO_VERIFIED'
      ).length;
      const rejectedResponses = donor.responses.filter(r => 
        r.verificationStatus === 'REJECTED'
      ).length;
      const pendingResponses = donor.responses.filter(r => 
        r.verificationStatus === 'SUBMITTED'
      ).length;

      const totalCommitments = donor.commitments.length;
      const availableCommitments = donor.commitments.filter(c => 
        c.status === 'PLANNED'
      ).length;
      const totalCommittedItems = donor.commitments.reduce((sum, c) => 
        sum + c.totalCommittedQuantity, 0
      );

      const verificationRate = totalResponses > 0 ? verifiedResponses / totalResponses : 0;
      const commitmentFulfillmentRate = totalCommitments > 0 ? (totalCommitments - availableCommitments) / totalCommitments : 0;

      return {
        donorId: donor.id,
        donorName: donor.name,
        donorEmail: donor.contactEmail,
        donorSince: donor.createdAt,
        metrics: {
          commitments: {
            total: totalCommitments,
            available: availableCommitments,
            fulfilled: totalCommitments - availableCommitments,
            totalItems: totalCommittedItems,
            fulfillmentRate: commitmentFulfillmentRate
          },
          responses: {
            total: totalResponses,
            verified: verifiedResponses,
            rejected: rejectedResponses,
            pending: pendingResponses,
            autoVerified: donor.responses.filter(r => r.verificationStatus === 'AUTO_VERIFIED').length,
            verificationRate: verificationRate
          },
          combined: {
            totalActivities: totalCommitments + totalResponses,
            verifiedActivities: (totalCommitments - availableCommitments) + verifiedResponses,
            overallSuccessRate: totalCommitments + totalResponses > 0 
              ? ((totalCommitments - availableCommitments) + verifiedResponses) / (totalCommitments + totalResponses)
              : 0
          }
        }
      };
    });

    // Calculate overall statistics
    const overallStats = {
      totalDonors: donorStats._count.id,
      totalCommitments: donorMetrics.reduce((sum, d) => sum + d.metrics.commitments.total, 0),
      totalResponses: donorMetrics.reduce((sum, d) => sum + d.metrics.responses.total, 0),
      averageVerificationRate: donorMetrics.length > 0 
        ? donorMetrics.reduce((sum, d) => sum + d.metrics.responses.verificationRate, 0) / donorMetrics.length
        : 0,
      totalVerifiedResponses: donorMetrics.reduce((sum, d) => sum + d.metrics.responses.verified, 0),
      topPerformers: donorMetrics
        .sort((a, b) => b.metrics.combined.overallSuccessRate - a.metrics.combined.overallSuccessRate)
        .slice(0, 5)
        .map(d => ({
          donorName: d.donorName,
          successRate: d.metrics.combined.overallSuccessRate,
          verifiedActivities: d.metrics.combined.verifiedActivities,
          totalActivities: d.metrics.combined.totalActivities
        }))
    };

    return NextResponse.json({
      success: true,
      data: {
        overall: overallStats,
        donors: donorMetrics,
        trends: donorTrends,
        topDonors: topDonors,
        responseVerificationStats: responseVerificationStats.reduce((acc, item) => {
          acc[item.donorId || 'unknown'] = item._count.id;
          return acc;
        }, {} as Record<string, number>)
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        requestId: crypto.randomUUID(),
        dateRange,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        totalDonors: donorMetrics.length
      }
    });

  } catch (error) {
    console.error('Donor metrics error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});