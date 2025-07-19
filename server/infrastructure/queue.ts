import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { trackError, PerformanceMonitor } from './monitoring';
import { storage } from '../storage';
import { calculateValuation } from '../services/valuation';
import { findMatches } from '../services/matchmaking';
import { generateDocument } from '../services/document-generation';
import { complianceService } from '../services/compliance';

// Redis connection for BullMQ
const redis = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  // Fallback to memory if Redis is not available
  maxRetriesPerRequest: 0,
  connectTimeout: 5000,
  commandTimeout: 5000,
});

// Handle Redis connection errors gracefully
redis.on('error', (err) => {
  console.warn('Redis connection error (falling back to memory):', err.message);
});

// Job types and their data structures
export interface JobData {
  matchmaking: {
    userId: number;
    msmeId: number;
    filters?: any;
  };
  valuation: {
    msmeId: number;
    userId: number;
    requestId: string;
  };
  document_generation: {
    templateType: string;
    data: Record<string, any>;
    userId: number;
  };
  compliance_check: {
    userId: number;
    transactionId: string;
    amount: number;
  };
  ml_retrain: {
    modelType: 'valuation' | 'matchmaking';
    dataRange: { start: Date; end: Date };
  };
  notification: {
    userId: number;
    type: string;
    message: string;
    metadata?: Record<string, any>;
  };
  audit_cleanup: {
    retentionDays: number;
  };
}

// Queue definitions with retry and backoff strategies
export class QueueManager {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private isRedisAvailable = false;
  private memoryFallback: Map<string, any[]> = new Map();

  constructor() {
    this.checkRedisConnection();
  }

  private async checkRedisConnection() {
    try {
      await redis.ping();
      this.isRedisAvailable = true;
      console.log('✅ Redis connected - Queue system enabled');
    } catch (error) {
      this.isRedisAvailable = false;
      console.warn('⚠️ Redis unavailable - Using memory fallback for queues');
    }
  }

  // Create queue with retry configuration
  createQueue(name: string, options: any = {}) {
    if (!this.isRedisAvailable) {
      this.memoryFallback.set(name, []);
      return null;
    }

    const queue = new Queue(name, {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
        ...options,
      },
    });

    this.queues.set(name, queue);
    return queue;
  }

  // Add job to queue with memory fallback
  async addJob<T extends keyof JobData>(
    queueName: T,
    data: JobData[T],
    options: any = {},
  ) {
    if (!this.isRedisAvailable) {
      // Memory fallback - process immediately
      return this.processJobInMemory(queueName, data);
    }

    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return queue.add(queueName, data, options);
  }

  // Process jobs immediately when Redis is unavailable
  private async processJobInMemory<T extends keyof JobData>(
    queueName: T,
    data: JobData[T],
  ) {
    try {
      const result = await this.processJob(queueName, data);
      console.log(`✅ Memory job completed: ${queueName}`);
      return result;
    } catch (error) {
      console.error(`❌ Memory job failed: ${queueName}`, error);
      trackError(error as Error, { queueName, data });
      throw error;
    }
  }

  // Job processing logic
  private async processJob<T extends keyof JobData>(
    jobType: T,
    data: JobData[T],
  ): Promise<any> {
    const timerName = `job_${jobType}_${Date.now()}`;

    return PerformanceMonitor.measureAsync(timerName, async () => {
      switch (jobType) {
      case 'matchmaking':
        const matchData = data as JobData['matchmaking'];
        const msme = await storage.getMsmeListing(matchData.msmeId);
        if (!msme) {throw new Error('MSME not found');}
        return await findMatches(msme, matchData.filters);

      case 'valuation':
        const valData = data as JobData['valuation'];
        const valuationMsme = await storage.getMsmeListing(valData.msmeId);
        if (!valuationMsme) {throw new Error('MSME not found');}
        return await calculateValuation(valuationMsme);

      case 'document_generation':
        const docData = data as JobData['document_generation'];
        return await generateDocument(docData.templateType, docData.data);

      case 'compliance_check':
        const complianceData = data as JobData['compliance_check'];
        const kycCheck = await complianceService.performKYCCheck(
          complianceData.userId,
          complianceData.amount,
        );
        const amlFlags = await complianceService.monitorTransaction(
          complianceData.userId,
          complianceData.amount,
        );
        return { kycCheck, amlFlags };

      case 'ml_retrain':
        const mlData = data as JobData['ml_retrain'];
        // Simulate ML retraining (would call actual ML pipeline)
        console.log(`🤖 Retraining ${mlData.modelType} model...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        return { modelType: mlData.modelType, status: 'completed' };

      case 'notification':
        const notifData = data as JobData['notification'];
        console.log(`📱 Sending notification to user ${notifData.userId}: ${notifData.message}`);
        return { sent: true, timestamp: new Date() };

      case 'audit_cleanup':
        const auditData = data as JobData['audit_cleanup'];
        console.log(`🧹 Cleaning up audit logs older than ${auditData.retentionDays} days`);
        return { cleaned: true, retentionDays: auditData.retentionDays };

      default:
        throw new Error(`Unknown job type: ${jobType}`);
      }
    });
  }

  // Create worker for processing jobs
  createWorker(queueName: string, processor?: (job: Job) => Promise<any>) {
    if (!this.isRedisAvailable) {
      console.log(`⚠️ Worker for ${queueName} not created - Redis unavailable`);
      return null;
    }

    const worker = new Worker(
      queueName,
      processor || this.defaultProcessor.bind(this),
      {
        connection: redis,
        concurrency: 5,
        maxStalledCount: 3,
        stalledInterval: 30000,
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );

    // Error handling
    worker.on('error', (error) => {
      console.error(`❌ Worker error in ${queueName}:`, error);
      trackError(error, { queueName });
    });

    worker.on('stalled', (jobId) => {
      console.warn(`⚠️ Job ${jobId} stalled in ${queueName}`);
    });

    worker.on('completed', (job, result) => {
      console.log(`✅ Job ${job.id} completed in ${queueName}`);
    });

    worker.on('failed', (job, error) => {
      console.error(`❌ Job ${job?.id} failed in ${queueName}:`, error);
      trackError(error, { queueName, jobId: job?.id });
    });

    this.workers.set(queueName, worker);
    return worker;
  }

  // Default job processor
  private async defaultProcessor(job: Job) {
    return this.processJob(job.name as keyof JobData, job.data);
  }

  // Initialize all queues and workers
  async initialize() {
    console.log('🚀 Initializing queue system...');

    // Create queues
    const queueConfigs = {
      matchmaking: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        delay: 1000, // Add small delay to batch requests
      },
      valuation: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 1000 },
      },
      document_generation: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
      compliance_check: {
        attempts: 2,
        priority: 10, // High priority for compliance
      },
      ml_retrain: {
        attempts: 1,
        delay: 0,
        priority: 5,
      },
      notification: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
      },
      audit_cleanup: {
        attempts: 2,
        delay: 0,
      },
    };

    // Create queues and workers
    Object.entries(queueConfigs).forEach(([name, config]) => {
      this.createQueue(name, config);
      this.createWorker(name);
    });

    console.log(`✅ Queue system initialized with ${this.queues.size} queues`);
  }

  // Get queue statistics
  async getQueueStats(queueName: string) {
    if (!this.isRedisAvailable) {
      return { waiting: 0, active: 0, completed: 0, failed: 0 };
    }

    const queue = this.queues.get(queueName);
    if (!queue) {return null;}

    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }

  // Clean up queues
  async cleanup() {
    console.log('🧹 Cleaning up queue system...');

    // Close all workers
    const workerClosures = Array.from(this.workers.values()).map(
      worker => worker.close(),
    );
    await Promise.all(workerClosures);

    // Close all queues
    const queueClosures = Array.from(this.queues.values()).map(
      queue => queue.close(),
    );
    await Promise.all(queueClosures);

    await redis.quit();
    console.log('✅ Queue system cleaned up');
  }
}

// Global queue manager instance
export const queueManager = new QueueManager();

// Utility functions for common queue operations
export const queueUtils = {
  // Queue a matchmaking job
  async queueMatchmaking(userId: number, msmeId: number, filters?: any) {
    return queueManager.addJob('matchmaking', { userId, msmeId, filters });
  },

  // Queue a valuation job
  async queueValuation(msmeId: number, userId: number, requestId: string) {
    return queueManager.addJob('valuation', { msmeId, userId, requestId });
  },

  // Queue document generation
  async queueDocumentGeneration(templateType: string, data: Record<string, any>, userId: number) {
    return queueManager.addJob('document_generation', { templateType, data, userId });
  },

  // Queue compliance check
  async queueComplianceCheck(userId: number, transactionId: string, amount: number) {
    return queueManager.addJob('compliance_check', { userId, transactionId, amount });
  },

  // Queue ML retraining
  async queueMLRetrain(modelType: 'valuation' | 'matchmaking', dataRange: { start: Date; end: Date }) {
    return queueManager.addJob('ml_retrain', { modelType, dataRange });
  },

  // Queue notification
  async queueNotification(userId: number, type: string, message: string, metadata?: Record<string, any>) {
    return queueManager.addJob('notification', { userId, type, message, metadata });
  },

  // Queue audit cleanup
  async queueAuditCleanup(retentionDays: number = 90) {
    return queueManager.addJob('audit_cleanup', { retentionDays });
  },
};
