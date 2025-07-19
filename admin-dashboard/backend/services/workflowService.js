const { Pool } = require('pg');
const Redis = require('redis');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const Bull = require('bull');
const moment = require('moment');

class WorkflowAutomationService {
  constructor() {
    this.db = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production',
    });

    this.redis = Redis.createClient({
      url: process.env.REDIS_URL,
    });

    this.redis.connect();

    // Initialize Bull queues for different workflows
    this.onboardingQueue = new Bull('MSME Onboarding', {
      redis: { port: 6379, host: 'localhost' },
    });

    this.valuationQueue = new Bull('Valuation Processing', {
      redis: { port: 6379, host: 'localhost' },
    });

    this.notificationQueue = new Bull('Notifications', {
      redis: { port: 6379, host: 'localhost' },
    });

    this.emailTransporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    this.twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );

    this.setupQueueProcessors();
  }

  setupQueueProcessors() {
    // MSME Onboarding Workflow Processor
    this.onboardingQueue.process('msme-onboarding', async (job) => {
      return await this.processMSMEOnboarding(job.data);
    });

    // Valuation Processing Workflow Processor
    this.valuationQueue.process('valuation-processing', async (job) => {
      return await this.processValuationWorkflow(job.data);
    });

    // Notification Processor
    this.notificationQueue.process('send-notification', async (job) => {
      return await this.sendNotification(job.data);
    });

    // Error handling
    this.onboardingQueue.on('failed', (job, err) => {
      console.error('Onboarding job failed:', job.id, err);
      this.logWorkflowEvent(job.data.msmeId, 'onboarding_failed', { error: err.message });
    });

    this.valuationQueue.on('failed', (job, err) => {
      console.error('Valuation job failed:', job.id, err);
      this.logWorkflowEvent(job.data.valuationId, 'valuation_failed', { error: err.message });
    });
  }

  // 1. AUTOMATED MSME ONBOARDING WORKFLOW
  async startMSMEOnboarding(msmeData) {
    try {
      // Create workflow record
      const workflowId = await this.createWorkflowRecord('msme_onboarding', msmeData.id);

      // Add to onboarding queue
      const job = await this.onboardingQueue.add('msme-onboarding', {
        workflowId,
        msmeId: msmeData.id,
        msmeData,
        steps: [
          'send_welcome_email',
          'send_otp_verification',
          'verify_documents',
          'verify_business_details',
          'generate_profile',
          'activate_account',
          'send_completion_notification',
        ],
      }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

      await this.logWorkflowEvent(msmeData.id, 'onboarding_started', {
        workflowId,
        jobId: job.id,
      });

      return { workflowId, jobId: job.id, status: 'started' };
    } catch (error) {
      console.error('Failed to start MSME onboarding:', error);
      throw error;
    }
  }

  async processMSMEOnboarding(jobData) {
    const { workflowId, msmeId, msmeData, steps } = jobData;
    const results = [];

    try {
      await this.updateWorkflowStatus(workflowId, 'processing');

      for (const step of steps) {
        await this.logWorkflowEvent(msmeId, 'step_started', { step });

        const stepResult = await this.executeOnboardingStep(step, msmeData);
        results.push({ step, result: stepResult, timestamp: new Date() });

        await this.logWorkflowEvent(msmeId, 'step_completed', { step, result: stepResult });

        // Add delay between steps
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      await this.updateWorkflowStatus(workflowId, 'completed');
      await this.logWorkflowEvent(msmeId, 'onboarding_completed', { results });

      return { status: 'completed', results };
    } catch (error) {
      await this.updateWorkflowStatus(workflowId, 'failed');
      await this.logWorkflowEvent(msmeId, 'onboarding_failed', { error: error.message });
      throw error;
    }
  }

  async executeOnboardingStep(step, msmeData) {
    switch (step) {
    case 'send_welcome_email':
      return await this.sendWelcomeEmail(msmeData);

    case 'send_otp_verification':
      return await this.sendOTPVerification(msmeData);

    case 'verify_documents':
      return await this.verifyDocuments(msmeData);

    case 'verify_business_details':
      return await this.verifyBusinessDetails(msmeData);

    case 'generate_profile':
      return await this.generateMSMEProfile(msmeData);

    case 'activate_account':
      return await this.activateMSMEAccount(msmeData);

    case 'send_completion_notification':
      return await this.sendCompletionNotification(msmeData);

    default:
      throw new Error(`Unknown onboarding step: ${step}`);
    }
  }

  // Individual onboarding steps implementation
  async sendWelcomeEmail(msmeData) {
    const emailContent = {
      to: msmeData.email,
      subject: 'Welcome to MSMEBazaar - Let\'s Get Started!',
      template: 'welcome',
      data: {
        companyName: msmeData.companyName,
        firstName: msmeData.firstName || 'Business Owner',
      },
    };

    await this.notificationQueue.add('send-notification', {
      type: 'email',
      ...emailContent,
    });

    return { sent: true, type: 'welcome_email' };
  }

  async sendOTPVerification(msmeData) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in Redis with expiration
    await this.redis.setEx(`otp:${msmeData.phone}`, 600, otp); // 10 minutes

    // Send SMS
    if (msmeData.phone) {
      await this.notificationQueue.add('send-notification', {
        type: 'sms',
        to: msmeData.phone,
        message: `Your MSMEBazaar verification code is: ${otp}. Valid for 10 minutes.`,
      });
    }

    // Send email backup
    await this.notificationQueue.add('send-notification', {
      type: 'email',
      to: msmeData.email,
      subject: 'MSMEBazaar - Verification Code',
      template: 'otp',
      data: { otp, companyName: msmeData.companyName },
    });

    return { sent: true, type: 'otp_verification', masked_phone: this.maskPhone(msmeData.phone) };
  }

  async verifyDocuments(msmeData) {
    const documentChecks = [];

    // Check required documents
    const requiredDocs = ['gstCertificate', 'panCard', 'incorporationCertificate'];

    for (const docType of requiredDocs) {
      if (msmeData.documents && msmeData.documents[docType]) {
        // Simulate document verification
        const verificationResult = await this.verifyDocument(docType, msmeData.documents[docType]);
        documentChecks.push({
          document: docType,
          status: verificationResult.valid ? 'verified' : 'rejected',
          confidence: verificationResult.confidence,
        });
      } else {
        documentChecks.push({
          document: docType,
          status: 'missing',
        });
      }
    }

    // Update database with verification results
    await this.db.query(
      'UPDATE msmes SET document_verification = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(documentChecks), msmeData.id],
    );

    const allVerified = documentChecks.every(check => check.status === 'verified');

    return {
      verified: allVerified,
      checks: documentChecks,
      next_action: allVerified ? 'proceed' : 'request_documents',
    };
  }

  async verifyBusinessDetails(msmeData) {
    const verificationChecks = [];

    // GST number verification (mock)
    if (msmeData.gstin) {
      const gstValid = await this.verifyGSTIN(msmeData.gstin);
      verificationChecks.push({
        field: 'gstin',
        status: gstValid ? 'verified' : 'invalid',
        value: this.maskSensitiveData(msmeData.gstin),
      });
    }

    // PAN verification (mock)
    if (msmeData.pan) {
      const panValid = await this.verifyPAN(msmeData.pan);
      verificationChecks.push({
        field: 'pan',
        status: panValid ? 'verified' : 'invalid',
        value: this.maskSensitiveData(msmeData.pan),
      });
    }

    // Update verification status in database
    await this.db.query(
      'UPDATE msmes SET business_verification = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(verificationChecks), msmeData.id],
    );

    const allVerified = verificationChecks.every(check => check.status === 'verified');

    return {
      verified: allVerified,
      checks: verificationChecks,
    };
  }

  async generateMSMEProfile(msmeData) {
    // Generate business profile score
    const profileScore = this.calculateProfileScore(msmeData);

    // Generate profile completeness
    const completeness = this.calculateProfileCompleteness(msmeData);

    // Create profile summary
    const profileSummary = {
      score: profileScore,
      completeness: completeness,
      strengths: this.identifyStrengths(msmeData),
      recommendations: this.generateRecommendations(msmeData),
    };

    // Update profile in database
    await this.db.query(
      'UPDATE msmes SET profile_score = $1, profile_data = $2, updated_at = NOW() WHERE id = $3',
      [profileScore, JSON.stringify(profileSummary), msmeData.id],
    );

    return profileSummary;
  }

  async activateMSMEAccount(msmeData) {
    // Update account status to active
    await this.db.query(
      'UPDATE msmes SET status = $1, verified = $2, activated_at = NOW(), updated_at = NOW() WHERE id = $3',
      ['active', true, msmeData.id],
    );

    // Create welcome bonus/rewards
    await this.createWelcomeRewards(msmeData.id);

    return {
      activated: true,
      status: 'active',
      activated_at: new Date(),
      welcome_bonus: 200, // points
    };
  }

  async sendCompletionNotification(msmeData) {
    // Send completion email
    await this.notificationQueue.add('send-notification', {
      type: 'email',
      to: msmeData.email,
      subject: 'Welcome to MSMEBazaar - Your Account is Ready!',
      template: 'onboarding_complete',
      data: {
        companyName: msmeData.companyName,
        loginUrl: `${process.env.CLIENT_URL}/dashboard`,
        supportUrl: `${process.env.CLIENT_URL}/support`,
      },
    });

    // Send SMS notification
    if (msmeData.phone) {
      await this.notificationQueue.add('send-notification', {
        type: 'sms',
        to: msmeData.phone,
        message: `Congratulations! Your MSMEBazaar account for ${msmeData.companyName} is now active. Start exploring opportunities at ${process.env.CLIENT_URL}`,
      });
    }

    return {
      notification_sent: true,
      channels: ['email', 'sms'],
    };
  }

  // 2. AUTOMATED VALUATION WORKFLOW
  async startValuationWorkflow(valuationData) {
    try {
      const workflowId = await this.createWorkflowRecord('valuation_processing', valuationData.id);

      const job = await this.valuationQueue.add('valuation-processing', {
        workflowId,
        valuationId: valuationData.id,
        msmeId: valuationData.msmeId,
        valuationType: valuationData.type,
        urgency: valuationData.urgency,
      }, {
        priority: valuationData.urgency === 'high' ? 1 : valuationData.urgency === 'medium' ? 5 : 10,
        attempts: 3,
      });

      return { workflowId, jobId: job.id, status: 'started' };
    } catch (error) {
      console.error('Failed to start valuation workflow:', error);
      throw error;
    }
  }

  async processValuationWorkflow(jobData) {
    const { workflowId, valuationId, msmeId, valuationType, urgency } = jobData;

    try {
      await this.updateWorkflowStatus(workflowId, 'processing');

      // Step 1: Gather MSME data
      const msmeData = await this.gatherMSMEData(msmeId);

      // Step 2: Validate data completeness
      const dataValidation = await this.validateValuationData(msmeData);

      if (!dataValidation.complete) {
        await this.requestAdditionalData(valuationId, dataValidation.missing);
        return { status: 'pending_data', missing: dataValidation.missing };
      }

      // Step 3: Process valuation based on type
      const valuationResult = await this.calculateValuation(msmeData, valuationType);

      // Step 4: Generate valuation report
      const reportUrl = await this.generateValuationReport(valuationResult, msmeData);

      // Step 5: Update valuation record
      await this.updateValuationRecord(valuationId, valuationResult, reportUrl);

      // Step 6: Send completion notification
      await this.sendValuationCompletionNotification(valuationId, msmeData, reportUrl);

      await this.updateWorkflowStatus(workflowId, 'completed');

      return {
        status: 'completed',
        valuation: valuationResult,
        reportUrl,
      };
    } catch (error) {
      await this.updateWorkflowStatus(workflowId, 'failed');
      throw error;
    }
  }

  // 3. AUTOMATED COMPLIANCE MONITORING
  async startComplianceMonitoring(msmeId) {
    const complianceChecks = [
      'gst_filing_status',
      'document_expiry_check',
      'regulatory_compliance',
      'tax_compliance',
    ];

    const results = [];

    for (const check of complianceChecks) {
      const result = await this.performComplianceCheck(msmeId, check);
      results.push(result);

      if (result.status === 'non_compliant') {
        await this.triggerComplianceAlert(msmeId, check, result);
      }
    }

    return results;
  }

  // 4. AUTOMATED NOTIFICATION WORKFLOWS
  async sendNotification(notificationData) {
    const { type, to, subject, message, template, data } = notificationData;

    try {
      switch (type) {
      case 'email':
        return await this.sendEmail(to, subject, template, data);
      case 'sms':
        return await this.sendSMS(to, message);
      case 'push':
        return await this.sendPushNotification(to, message, data);
      default:
        throw new Error(`Unknown notification type: ${type}`);
      }
    } catch (error) {
      console.error('Notification failed:', error);
      throw error;
    }
  }

  async sendEmail(to, subject, template, data) {
    const htmlContent = await this.renderEmailTemplate(template, data);

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html: htmlContent,
    };

    const result = await this.emailTransporter.sendMail(mailOptions);
    return { sent: true, messageId: result.messageId };
  }

  async sendSMS(to, message) {
    const result = await this.twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });

    return { sent: true, messageId: result.sid };
  }

  // UTILITY METHODS
  async createWorkflowRecord(type, entityId) {
    const result = await this.db.query(
      'INSERT INTO workflows (type, entity_id, status, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id',
      [type, entityId, 'created'],
    );

    return result.rows[0].id;
  }

  async updateWorkflowStatus(workflowId, status) {
    await this.db.query(
      'UPDATE workflows SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, workflowId],
    );
  }

  async logWorkflowEvent(entityId, event, data = {}) {
    await this.db.query(
      'INSERT INTO workflow_logs (entity_id, event, data, created_at) VALUES ($1, $2, $3, NOW())',
      [entityId, event, JSON.stringify(data)],
    );
  }

  calculateProfileScore(msmeData) {
    let score = 0;

    // Basic information (30 points)
    if (msmeData.companyName) {score += 5;}
    if (msmeData.businessType) {score += 5;}
    if (msmeData.industryCategory) {score += 5;}
    if (msmeData.yearOfEstablishment) {score += 5;}
    if (msmeData.employeeCount) {score += 5;}
    if (msmeData.annualTurnover) {score += 5;}

    // Contact information (20 points)
    if (msmeData.email) {score += 5;}
    if (msmeData.phone) {score += 5;}
    if (msmeData.address) {score += 5;}
    if (msmeData.website) {score += 5;}

    // Legal compliance (30 points)
    if (msmeData.gstin) {score += 10;}
    if (msmeData.pan) {score += 10;}
    if (msmeData.incorporationDate) {score += 10;}

    // Additional information (20 points)
    if (msmeData.businessDescription) {score += 5;}
    if (msmeData.keyProducts && msmeData.keyProducts.length > 0) {score += 5;}
    if (msmeData.bankName) {score += 5;}
    if (msmeData.exportTurnover) {score += 5;}

    return Math.min(score, 100);
  }

  calculateProfileCompleteness(msmeData) {
    const requiredFields = [
      'companyName', 'businessType', 'industryCategory', 'email',
      'phone', 'address', 'gstin', 'pan', 'annualTurnover',
    ];

    const completedFields = requiredFields.filter(field => msmeData[field]);
    return Math.round((completedFields.length / requiredFields.length) * 100);
  }

  maskPhone(phone) {
    if (!phone) {return '';}
    return phone.slice(0, 2) + '*'.repeat(6) + phone.slice(-2);
  }

  maskSensitiveData(data) {
    if (!data) {return '';}
    return data.slice(0, 3) + '*'.repeat(data.length - 6) + data.slice(-3);
  }

  async verifyDocument(docType, docData) {
    // Simulate document verification
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      valid: Math.random() > 0.1, // 90% success rate
      confidence: Math.random() * 0.3 + 0.7, // 70-100% confidence
    };
  }

  async verifyGSTIN(gstin) {
    // Mock GSTIN verification
    await new Promise(resolve => setTimeout(resolve, 500));
    return gstin && gstin.length === 15;
  }

  async verifyPAN(pan) {
    // Mock PAN verification
    await new Promise(resolve => setTimeout(resolve, 500));
    return pan && pan.length === 10;
  }

  async renderEmailTemplate(template, data) {
    // Simple template rendering - in production, use a proper template engine
    const templates = {
      welcome: `
        <h1>Welcome to MSMEBazaar, ${data.companyName}!</h1>
        <p>We're excited to have you join our platform.</p>
      `,
      otp: `
        <h1>Verification Code</h1>
        <p>Your verification code is: <strong>${data.otp}</strong></p>
        <p>This code will expire in 10 minutes.</p>
      `,
      onboarding_complete: `
        <h1>Congratulations, ${data.companyName}!</h1>
        <p>Your account is now active and ready to use.</p>
        <a href="${data.loginUrl}">Access Your Dashboard</a>
      `,
    };

    return templates[template] || '<p>Email content</p>';
  }

  async close() {
    await this.db.end();
    await this.redis.quit();
    await this.onboardingQueue.close();
    await this.valuationQueue.close();
    await this.notificationQueue.close();
  }
}

module.exports = WorkflowAutomationService;
