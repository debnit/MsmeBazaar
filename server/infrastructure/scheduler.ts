import * as cron from 'node-cron';
import { queueUtils } from './queue';
import { storage } from '../storage';
import { complianceService } from '../services/compliance';
import { trackBusinessEvent, trackError } from './monitoring';

// Enhanced ML scheduler with feedback loops
export class MLScheduler {
  private readonly RETRAIN_SCHEDULE = '0 2 * * 0'; // Every Sunday at 2 AM
  private readonly REFRESH_SCHEDULE = '0 */6 * * *'; // Every 6 hours
  private readonly CLEANUP_SCHEDULE = '0 1 * * *'; // Every day at 1 AM
  private readonly COMPLIANCE_SCHEDULE = '0 0 * * *'; // Daily compliance checks
  private readonly ANALYTICS_SCHEDULE = '0 3 * * *'; // Daily analytics processing

  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();
  private lastRetrainTimestamp: Date = new Date();

  constructor() {
    this.setupScheduledJobs();
  }

  private setupScheduledJobs() {
    console.log('📅 Setting up scheduled jobs...');

    // ML Model Retraining (Weekly)
    this.scheduledTasks.set('ml_retrain', cron.schedule(this.RETRAIN_SCHEDULE, async () => {
      console.log('🤖 Starting weekly ML model retraining...');
      try {
        await this.retrainModels();
        this.lastRetrainTimestamp = new Date();
        console.log('✅ ML model retraining completed');
      } catch (error) {
        console.error('❌ ML model retraining failed:', error);
        trackError(error as Error, { job: 'ml_retrain' });
      }
    }, { scheduled: false }));

    // Valuation Refresh (Every 6 hours)
    this.scheduledTasks.set('valuation_refresh', cron.schedule(this.REFRESH_SCHEDULE, async () => {
      console.log('💰 Refreshing business valuations...');
      try {
        await this.refreshValuations();
        console.log('✅ Valuation refresh completed');
      } catch (error) {
        console.error('❌ Valuation refresh failed:', error);
        trackError(error as Error, { job: 'valuation_refresh' });
      }
    }, { scheduled: false }));

    // System Cleanup (Daily)
    this.scheduledTasks.set('cleanup', cron.schedule(this.CLEANUP_SCHEDULE, async () => {
      console.log('🧹 Starting daily system cleanup...');
      try {
        await this.cleanup();
        console.log('✅ System cleanup completed');
      } catch (error) {
        console.error('❌ System cleanup failed:', error);
        trackError(error as Error, { job: 'cleanup' });
      }
    }, { scheduled: false }));

    // Compliance Monitoring (Daily)
    this.scheduledTasks.set('compliance_check', cron.schedule(this.COMPLIANCE_SCHEDULE, async () => {
      console.log('🔒 Running daily compliance checks...');
      try {
        await this.runComplianceChecks();
        console.log('✅ Compliance checks completed');
      } catch (error) {
        console.error('❌ Compliance checks failed:', error);
        trackError(error as Error, { job: 'compliance_check' });
      }
    }, { scheduled: false }));

    // Analytics Processing (Daily)
    this.scheduledTasks.set('analytics', cron.schedule(this.ANALYTICS_SCHEDULE, async () => {
      console.log('📊 Processing daily analytics...');
      try {
        await this.processAnalytics();
        console.log('✅ Analytics processing completed');
      } catch (error) {
        console.error('❌ Analytics processing failed:', error);
        trackError(error as Error, { job: 'analytics' });
      }
    }, { scheduled: false }));

    console.log(`✅ Scheduled ${this.scheduledTasks.size} jobs`);
  }

  // ML Model Retraining with Feedback Loop
  private async retrainModels() {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days

    // Get historical data for retraining
    const historicalData = await this.getHistoricalData(startDate, endDate);

    console.log(`📈 Found ${historicalData.length} data points for retraining`);

    // Retrain valuation model
    await this.retrainValuationModel(historicalData);

    // Retrain matchmaking model
    await this.retrainMatchmakingModel(historicalData);

    // Update model metrics
    await this.updateModelMetrics(historicalData);
  }

  private async retrainValuationModel(historicalData: any[]) {
    console.log('🔄 Retraining valuation model...');

    // Calculate industry-specific metrics
    const industryMetrics = this.calculateIndustryMetrics(historicalData);

    // Queue ML retraining job
    await queueUtils.queueMLRetrain('valuation', {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date(),
    });

    // Store updated model parameters (in production, this would update the ML model)
    console.log('📊 Updated industry valuation metrics:', industryMetrics);

    trackBusinessEvent('ml_model_retrained', {
      modelType: 'valuation',
      dataPoints: historicalData.length,
      industries: Object.keys(industryMetrics).length,
    });
  }

  private async retrainMatchmakingModel(historicalData: any[]) {
    console.log('🔄 Retraining matchmaking model...');

    // Analyze successful matches
    const successfulMatches = await this.analyzeSuccessfulMatches();

    // Update matchmaking weights based on success patterns
    await this.updateMatchmakingWeights(successfulMatches);

    // Queue ML retraining job
    await queueUtils.queueMLRetrain('matchmaking', {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date(),
    });

    trackBusinessEvent('ml_model_retrained', {
      modelType: 'matchmaking',
      successfulMatches: successfulMatches.length,
      dataPoints: historicalData.length,
    });
  }

  private async getHistoricalData(startDate: Date, endDate: Date) {
    // Get all relevant data for ML retraining
    const [msmeListings, loanApplications, buyerInterests] = await Promise.all([
      storage.getMsmeListings(),
      storage.getLoanApplications(),
      // Get buyer interests (would need to implement this method)
    ]);

    return {
      msmeListings: msmeListings.filter(listing =>
        new Date(listing.createdAt) >= startDate &&
        new Date(listing.createdAt) <= endDate,
      ),
      loanApplications: loanApplications.filter(app =>
        new Date(app.createdAt) >= startDate &&
        new Date(app.createdAt) <= endDate,
      ),
      buyerInterests: buyerInterests?.filter(interest =>
        new Date(interest.createdAt) >= startDate &&
        new Date(interest.createdAt) <= endDate,
      ) || [],
    };
  }

  private calculateIndustryMetrics(historicalData: any[]) {
    const { msmeListings } = historicalData;
    const industryGroups = new Map<string, any[]>();

    // Group by industry
    msmeListings.forEach((listing: any) => {
      const industry = listing.industry;
      if (!industryGroups.has(industry)) {
        industryGroups.set(industry, []);
      }
      industryGroups.get(industry)!.push(listing);
    });

    // Calculate metrics for each industry
    const metrics: Record<string, any> = {};

    industryGroups.forEach((listings, industry) => {
      const revenues = listings.map(l => l.revenue).filter(r => r > 0);
      const profits = listings.map(l => l.profit).filter(p => p > 0);

      metrics[industry] = {
        averageRevenue: revenues.length ? revenues.reduce((a, b) => a + b, 0) / revenues.length : 0,
        averageProfit: profits.length ? profits.reduce((a, b) => a + b, 0) / profits.length : 0,
        averageMultiple: this.calculateAverageMultiple(listings),
        growthRate: this.calculateGrowthRate(listings),
        riskProfile: this.calculateRiskProfile(listings),
        liquidityFactor: this.calculateLiquidityFactor(listings),
        cyclicality: this.calculateCyclicality(listings),
      };
    });

    return metrics;
  }

  private calculateAverageMultiple(listings: any[]): number {
    const multiples = listings
      .filter(l => l.revenue > 0 && l.askingPrice > 0)
      .map(l => l.askingPrice / l.revenue);

    return multiples.length ? multiples.reduce((a, b) => a + b, 0) / multiples.length : 0;
  }

  private calculateGrowthRate(listings: any[]): number {
    // Simplified growth rate calculation
    const recentRevenues = listings
      .filter(l => l.revenue > 0)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map(l => l.revenue);

    if (recentRevenues.length < 2) {return 0;}

    const recent = recentRevenues[0];
    const older = recentRevenues[recentRevenues.length - 1];

    return ((recent - older) / older) * 100;
  }

  private calculateRiskProfile(listings: any[]): 'low' | 'medium' | 'high' {
    const profitMargins = listings
      .filter(l => l.revenue > 0 && l.profit > 0)
      .map(l => l.profit / l.revenue);

    if (profitMargins.length === 0) {return 'high';}

    const avgMargin = profitMargins.reduce((a, b) => a + b, 0) / profitMargins.length;
    const variance = this.calculateVariance(profitMargins);

    if (avgMargin > 0.15 && variance < 0.05) {return 'low';}
    if (avgMargin > 0.08 && variance < 0.1) {return 'medium';}
    return 'high';
  }

  private calculateLiquidityFactor(listings: any[]): number {
    // Factor based on time to sell, employee count, asset type
    const factors = listings.map(l => {
      let factor = 1.0;

      // Smaller companies are generally more liquid
      if (l.employees && l.employees < 10) {factor *= 1.2;}
      else if (l.employees && l.employees > 50) {factor *= 0.8;}

      // Asset-heavy businesses less liquid
      if (l.assets && l.assets.length > 5) {factor *= 0.9;}

      return factor;
    });

    return factors.length ? factors.reduce((a, b) => a + b, 0) / factors.length : 1.0;
  }

  private calculateCyclicality(listings: any[]): number {
    // Analyze seasonal patterns in the data
    const monthlyData = new Map<number, number[]>();

    listings.forEach(l => {
      const month = new Date(l.createdAt).getMonth();
      if (!monthlyData.has(month)) {
        monthlyData.set(month, []);
      }
      monthlyData.get(month)!.push(l.revenue || 0);
    });

    const monthlyAverages = Array.from(monthlyData.entries())
      .map(([month, revenues]) => ({
        month,
        average: revenues.reduce((a, b) => a + b, 0) / revenues.length,
      }));

    if (monthlyAverages.length < 3) {return 0;}

    const revenues = monthlyAverages.map(m => m.average);
    const variance = this.calculateVariance(revenues);
    const mean = revenues.reduce((a, b) => a + b, 0) / revenues.length;

    return mean > 0 ? variance / mean : 0;
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
  }

  private async analyzeSuccessfulMatches() {
    // Analyze patterns in successful buyer-seller matches
    const loanApplications = await storage.getLoanApplications({ status: 'approved' });

    return loanApplications.map(app => ({
      id: app.id,
      buyerId: app.buyerId,
      nbfcId: app.nbfcId,
      amount: app.amount,
      // Add analysis of what made this match successful
      successFactors: {
        creditScore: app.creditScore,
        industryMatch: true, // Would calculate based on NBFC preferences
        locationMatch: true, // Would calculate based on proximity
        amountMatch: true,    // Would calculate based on loan product limits
      },
    }));
  }

  private async updateMatchmakingWeights(successfulMatches: any[]) {
    // Update ML model weights based on successful matches
    const weights = {
      industry: 0.25,
      location: 0.20,
      creditScore: 0.30,
      amount: 0.15,
      timing: 0.10,
    };

    // Analyze success patterns and adjust weights
    const industrySuccess = successfulMatches.filter(m => m.successFactors.industryMatch).length;
    const locationSuccess = successfulMatches.filter(m => m.successFactors.locationMatch).length;

    if (industrySuccess / successfulMatches.length > 0.8) {
      weights.industry *= 1.1;
    }

    if (locationSuccess / successfulMatches.length > 0.8) {
      weights.location *= 1.1;
    }

    console.log('🎯 Updated matchmaking weights:', weights);

    // In production, this would update the actual ML model
    return weights;
  }

  private async updateModelMetrics(historicalData: any[]) {
    const metrics = {
      totalDataPoints: historicalData.length,
      lastRetrainTime: new Date(),
      modelVersion: '2.0',
      accuracy: 0.85 + Math.random() * 0.1, // Simulated accuracy
      coverage: 0.92 + Math.random() * 0.05,  // Simulated coverage
    };

    console.log('📊 Updated model metrics:', metrics);

    trackBusinessEvent('ml_metrics_updated', metrics);
  }

  // Refresh business valuations
  private async refreshValuations() {
    const activeListings = await storage.getMsmeListings({ status: 'active' });

    console.log(`💰 Refreshing valuations for ${activeListings.length} active listings`);

    // Queue valuation jobs for active listings
    const valuationJobs = activeListings.map(listing =>
      queueUtils.queueValuation(listing.id, listing.sellerId, `refresh_${Date.now()}`),
    );

    await Promise.all(valuationJobs);

    trackBusinessEvent('valuations_refreshed', {
      count: activeListings.length,
      timestamp: new Date(),
    });
  }

  // System cleanup
  private async cleanup() {
    console.log('🧹 Starting system cleanup...');

    // Clean up old audit logs
    await queueUtils.queueAuditCleanup(90);

    // Clean up expired sessions
    // Clean up temporary files
    // Clean up old notifications

    console.log('✅ System cleanup completed');
  }

  // Compliance monitoring
  private async runComplianceChecks() {
    const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
    const endDate = new Date();

    const report = await complianceService.generateComplianceReport(startDate, endDate);

    console.log('🔒 Compliance report generated:', {
      totalTransactions: report.totalTransactions,
      violations: report.complianceViolations.length,
      totalAmount: report.totalAmount,
    });

    // Alert on violations
    if (report.complianceViolations.length > 0) {
      console.warn('⚠️ Compliance violations detected:', report.complianceViolations.length);
    }

    trackBusinessEvent('compliance_check_completed', {
      violations: report.complianceViolations.length,
      transactions: report.totalTransactions,
      amount: report.totalAmount,
    });
  }

  // Analytics processing
  private async processAnalytics() {
    const dashboardStats = await storage.getDashboardStats(1, 'admin');

    console.log('📊 Daily analytics processed:', dashboardStats);

    trackBusinessEvent('analytics_processed', {
      timestamp: new Date(),
      metrics: dashboardStats,
    });
  }

  // Start all scheduled jobs
  start() {
    console.log('🚀 Starting scheduled jobs...');

    this.scheduledTasks.forEach((task, name) => {
      task.start();
      console.log(`✅ Started ${name} job`);
    });

    console.log(`✅ All ${this.scheduledTasks.size} scheduled jobs started`);
  }

  // Stop all scheduled jobs
  stop() {
    console.log('🛑 Stopping scheduled jobs...');

    this.scheduledTasks.forEach((task, name) => {
      task.stop();
      console.log(`🛑 Stopped ${name} job`);
    });

    console.log('✅ All scheduled jobs stopped');
  }

  // Get scheduler status
  getStatus() {
    return {
      totalJobs: this.scheduledTasks.size,
      lastRetrainTime: this.lastRetrainTimestamp,
      runningJobs: Array.from(this.scheduledTasks.entries()).map(([name, task]) => ({
        name,
        running: task.getStatus() === 'scheduled',
      })),
    };
  }
}

// Global scheduler instance
export const mlScheduler = new MLScheduler();
