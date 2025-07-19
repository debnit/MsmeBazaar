import cron from 'node-cron';
import { db } from '../server/db';
import { valuationEngine } from '../server/ml/valuation-engine';
import { matchmakingEngine } from '../server/ml/matchmaking-engine';
import { msmeListings } from '@shared/schema';
import { eq } from 'drizzle-orm';

// ML Model Retraining Service
class MLScheduler {
  private readonly RETRAIN_SCHEDULE = '0 2 * * 0'; // Every Sunday at 2 AM
  private readonly REFRESH_SCHEDULE = '0 */6 * * *'; // Every 6 hours
  private readonly CLEANUP_SCHEDULE = '0 1 * * *'; // Every day at 1 AM

  constructor() {
    this.setupScheduledJobs();
  }

  private setupScheduledJobs() {
    // Weekly ML model retraining
    cron.schedule(this.RETRAIN_SCHEDULE, async () => {
      console.log('🔄 Starting weekly ML model retraining...');
      await this.retrainModels();
    });

    // Refresh valuations every 6 hours
    cron.schedule(this.REFRESH_SCHEDULE, async () => {
      console.log('🔄 Refreshing MSME valuations...');
      await this.refreshValuations();
    });

    // Daily cleanup
    cron.schedule(this.CLEANUP_SCHEDULE, async () => {
      console.log('🧹 Running daily cleanup...');
      await this.cleanup();
    });

    console.log('✅ ML Scheduler initialized with cron jobs');
  }

  private async retrainModels() {
    try {
      console.log('📊 Collecting training data...');

      // Collect historical data for retraining
      const historicalListings = await db.select().from(msmeListings);

      // Retrain valuation model
      await this.retrainValuationModel(historicalListings);

      // Retrain matchmaking model
      await this.retrainMatchmakingModel(historicalListings);

      console.log('✅ ML model retraining completed successfully');
    } catch (error) {
      console.error('❌ ML model retraining failed:', error);
    }
  }

  private async retrainValuationModel(historicalData: any[]) {
    try {
      console.log('🏭 Retraining valuation model...');

      // Calculate industry benchmarks from historical data
      const industryMetrics = this.calculateIndustryMetrics(historicalData);

      // Update valuation engine with new metrics
      for (const [industry, metrics] of Object.entries(industryMetrics)) {
        await valuationEngine.updateIndustryMetrics(industry, metrics);
      }

      console.log('✅ Valuation model retrained with', Object.keys(industryMetrics).length, 'industries');
    } catch (error) {
      console.error('❌ Valuation model retraining failed:', error);
    }
  }

  private async retrainMatchmakingModel(historicalData: any[]) {
    try {
      console.log('🎯 Retraining matchmaking model...');

      // Analyze successful matches to improve algorithm
      const successfulMatches = await this.analyzeSuccessfulMatches();

      // Update matchmaking weights based on success patterns
      await this.updateMatchmakingWeights(successfulMatches);

      console.log('✅ Matchmaking model retrained');
    } catch (error) {
      console.error('❌ Matchmaking model retraining failed:', error);
    }
  }

  private async refreshValuations() {
    try {
      console.log('💰 Refreshing MSME valuations...');

      // Get all active listings
      const activeListings = await db.select()
        .from(msmeListings)
        .where(eq(msmeListings.status, 'active'));

      let refreshedCount = 0;

      // Refresh valuation for each listing
      for (const listing of activeListings) {
        try {
          const newValuation = await valuationEngine.calculateValuation(listing);

          // Update listing with new valuation
          await db.update(msmeListings)
            .set({
              estimatedValue: newValuation.estimatedValue,
              updatedAt: new Date(),
            })
            .where(eq(msmeListings.id, listing.id));

          refreshedCount++;
        } catch (error) {
          console.error(`❌ Failed to refresh valuation for listing ${listing.id}:`, error);
        }
      }

      console.log(`✅ Refreshed ${refreshedCount} valuations`);
    } catch (error) {
      console.error('❌ Valuation refresh failed:', error);
    }
  }

  private async cleanup() {
    try {
      console.log('🧹 Running cleanup tasks...');

      // Cleanup old notification history (older than 90 days)
      await db.execute(`
        DELETE FROM notification_history 
        WHERE created_at < NOW() - INTERVAL '90 days'
      `);

      // Cleanup expired OTP records
      await db.execute(`
        DELETE FROM otp_store 
        WHERE expires_at < NOW()
      `);

      // Archive old completed loan applications
      await db.execute(`
        UPDATE loan_applications 
        SET status = 'archived' 
        WHERE status IN ('approved', 'rejected') 
        AND updated_at < NOW() - INTERVAL '180 days'
      `);

      console.log('✅ Cleanup completed');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }

  private calculateIndustryMetrics(historicalData: any[]) {
    const industryMetrics: Record<string, any> = {};

    // Group by industry
    const industryGroups = historicalData.reduce((acc, listing) => {
      const industry = listing.industry;
      if (!acc[industry]) {acc[industry] = [];}
      acc[industry].push(listing);
      return acc;
    }, {});

    // Calculate metrics for each industry
    for (const [industry, listings] of Object.entries(industryGroups)) {
      const listingArray = listings as any[];

      if (listingArray.length > 0) {
        const avgRevenue = listingArray.reduce((sum, l) => sum + (l.revenue || 0), 0) / listingArray.length;
        const avgValuation = listingArray.reduce((sum, l) => sum + (l.estimatedValue || 0), 0) / listingArray.length;

        industryMetrics[industry] = {
          averageMultiple: avgValuation / (avgRevenue || 1),
          growthRate: this.calculateGrowthRate(listingArray),
          riskProfile: this.calculateRiskProfile(listingArray),
          liquidityFactor: this.calculateLiquidityFactor(listingArray),
          cyclicality: this.calculateCyclicality(listingArray),
        };
      }
    }

    return industryMetrics;
  }

  private calculateGrowthRate(listings: any[]): number {
    // Calculate average growth rate based on historical data
    const growthRates = listings
      .filter(l => l.growthRate)
      .map(l => l.growthRate);

    return growthRates.length > 0
      ? growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length
      : 0.05; // Default 5%
  }

  private calculateRiskProfile(listings: any[]): 'low' | 'medium' | 'high' {
    const avgDebtToEquity = listings
      .filter(l => l.debtToEquity)
      .reduce((sum, l) => sum + l.debtToEquity, 0) / listings.length;

    if (avgDebtToEquity < 0.3) {return 'low';}
    if (avgDebtToEquity < 0.7) {return 'medium';}
    return 'high';
  }

  private calculateLiquidityFactor(listings: any[]): number {
    // Calculate liquidity based on time to sell
    const avgTimeToSell = listings
      .filter(l => l.timeToSell)
      .reduce((sum, l) => sum + l.timeToSell, 0) / listings.length;

    return Math.max(0.1, Math.min(1.0, 1 - (avgTimeToSell / 365))); // Normalize to 0.1-1.0
  }

  private calculateCyclicality(listings: any[]): number {
    // Calculate cyclicality based on revenue volatility
    const revenueVariance = this.calculateVariance(
      listings.map(l => l.revenue || 0),
    );

    return Math.min(1.0, revenueVariance / 1000000); // Normalize
  }

  private calculateVariance(values: number[]): number {
    if (values.length < 2) {return 0;}

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;

    return variance;
  }

  private async analyzeSuccessfulMatches() {
    // Analyze successful buyer-seller matches
    const successfulMatches = await db.execute(`
      SELECT 
        bi.buyer_id,
        bi.msme_id,
        ml.industry,
        ml.location,
        ml.revenue,
        ml.estimated_value,
        u.location as buyer_location
      FROM buyer_interests bi
      JOIN msme_listings ml ON bi.msme_id = ml.id
      JOIN users u ON bi.buyer_id = u.id
      WHERE bi.status = 'deal_closed'
      AND bi.updated_at > NOW() - INTERVAL '30 days'
    `);

    return successfulMatches;
  }

  private async updateMatchmakingWeights(successfulMatches: any[]) {
    // Analyze patterns in successful matches to update algorithm weights
    console.log('📈 Analyzing', successfulMatches.length, 'successful matches');

    // This would update the matchmaking algorithm weights
    // based on what factors led to successful deals
  }
}

// Initialize the scheduler
const scheduler = new MLScheduler();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 ML Scheduler shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 ML Scheduler shutting down...');
  process.exit(0);
});

export { scheduler };
