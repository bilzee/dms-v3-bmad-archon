import { db } from '@/lib/db/client';

/**
 * Database optimization service for gamification performance
 * Provides methods for maintaining indexes, updating views, and optimizing queries
 */
export class DatabaseOptimizationService {
  
  /**
   * Refresh the leaderboard materialized view
   */
  static async refreshLeaderboardSnapshot(): Promise<void> {
    try {
      await db.$executeRaw`SELECT refresh_leaderboard_snapshot()`;
      console.log('Leaderboard snapshot refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh leaderboard snapshot:', error);
      throw error;
    }
  }

  /**
   * Get database performance statistics
   */
  static async getPerformanceStats(): Promise<{
    totalDonors: number;
    activeDonors: number;
    totalCommitments: number;
    completedCommitments: number;
    totalResponses: number;
    verifiedResponses: number;
    lastSnapshotUpdate: Date | null;
    cacheHitRate?: number;
  }> {
    try {
      const [
        donorStats,
        commitmentStats,
        responseStats,
        snapshotStats
      ] = await Promise.all([
        db.donor.aggregate({
          _count: { id: true },
          where: { isActive: true }
        }),
        db.donorCommitment.aggregate({
          _count: { id: true },
          where: { status: 'COMPLETE' }
        }),
        db.rapidResponse.aggregate({
          _count: { id: true },
          where: { verificationStatus: { in: ['VERIFIED', 'AUTO_VERIFIED'] } }
        }),
        db.$queryRaw`
          SELECT MAX(calculated_at) as last_update 
          FROM leaderboard_snapshot
        ` as Promise<{ last_update: Date | null }[]>
      ]);

      const totalDonors = donorStats._count.id;
      const totalCommitments = await db.donorCommitment.count();
      const totalResponses = await db.rapidResponse.count();

      return {
        totalDonors,
        activeDonors: donorStats._count.id,
        totalCommitments,
        completedCommitments: commitmentStats._count.id,
        totalResponses,
        verifiedResponses: responseStats._count.id,
        lastSnapshotUpdate: snapshotStats[0]?.last_update
      };
    } catch (error) {
      console.error('Failed to get performance stats:', error);
      throw error;
    }
  }

  /**
   * Optimize donor rankings by calculating all scores
   */
  static async optimizeRankings(
    timeframe: { start: Date; end: Date }
  ): Promise<{
    processed: number;
    errors: string[];
    executionTime: number;
  }> {
    const startTime = Date.now();
    const errors: string[] = [];
    let processed = 0;

    try {
      // Get all active donors
      const donors = await db.donor.findMany({
        where: { isActive: true },
        select: { id: true }
      });

      console.log(`Optimizing rankings for ${donors.length} donors...`);

      // Process in batches to avoid memory issues
      const batchSize = 50;
      for (let i = 0; i < donors.length; i += batchSize) {
        const batch = donors.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(async (donor) => {
            try {
              await this.optimizeDonorRanking(donor.id, timeframe);
              processed++;
            } catch (error) {
              const errorMsg = `Donor ${donor.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
              errors.push(errorMsg);
              console.error(errorMsg);
            }
          })
        );

        // Log progress
        if ((i + batchSize) % 100 === 0) {
          console.log(`Processed ${Math.min(i + batchSize, donors.length)}/${donors.length} donors`);
        }
      }

      const executionTime = Date.now() - startTime;
      
      console.log(`Ranking optimization completed: ${processed} donors in ${executionTime}ms`);
      
      if (errors.length > 0) {
        console.warn(`${errors.length} errors encountered during optimization`);
      }

      return {
        processed,
        errors,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('Ranking optimization failed:', error);
      throw error;
    }
  }

  /**
   * Optimize individual donor ranking
   */
  static async optimizeDonorRanking(
    donorId: string,
    timeframe: { start: Date; end: Date }
  ): Promise<void> {
    try {
      // Get donor's metrics using optimized query
      const donorMetrics = await this.getOptimizedDonorMetrics(donorId, timeframe);
      
      // Calculate composite score
      const overallScore = this.calculateOverallScore(donorMetrics);
      
      // Update donor record
      await db.donor.update({
        where: { id: donorId },
        data: {
          verifiedDeliveryRate: donorMetrics.verifiedDeliveryRate,
          selfReportedDeliveryRate: donorMetrics.selfReportedDeliveryRate,
          leaderboardRank: Math.floor(overallScore * 0.1) // Simplified rank calculation
        }
      });

    } catch (error) {
      console.error(`Failed to optimize ranking for donor ${donorId}:`, error);
      throw error;
    }
  }

  /**
   * Get optimized donor metrics using views and indexes
   */
  static async getOptimizedDonorMetrics(
    donorId: string,
    timeframe: { start: Date; end: Date }
  ): Promise<{
    verifiedDeliveryRate: number;
    selfReportedDeliveryRate: number;
    overallScore: number;
    totalCommitments: number;
    totalValue: number;
    activityScore: number;
  }> {
    try {
      // Use the pre-calculated performance metrics view
      const metrics = await db.$queryRaw`
        SELECT 
          ROUND(
            CASE 
              WHEN total_committed_items > 0 THEN 
                (total_verified_items::decimal / total_committed_items::decimal) * 100
              ELSE 0 
            END, 2
          ) as verified_delivery_rate,
          ROUND(
            CASE 
              WHEN total_committed_items > 0 THEN 
                (total_delivered_items::decimal / total_committed_items::decimal) * 100
              ELSE 0 
            END, 2
          ) as self_reported_delivery_rate,
          total_commitments,
          total_commitment_value,
          total_activities
        FROM donor_performance_metrics
        WHERE donor_id = ${donorId}
      ` as Array<{
        verified_delivery_rate: number;
        self_reported_delivery_rate: number;
        total_commitments: number;
        total_commitment_value: number;
        total_activities: number;
      }>;

      if (metrics.length === 0) {
        throw new Error(`No metrics found for donor ${donorId}`);
      }

      const metric = metrics[0];
      const activityScore = this.calculateActivityScore(metric.total_activities, timeframe);
      const overallScore = this.calculateOverallScore({
        ...metric,
        verifiedDeliveryRate: metric.verified_delivery_rate,
        selfReportedDeliveryRate: metric.self_reported_delivery_rate,
        activityScore
      });

      return {
        verifiedDeliveryRate: metric.verified_delivery_rate,
        selfReportedDeliveryRate: metric.self_reported_delivery_rate,
        overallScore,
        totalCommitments: metric.total_commitments,
        totalValue: metric.total_commitment_value,
        activityScore
      };

    } catch (error) {
      console.error(`Failed to get optimized metrics for donor ${donorId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate activity score based on frequency
   */
  private static calculateActivityScore(totalActivities: number, timeframe: { start: Date; end: Date }): number {
    const daysInPeriod = Math.ceil((timeframe.end.getTime() - timeframe.start.getTime()) / (1000 * 60 * 60 * 24));
    const activitiesPerDay = totalActivities / Math.max(daysInPeriod, 1);
    
    // Normalize to 0-100 scale
    return Math.min(100, activitiesPerDay * 10);
  }

  /**
   * Calculate overall composite score
   */
  private static calculateOverallScore(metrics: {
    verifiedDeliveryRate: number;
    totalValue: number;
    activityScore: number;
    selfReportedDeliveryRate: number;
  }): number {
    const {
      verifiedDeliveryRate,
      totalValue,
      activityScore,
      selfReportedDeliveryRate
    } = metrics;

    // Weighted scoring (same as gamification service)
    const deliveryWeight = 0.4;  // 40% - Primary importance
    const valueWeight = 0.3;     // 30% - Secondary importance  
    const consistencyWeight = 0.2; // 20% - Tertiary importance
    const speedWeight = 0.1;     // 10% - Quaternary importance

    // Normalize metrics to 0-100 scale
    const normalizedDeliveryScore = Math.min(100, verifiedDeliveryRate);
    const normalizedValueScore = Math.min(100, (totalValue / 10000) * 100); // Scale based on $10k units
    const normalizedConsistencyScore = Math.min(100, activityScore);
    const normalizedSpeedScore = Math.max(0, 100 - (24 / 24) * 20); // Simplified speed score

    const overallScore = 
      (normalizedDeliveryScore * deliveryWeight) +
      (normalizedValueScore * valueWeight) +
      (normalizedConsistencyScore * consistencyWeight) +
      (normalizedSpeedScore * speedWeight);

    return Math.round(overallScore * 100) / 100;
  }

  /**
   * Clean up old data for performance
   */
  static async cleanupOldData(): Promise<{
    archivedResponses: number;
    archivedCommitments: number;
    freedSpace: string;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 2); // 2 years ago

    try {
      // Archive old responses (move to archive table in production)
      const archivedResponses = await db.rapidResponse.count({
        where: {
          createdAt: { lt: cutoffDate }
        }
      });

      // Archive old completed commitments
      const archivedCommitments = await db.donorCommitment.count({
        where: {
          commitmentDate: { lt: cutoffDate },
          status: 'COMPLETE'
        }
      });

      // In production, you would move this data to archive tables
      // For now, just report what would be archived
      const estimatedSpace = `${((archivedResponses + archivedCommitments) * 2)}KB`;

      console.log(`Data cleanup report: ${archivedResponses} responses, ${archivedCommitments} commitments (~${estimatedSpace})`);

      return {
        archivedResponses,
        archivedCommitments,
        freedSpace: estimatedSpace
      };

    } catch (error) {
      console.error('Data cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Analyze query performance
   */
  static async analyzeQueryPerformance(): Promise<{
    slowQueries: Array<{
      query: string;
      avgDuration: number;
      calls: number;
    }>;
    indexUsage: Array<{
      table: string;
      index: string;
      usage: number;
    }>;
    recommendations: string[];
  }> {
    try {
      // Get query statistics (PostgreSQL specific)
      const queryStats = await db.$queryRaw`
        SELECT 
          query,
          mean_exec_time as avg_duration,
          calls,
          total_exec_time
        FROM pg_stat_statements 
        WHERE query LIKE '%donor%' OR query LIKE '%commitment%'
        ORDER BY mean_exec_time DESC
        LIMIT 10
      ` as Array<{
        query: string;
        avg_duration: number;
        calls: number;
        total_exec_time: number;
      }>;

      // Get index usage statistics
      const indexStats = await db.$queryRaw`
        SELECT 
          schemaname || '.' || tablename as table,
          indexname as index,
          idx_scan as usage
        FROM pg_stat_user_indexes 
        WHERE schemaname = 'public'
          AND tablename IN ('donors', 'donorcommitments', 'rapidresponses')
        ORDER BY idx_scan DESC
      ` as Array<{
        table: string;
        index: string;
        usage: number;
      }>;

      // Generate recommendations
      const recommendations: string[] = [];
      
      if (queryStats.length > 0 && queryStats[0].avg_duration > 1000) {
        recommendations.push('Consider adding indexes for slow queries');
      }
      
      const unusedIndexes = indexStats.filter(stat => stat.usage === 0);
      if (unusedIndexes.length > 0) {
        recommendations.push(`Consider removing ${unusedIndexes.length} unused indexes`);
      }

      return {
        slowQueries: queryStats.map(stat => ({
          query: stat.query.substring(0, 100) + '...',
          avgDuration: Math.round(stat.avg_duration),
          calls: stat.calls
        })),
        indexUsage: indexStats,
        recommendations
      };

    } catch (error) {
      console.error('Query performance analysis failed:', error);
      // Return empty results if pg_stat_statements extension is not available
      return {
        slowQueries: [],
        indexUsage: [],
        recommendations: ['Query analysis requires pg_stat_statements extension']
      };
    }
  }

  /**
   * Validate database health
   */
  static async validateDatabaseHealth(): Promise<{
    isHealthy: boolean;
    checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warning';
      message: string;
    }>;
  }> {
    const checks = [];

    try {
      // Check database connection
      await db.$queryRaw`SELECT 1`;
      checks.push({
        name: 'Database Connection',
        status: 'pass',
        message: 'Database is accessible'
      });
    } catch (error) {
      checks.push({
        name: 'Database Connection',
        status: 'fail',
        message: 'Cannot connect to database'
      });
    }

    try {
      // Check materialized view
      const snapshotCount = await db.$queryRaw`SELECT COUNT(*) as count FROM leaderboard_snapshot` as Array<{ count: number }>;
      checks.push({
        name: 'Leaderboard Snapshot',
        status: snapshotCount[0].count > 0 ? 'pass' : 'warning',
        message: `${snapshotCount[0].count} entries in snapshot`
      });
    } catch (error) {
      checks.push({
        name: 'Leaderboard Snapshot',
        status: 'fail',
        message: 'Cannot access leaderboard snapshot'
      });
    }

    try {
      // Check view performance
      await db.$queryRaw`SELECT COUNT(*) FROM donor_performance_metrics LIMIT 1`;
      checks.push({
        name: 'Performance Metrics View',
        status: 'pass',
        message: 'Metrics view is accessible'
      });
    } catch (error) {
      checks.push({
        name: 'Performance Metrics View',
        status: 'fail',
        message: 'Cannot access metrics view'
      });
    }

    const failedChecks = checks.filter(check => check.status === 'fail');
    const isHealthy = failedChecks.length === 0;

    return {
      isHealthy,
      checks
    };
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    leaderboardCacheAge: number | null;
    viewRefreshCount: number;
    lastOptimization: Date | null;
  }> {
    try {
      const [lastSnapshot, optimizationLog] = await Promise.all([
        db.$queryRaw`
          SELECT 
            EXTRACT(EPOCH FROM (NOW() - MAX(calculated_at))) as age_seconds
          FROM leaderboard_snapshot
        ` as Array<{ age_seconds: number | null }>,
        db.$queryRaw`
          SELECT COUNT(*) as count
          FROM audit_logs
          WHERE action = 'LEADERBOARD_REFRESH'
          ORDER BY timestamp DESC
          LIMIT 1
        ` as Array<{ count: number }>
      ]);

      return {
        leaderboardCacheAge: lastSnapshot[0]?.age_seconds || null,
        viewRefreshCount: optimizationLog[0]?.count || 0,
        lastOptimization: null // Would need tracking table for this
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        leaderboardCacheAge: null,
        viewRefreshCount: 0,
        lastOptimization: null
      };
    }
  }
}