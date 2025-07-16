// Background worker for processing jobs with Redis Queue
import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { initializeServerMemoryManagement } from '../infrastructure/memory-management';

// Redis connection
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
});

// Initialize memory management
await initializeServerMemoryManagement();

// Job processors
const jobProcessors = {
  'valuation-calculation': async (job: Job) => {
    const { businessData } = job.data;
    console.log(`Processing valuation for business: ${businessData.name}`);
    
    // Simulate ML processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const valuation = calculateValuation(businessData);
    
    // Store result in cache
    await redis.setex(`valuation:${businessData.id}`, 3600, JSON.stringify(valuation));
    
    return valuation;
  },
  
  'matchmaking-analysis': async (job: Job) => {
    const { buyerId, preferences } = job.data;
    console.log(`Processing matchmaking for buyer: ${buyerId}`);
    
    // Simulate ML-based matching
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const matches = performMatchmaking(buyerId, preferences);
    
    // Store results
    await redis.setex(`matches:${buyerId}`, 1800, JSON.stringify(matches));
    
    return matches;
  },
  
  'email-notification': async (job: Job) => {
    const { to, subject, template, data } = job.data;
    console.log(`Sending email to: ${to}`);
    
    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return { sent: true, messageId: `msg_${Date.now()}` };
  },
  
  'data-analytics': async (job: Job) => {
    const { type, dateRange } = job.data;
    console.log(`Processing analytics: ${type}`);
    
    // Simulate analytics processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const analytics = generateAnalytics(type, dateRange);
    
    // Cache results
    await redis.setex(`analytics:${type}:${dateRange}`, 7200, JSON.stringify(analytics));
    
    return analytics;
  },
};

// Create workers for different job types
const workers = Object.keys(jobProcessors).map(jobType => {
  const worker = new Worker(jobType, async (job: Job) => {
    const processor = jobProcessors[jobType as keyof typeof jobProcessors];
    return await processor(job);
  }, {
    connection: redis,
    concurrency: 5,
    removeOnComplete: 100,
    removeOnFail: 50,
  });
  
  worker.on('completed', (job: Job) => {
    console.log(`Job ${job.id} completed: ${job.name}`);
  });
  
  worker.on('failed', (job: Job | undefined, err: Error) => {
    console.error(`Job ${job?.id} failed: ${err.message}`);
  });
  
  return worker;
});

// Utility functions
function calculateValuation(businessData: any) {
  const {
    revenue = 0,
    profit = 0,
    assets = 0,
    employees = 0,
    industry = 'general',
    location = 'unknown'
  } = businessData;

  const industryMultipliers = {
    'technology': 8.5,
    'healthcare': 7.2,
    'finance': 6.8,
    'manufacturing': 5.5,
    'retail': 4.2,
    'services': 4.8,
    'general': 4.0
  };

  const locationMultipliers = {
    'mumbai': 1.3,
    'bangalore': 1.25,
    'delhi': 1.2,
    'hyderabad': 1.15,
    'pune': 1.1,
    'chennai': 1.1,
    'kolkata': 1.05,
    'unknown': 1.0
  };

  const industryMultiplier = industryMultipliers[industry.toLowerCase()] || 4.0;
  const locationMultiplier = locationMultipliers[location.toLowerCase()] || 1.0;

  const revenueMultiple = revenue * industryMultiplier;
  const profitMultiple = profit * 15;
  const assetValue = assets * 0.8;
  const employeeValue = employees * 50000;

  const baseValuation = (
    revenueMultiple * 0.4 +
    profitMultiple * 0.3 +
    assetValue * 0.2 +
    employeeValue * 0.1
  );

  const finalValuation = baseValuation * locationMultiplier;

  return {
    valuation: Math.round(finalValuation),
    breakdown: {
      revenueMultiple: Math.round(revenueMultiple),
      profitMultiple: Math.round(profitMultiple),
      assetValue: Math.round(assetValue),
      employeeValue: Math.round(employeeValue)
    },
    multipliers: {
      industry: industryMultiplier,
      location: locationMultiplier
    },
    confidence: calculateConfidence(businessData),
    timestamp: new Date().toISOString()
  };
}

function performMatchmaking(buyerId: string, preferences: any) {
  // Mock matchmaking logic
  const mockListings = [
    { id: '1', name: 'Tech Startup', industry: 'technology', revenue: 1000000, score: 0.95 },
    { id: '2', name: 'Manufacturing Co', industry: 'manufacturing', revenue: 2000000, score: 0.87 },
    { id: '3', name: 'Healthcare Service', industry: 'healthcare', revenue: 1500000, score: 0.92 },
  ];

  return mockListings
    .filter(listing => listing.score > 0.8)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function generateAnalytics(type: string, dateRange: string) {
  // Mock analytics data
  const baseData = {
    totalListings: 1250,
    activeUsers: 890,
    completedTransactions: 45,
    totalRevenue: 12500000,
  };

  return {
    type,
    dateRange,
    data: baseData,
    trends: {
      listingsGrowth: 15.2,
      userGrowth: 22.8,
      revenueGrowth: 18.5,
    },
    timestamp: new Date().toISOString(),
  };
}

function calculateConfidence(data: any): number {
  let score = 0;
  
  if (data.revenue > 0) score += 25;
  if (data.profit > 0) score += 25;
  if (data.assets > 0) score += 20;
  if (data.employees > 0) score += 15;
  if (data.industry !== 'general') score += 10;
  if (data.location !== 'unknown') score += 5;
  
  return Math.min(score, 100);
}

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`Worker received ${signal}, shutting down gracefully...`);
  
  try {
    await Promise.all(workers.map(worker => worker.close()));
    await redis.quit();
    console.log('Background worker closed gracefully');
    process.exit(0);
  } catch (error) {
    console.error('Error during worker shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

console.log(`🔧 Background worker ${process.pid} started`);
console.log(`📊 Processing job types: ${Object.keys(jobProcessors).join(', ')}`);

export { redis, jobProcessors };