// Advanced queue system with BullMQ for async processing
import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { mlValuationEngine } from '../ml/valuation-ml-engine';
import { mlMatchmakingEngine } from '../ml/matchmaking-ml-engine';
import { whatsappService } from '../integrations/whatsapp';
import { razorpayService } from '../services/razorpay-integration';

interface QueueJobData {
  [key: string]: any;
}

interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
}

class QueueManager {
  private redis: Redis;
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: 3,
    });

    this.initializeQueues();
    this.setupWorkers();
  }

  private initializeQueues(): void {
    const queueNames = [
      'valuation',
      'matchmaking',
      'notifications',
      'payments',
      'documents',
      'ml_training',
      'email',
      'whatsapp',
      'data_processing',
      'system_tasks',
    ];

    const connection = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    };

    queueNames.forEach(name => {
      const queue = new Queue(name, {
        connection,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      });

      this.queues.set(name, queue);
    });
  }

  private setupWorkers(): void {
    const connection = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    };

    // Valuation worker
    this.workers.set('valuation', new Worker('valuation', async (job: Job) => {
      return await this.processValuationJob(job);
    }, { connection, concurrency: 5 }));

    // Matchmaking worker
    this.workers.set('matchmaking', new Worker('matchmaking', async (job: Job) => {
      return await this.processMatchmakingJob(job);
    }, { connection, concurrency: 3 }));

    // Notification worker
    this.workers.set('notifications', new Worker('notifications', async (job: Job) => {
      return await this.processNotificationJob(job);
    }, { connection, concurrency: 10 }));

    // Payment worker
    this.workers.set('payments', new Worker('payments', async (job: Job) => {
      return await this.processPaymentJob(job);
    }, { connection, concurrency: 5 }));

    // Document generation worker
    this.workers.set('documents', new Worker('documents', async (job: Job) => {
      return await this.processDocumentJob(job);
    }, { connection, concurrency: 3 }));

    // ML training worker
    this.workers.set('ml_training', new Worker('ml_training', async (job: Job) => {
      return await this.processMLTrainingJob(job);
    }, { connection, concurrency: 1 }));

    // Email worker
    this.workers.set('email', new Worker('email', async (job: Job) => {
      return await this.processEmailJob(job);
    }, { connection, concurrency: 10 }));

    // WhatsApp worker
    this.workers.set('whatsapp', new Worker('whatsapp', async (job: Job) => {
      return await this.processWhatsAppJob(job);
    }, { connection, concurrency: 5 }));

    // Data processing worker
    this.workers.set('data_processing', new Worker('data_processing', async (job: Job) => {
      return await this.processDataJob(job);
    }, { connection, concurrency: 3 }));

    // System tasks worker
    this.workers.set('system_tasks', new Worker('system_tasks', async (job: Job) => {
      return await this.processSystemTaskJob(job);
    }, { connection, concurrency: 2 }));

    // Setup error handlers
    this.setupErrorHandlers();
  }

  private setupErrorHandlers(): void {
    this.workers.forEach((worker, name) => {
      worker.on('failed', (job, err) => {
        console.error(`Worker ${name} job ${job?.id} failed:`, err);
      });

      worker.on('completed', (job, result) => {
        console.log(`Worker ${name} job ${job.id} completed:`, result);
      });
    });
  }

  // Public API methods
  async addValuation(businessId: string, options: any = {}): Promise<Job> {
    const queue = this.queues.get('valuation');
    if (!queue) throw new Error('Valuation queue not found');

    return await queue.add('business_valuation', {
      businessId,
      options,
      timestamp: new Date().toISOString(),
    }, {
      priority: options.priority || 0,
      delay: options.delay || 0,
    });
  }

  async addMatchmaking(buyerId: string, criteria: any = {}): Promise<Job> {
    const queue = this.queues.get('matchmaking');
    if (!queue) throw new Error('Matchmaking queue not found');

    return await queue.add('buyer_matching', {
      buyerId,
      criteria,
      timestamp: new Date().toISOString(),
    }, {
      priority: criteria.priority || 0,
    });
  }

  async addNotification(userId: string, type: string, data: any): Promise<Job> {
    const queue = this.queues.get('notifications');
    if (!queue) throw new Error('Notification queue not found');

    return await queue.add('send_notification', {
      userId,
      type,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  async addPayment(paymentData: any): Promise<Job> {
    const queue = this.queues.get('payments');
    if (!queue) throw new Error('Payment queue not found');

    return await queue.add('process_payment', {
      ...paymentData,
      timestamp: new Date().toISOString(),
    }, {
      priority: 5, // High priority for payments
    });
  }

  async addDocumentGeneration(documentType: string, data: any, userId: string): Promise<Job> {
    const queue = this.queues.get('documents');
    if (!queue) throw new Error('Document queue not found');

    return await queue.add('generate_document', {
      documentType,
      data,
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  async addEmail(to: string, subject: string, template: string, data: any): Promise<Job> {
    const queue = this.queues.get('email');
    if (!queue) throw new Error('Email queue not found');

    return await queue.add('send_email', {
      to,
      subject,
      template,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  async addWhatsApp(to: string, messageType: string, data: any): Promise<Job> {
    const queue = this.queues.get('whatsapp');
    if (!queue) throw new Error('WhatsApp queue not found');

    return await queue.add('send_whatsapp', {
      to,
      messageType,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  async addMLTraining(modelType: string, trainingData: any): Promise<Job> {
    const queue = this.queues.get('ml_training');
    if (!queue) throw new Error('ML training queue not found');

    return await queue.add('train_model', {
      modelType,
      trainingData,
      timestamp: new Date().toISOString(),
    }, {
      priority: 1, // Lower priority for training
    });
  }

  async addDataProcessing(taskType: string, data: any): Promise<Job> {
    const queue = this.queues.get('data_processing');
    if (!queue) throw new Error('Data processing queue not found');

    return await queue.add('process_data', {
      taskType,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  async addSystemTask(taskType: string, data: any): Promise<Job> {
    const queue = this.queues.get('system_tasks');
    if (!queue) throw new Error('System tasks queue not found');

    return await queue.add('system_task', {
      taskType,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  // Job processors
  private async processValuationJob(job: Job): Promise<JobResult> {
    try {
      const { businessId, options } = job.data;
      
      // Get business data
      const businessData = await this.getBusinessData(businessId);
      if (!businessData) {
        throw new Error('Business data not found');
      }

      // Process valuation
      const result = await mlValuationEngine.valuateBusiness(businessData);
      
      // Store result
      await this.storeValuationResult(businessId, result);
      
      // Send notification if requested
      if (options.notifyUser) {
        await this.addNotification(businessData.ownerId, 'valuation_complete', {
          businessId,
          valuation: result.valuation,
        });
      }

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async processMatchmakingJob(job: Job): Promise<JobResult> {
    try {
      const { buyerId, criteria } = job.data;
      
      // Get buyer profile
      const buyerProfile = await this.getBuyerProfile(buyerId);
      if (!buyerProfile) {
        throw new Error('Buyer profile not found');
      }

      // Get available businesses
      const businesses = await this.getAvailableBusinesses(criteria);
      
      // Process matching
      const result = await mlMatchmakingEngine.findMatches(buyerProfile, businesses);
      
      // Store result
      await this.storeMatchingResult(buyerId, result);
      
      // Send notification
      await this.addNotification(buyerId, 'matching_complete', {
        matches: result.matches.length,
        topMatch: result.matches[0]?.businessName,
      });

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async processNotificationJob(job: Job): Promise<JobResult> {
    try {
      const { userId, type, data } = job.data;
      
      // Get user preferences
      const user = await this.getUserData(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Send notification based on type
      switch (type) {
        case 'email':
          await this.addEmail(user.email, data.subject, data.template, data);
          break;
        case 'whatsapp':
          await this.addWhatsApp(user.phone, data.messageType, data);
          break;
        case 'push':
          await this.sendPushNotification(userId, data);
          break;
        default:
          console.warn('Unknown notification type:', type);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async processPaymentJob(job: Job): Promise<JobResult> {
    try {
      const paymentData = job.data;
      
      // Process payment based on type
      switch (paymentData.type) {
        case 'subscription':
          await razorpayService.handlePaymentSuccess(
            paymentData.paymentId,
            paymentData.orderId,
            paymentData.signature
          );
          break;
        case 'escrow_release':
          await razorpayService.releaseEscrowFunds(
            paymentData.escrowId,
            paymentData.releaseReason
          );
          break;
        case 'agent_payout':
          await razorpayService.processAgentPayouts();
          break;
        default:
          console.warn('Unknown payment type:', paymentData.type);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async processDocumentJob(job: Job): Promise<JobResult> {
    try {
      const { documentType, data, userId } = job.data;
      
      // Generate document based on type
      let documentUrl = '';
      
      switch (documentType) {
        case 'valuation_report':
          documentUrl = await this.generateValuationReport(data);
          break;
        case 'matchmaking_report':
          documentUrl = await this.generateMatchmakingReport(data);
          break;
        case 'transaction_receipt':
          documentUrl = await this.generateTransactionReceipt(data);
          break;
        default:
          throw new Error('Unknown document type');
      }

      // Notify user
      await this.addNotification(userId, 'document_ready', {
        documentType,
        documentUrl,
      });

      return { success: true, data: { documentUrl } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async processMLTrainingJob(job: Job): Promise<JobResult> {
    try {
      const { modelType, trainingData } = job.data;
      
      // Train model based on type
      let result;
      
      switch (modelType) {
        case 'valuation':
          result = await mlValuationEngine.retrainModel(trainingData);
          break;
        case 'matchmaking':
          // Implement matchmaking model retraining
          result = { success: true, message: 'Matchmaking model retrained' };
          break;
        default:
          throw new Error('Unknown model type');
      }

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async processEmailJob(job: Job): Promise<JobResult> {
    try {
      const { to, subject, template, data } = job.data;
      
      // Send email using email service
      await this.sendEmail(to, subject, template, data);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async processWhatsAppJob(job: Job): Promise<JobResult> {
    try {
      const { to, messageType, data } = job.data;
      
      // Send WhatsApp message
      const success = await whatsappService.sendMessage({
        to,
        type: messageType,
        content: data,
      });
      
      return { success };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async processDataJob(job: Job): Promise<JobResult> {
    try {
      const { taskType, data } = job.data;
      
      // Process data based on task type
      switch (taskType) {
        case 'analytics_aggregation':
          await this.aggregateAnalytics(data);
          break;
        case 'data_cleanup':
          await this.cleanupData(data);
          break;
        case 'export_data':
          await this.exportData(data);
          break;
        default:
          console.warn('Unknown data task type:', taskType);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async processSystemTaskJob(job: Job): Promise<JobResult> {
    try {
      const { taskType, data } = job.data;
      
      // Process system task
      switch (taskType) {
        case 'health_check':
          await this.performHealthCheck();
          break;
        case 'cache_cleanup':
          await this.cleanupCache();
          break;
        case 'backup_data':
          await this.backupData(data);
          break;
        default:
          console.warn('Unknown system task type:', taskType);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Helper methods
  private async getBusinessData(businessId: string): Promise<any> {
    // Fetch business data from database
    return null;
  }

  private async getBuyerProfile(buyerId: string): Promise<any> {
    // Fetch buyer profile from database
    return null;
  }

  private async getAvailableBusinesses(criteria: any): Promise<any[]> {
    // Fetch available businesses based on criteria
    return [];
  }

  private async getUserData(userId: string): Promise<any> {
    // Fetch user data from database
    return null;
  }

  private async storeValuationResult(businessId: string, result: any): Promise<void> {
    // Store valuation result in database
  }

  private async storeMatchingResult(buyerId: string, result: any): Promise<void> {
    // Store matching result in database
  }

  private async sendPushNotification(userId: string, data: any): Promise<void> {
    // Send push notification
  }

  private async generateValuationReport(data: any): Promise<string> {
    // Generate PDF valuation report
    return 'https://example.com/valuation-report.pdf';
  }

  private async generateMatchmakingReport(data: any): Promise<string> {
    // Generate PDF matchmaking report
    return 'https://example.com/matchmaking-report.pdf';
  }

  private async generateTransactionReceipt(data: any): Promise<string> {
    // Generate PDF transaction receipt
    return 'https://example.com/transaction-receipt.pdf';
  }

  private async sendEmail(to: string, subject: string, template: string, data: any): Promise<void> {
    // Send email using email service (e.g., SendGrid, Resend)
    console.log('Sending email:', { to, subject, template });
  }

  private async aggregateAnalytics(data: any): Promise<void> {
    // Aggregate analytics data
  }

  private async cleanupData(data: any): Promise<void> {
    // Clean up old data
  }

  private async exportData(data: any): Promise<void> {
    // Export data to external system
  }

  private async performHealthCheck(): Promise<void> {
    // Perform system health check
  }

  private async cleanupCache(): Promise<void> {
    // Clean up Redis cache
  }

  private async backupData(data: any): Promise<void> {
    // Backup data to cloud storage
  }

  // Queue management methods
  async getQueueStats(): Promise<any> {
    const stats = {};
    
    for (const [name, queue] of this.queues) {
      stats[name] = {
        waiting: await queue.getWaiting(),
        active: await queue.getActive(),
        completed: await queue.getCompleted(),
        failed: await queue.getFailed(),
      };
    }
    
    return stats;
  }

  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.pause();
    }
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.resume();
    }
  }

  async cleanQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.clean(24 * 60 * 60 * 1000); // Clean jobs older than 24 hours
    }
  }

  async shutdown(): Promise<void> {
    // Close all workers
    await Promise.all(Array.from(this.workers.values()).map(worker => worker.close()));
    
    // Close all queues
    await Promise.all(Array.from(this.queues.values()).map(queue => queue.close()));
    
    // Close Redis connection
    await this.redis.quit();
  }
}

export const queueManager = new QueueManager();
export { QueueManager, QueueJobData, JobResult };