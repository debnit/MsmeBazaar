import { z } from 'zod';
import axios from 'axios';

// Notification types and interfaces
export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'sms' | 'email' | 'push' | 'in_app';
  template: string;
  variables: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface NotificationRequest {
  templateId: string;
  recipient: {
    phone?: string;
    email?: string;
    userId?: number;
  };
  variables: Record<string, string>;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  scheduledFor?: Date;
}

export interface NotificationResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  deliveryStatus?: 'queued' | 'sent' | 'delivered' | 'failed';
}

export interface NotificationHistory {
  id: string;
  templateId: string;
  recipient: string;
  message: string;
  type: 'sms' | 'email' | 'push' | 'in_app';
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  sentAt: Date;
  deliveredAt?: Date;
  error?: string;
}

// MSG91 specific interfaces
interface MSG91Response {
  type: string;
  message: string;
  request_id?: string;
}

interface MSG91SMSRequest {
  route: string;
  sender: string;
  message: string;
  country: string;
  sms: Array<{
    to: string;
    message: string;
  }>;
}

// Validation schemas
const notificationRequestSchema = z.object({
  templateId: z.string(),
  recipient: z.object({
    phone: z.string().optional(),
    email: z.string().email().optional(),
    userId: z.number().optional(),
  }),
  variables: z.record(z.string()),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  scheduledFor: z.date().optional(),
});

class NotificationService {
  private templates: Map<string, NotificationTemplate> = new Map();
  private history: NotificationHistory[] = [];
  private msg91AuthKey: string;
  private msg91SenderId: string = 'MSMESG';
  private msg91Route: string = '4'; // Transactional route
  private nextId = 1;

  constructor() {
    this.msg91AuthKey = process.env.MSG91_AUTH_KEY || '';
    this.initializeTemplates();
  }

  private initializeTemplates() {
    const templates: NotificationTemplate[] = [
      // Authentication templates
      {
        id: 'otp_verification',
        name: 'OTP Verification',
        type: 'sms',
        template: 'Your MSMESquare OTP is {{otp}}. Valid for 5 minutes. Do not share with anyone.',
        variables: ['otp'],
        priority: 'high'
      },
      {
        id: 'login_success',
        name: 'Login Success',
        type: 'sms',
        template: 'Welcome back {{userName}}! You have successfully logged into MSMESquare.',
        variables: ['userName'],
        priority: 'medium'
      },

      // Transaction templates
      {
        id: 'buyer_interest',
        name: 'Buyer Interest Notification',
        type: 'sms',
        template: 'New buyer interest for {{businessName}}! {{buyerName}} is interested in your listing. Check MSMESquare app.',
        variables: ['businessName', 'buyerName'],
        priority: 'high'
      },
      {
        id: 'seller_response',
        name: 'Seller Response',
        type: 'sms',
        template: 'Seller {{sellerName}} has responded to your interest in {{businessName}}. Login to view details.',
        variables: ['sellerName', 'businessName'],
        priority: 'high'
      },
      {
        id: 'valuation_complete',
        name: 'Valuation Complete',
        type: 'sms',
        template: 'Valuation for {{businessName}} is complete. Estimated value: ₹{{valuation}}. View detailed report in app.',
        variables: ['businessName', 'valuation'],
        priority: 'medium'
      },

      // Loan application templates
      {
        id: 'loan_application_submitted',
        name: 'Loan Application Submitted',
        type: 'sms',
        template: 'Loan application for ₹{{amount}} submitted successfully. Application ID: {{applicationId}}. We will update you soon.',
        variables: ['amount', 'applicationId'],
        priority: 'medium'
      },
      {
        id: 'loan_approved',
        name: 'Loan Approved',
        type: 'sms',
        template: 'Congratulations! Your loan of ₹{{amount}} is approved. Next steps will be shared shortly.',
        variables: ['amount'],
        priority: 'high'
      },
      {
        id: 'loan_rejected',
        name: 'Loan Rejected',
        type: 'sms',
        template: 'Your loan application has been reviewed. Unfortunately, we cannot approve it at this time. Contact support for details.',
        variables: [],
        priority: 'high'
      },

      // Escrow templates
      {
        id: 'escrow_funded',
        name: 'Escrow Funded',
        type: 'sms',
        template: 'Escrow account funded with ₹{{amount}}. Transaction can now proceed. Escrow ID: {{escrowId}}.',
        variables: ['amount', 'escrowId'],
        priority: 'high'
      },
      {
        id: 'escrow_released',
        name: 'Escrow Released',
        type: 'sms',
        template: 'Escrow funds of ₹{{amount}} released to seller. Transaction completed successfully.',
        variables: ['amount'],
        priority: 'high'
      },
      {
        id: 'milestone_completed',
        name: 'Milestone Completed',
        type: 'sms',
        template: 'Milestone "{{milestone}}" completed. ₹{{amount}} will be released as per agreement.',
        variables: ['milestone', 'amount'],
        priority: 'medium'
      },

      // EaaS (Exit as a Service) templates
      {
        id: 'exit_consultation_booked',
        name: 'Exit Consultation Booked',
        type: 'sms',
        template: 'Exit consultation booked for {{date}}. Our expert will help you with your business exit strategy.',
        variables: ['date'],
        priority: 'high'
      },
      {
        id: 'exit_document_ready',
        name: 'Exit Document Ready',
        type: 'sms',
        template: 'Your exit agreement document is ready for review. Document ID: {{documentId}}. Login to view.',
        variables: ['documentId'],
        priority: 'high'
      },
      {
        id: 'exit_package_activated',
        name: 'Exit Package Activated',
        type: 'sms',
        template: 'Exit as a Service package activated. Our team will guide you through the complete exit process.',
        variables: [],
        priority: 'high'
      },

      // Compliance and legal templates
      {
        id: 'compliance_alert',
        name: 'Compliance Alert',
        type: 'sms',
        template: 'Compliance alert for {{businessName}}: {{alertMessage}}. Immediate action required.',
        variables: ['businessName', 'alertMessage'],
        priority: 'urgent'
      },
      {
        id: 'document_signature_required',
        name: 'Document Signature Required',
        type: 'sms',
        template: 'Document signature required for {{documentType}}. Login to MSMESquare to sign electronically.',
        variables: ['documentType'],
        priority: 'high'
      },

      // Matchmaking templates
      {
        id: 'perfect_match_found',
        name: 'Perfect Match Found',
        type: 'sms',
        template: 'Perfect match found! {{matchType}} in {{location}} matches your criteria. View details in app.',
        variables: ['matchType', 'location'],
        priority: 'high'
      },
      {
        id: 'price_alert',
        name: 'Price Alert',
        type: 'sms',
        template: 'Price alert: {{businessName}} price changed to ₹{{newPrice}}. {{priceChange}} from your target.',
        variables: ['businessName', 'newPrice', 'priceChange'],
        priority: 'medium'
      },

      // System alerts
      {
        id: 'system_maintenance',
        name: 'System Maintenance',
        type: 'sms',
        template: 'MSMESquare will undergo maintenance on {{date}} from {{time}}. Service may be temporarily unavailable.',
        variables: ['date', 'time'],
        priority: 'medium'
      },
      {
        id: 'security_alert',
        name: 'Security Alert',
        type: 'sms',
        template: 'Security alert: Login from new device detected. If this was not you, please contact support immediately.',
        variables: [],
        priority: 'urgent'
      }
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  // MSG91 SMS sending method
  private async sendSMS(phone: string, message: string): Promise<NotificationResponse> {
    if (!this.msg91AuthKey) {
      throw new Error('MSG91 auth key not configured');
    }

    try {
      const smsData: MSG91SMSRequest = {
        route: this.msg91Route,
        sender: this.msg91SenderId,
        message: message,
        country: '91',
        sms: [{
          to: phone,
          message: message
        }]
      };

      const response = await axios.post<MSG91Response>(
        'https://api.msg91.com/api/v2/sendsms',
        smsData,
        {
          headers: {
            'authkey': this.msg91AuthKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: response.data.type === 'success',
        messageId: response.data.request_id,
        error: response.data.type !== 'success' ? response.data.message : undefined,
        deliveryStatus: response.data.type === 'success' ? 'sent' : 'failed'
      };
    } catch (error) {
      console.error('MSG91 SMS Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SMS sending failed',
        deliveryStatus: 'failed'
      };
    }
  }

  // Email sending method (placeholder - integrate with email service)
  private async sendEmail(email: string, subject: string, content: string): Promise<NotificationResponse> {
    // Placeholder for email integration (use services like SendGrid, AWS SES, etc.)
    console.log(`Email to ${email}: ${subject}\n${content}`);
    
    return {
      success: true,
      messageId: `email_${Date.now()}`,
      deliveryStatus: 'sent'
    };
  }

  // Main notification sending method
  async sendNotification(request: NotificationRequest): Promise<NotificationResponse> {
    const validatedRequest = notificationRequestSchema.parse(request);
    
    const template = this.templates.get(validatedRequest.templateId);
    if (!template) {
      throw new Error(`Template not found: ${validatedRequest.templateId}`);
    }

    // Replace template variables
    let message = template.template;
    for (const [key, value] of Object.entries(validatedRequest.variables)) {
      message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    // Check for unresolved variables
    const unresolvedVars = message.match(/{{[^}]+}}/g);
    if (unresolvedVars) {
      throw new Error(`Unresolved template variables: ${unresolvedVars.join(', ')}`);
    }

    let response: NotificationResponse;
    
    // Send based on template type
    if (template.type === 'sms' && validatedRequest.recipient.phone) {
      response = await this.sendSMS(validatedRequest.recipient.phone, message);
    } else if (template.type === 'email' && validatedRequest.recipient.email) {
      response = await this.sendEmail(validatedRequest.recipient.email, template.name, message);
    } else {
      throw new Error('Invalid notification type or missing recipient information');
    }

    // Record in history
    const historyRecord: NotificationHistory = {
      id: `notif_${this.nextId++}`,
      templateId: validatedRequest.templateId,
      recipient: validatedRequest.recipient.phone || validatedRequest.recipient.email || 'unknown',
      message,
      type: template.type,
      status: response.success ? 'sent' : 'failed',
      sentAt: new Date(),
      deliveredAt: response.success ? new Date() : undefined,
      error: response.error
    };
    
    this.history.push(historyRecord);

    return response;
  }

  // Bulk notification sending
  async sendBulkNotifications(requests: NotificationRequest[]): Promise<NotificationResponse[]> {
    const responses: NotificationResponse[] = [];
    
    for (const request of requests) {
      try {
        const response = await this.sendNotification(request);
        responses.push(response);
      } catch (error) {
        responses.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          deliveryStatus: 'failed'
        });
      }
    }
    
    return responses;
  }

  // Scheduled notifications (basic implementation)
  async scheduleNotification(request: NotificationRequest): Promise<string> {
    if (!request.scheduledFor) {
      throw new Error('Scheduled time is required');
    }

    const scheduleId = `schedule_${Date.now()}`;
    const delay = request.scheduledFor.getTime() - Date.now();
    
    if (delay > 0) {
      setTimeout(async () => {
        try {
          await this.sendNotification(request);
        } catch (error) {
          console.error('Scheduled notification failed:', error);
        }
      }, delay);
    }
    
    return scheduleId;
  }

  // Helper methods for common notifications
  async sendOTP(phone: string, otp: string): Promise<NotificationResponse> {
    return this.sendNotification({
      templateId: 'otp_verification',
      recipient: { phone },
      variables: { otp }
    });
  }

  async notifyBuyerInterest(sellerPhone: string, businessName: string, buyerName: string): Promise<NotificationResponse> {
    return this.sendNotification({
      templateId: 'buyer_interest',
      recipient: { phone: sellerPhone },
      variables: { businessName, buyerName }
    });
  }

  async notifyLoanApproval(phone: string, amount: string): Promise<NotificationResponse> {
    return this.sendNotification({
      templateId: 'loan_approved',
      recipient: { phone },
      variables: { amount }
    });
  }

  async notifyEscrowFunded(phone: string, amount: string, escrowId: string): Promise<NotificationResponse> {
    return this.sendNotification({
      templateId: 'escrow_funded',
      recipient: { phone },
      variables: { amount, escrowId }
    });
  }

  async notifyExitConsultation(phone: string, date: string): Promise<NotificationResponse> {
    return this.sendNotification({
      templateId: 'exit_consultation_booked',
      recipient: { phone },
      variables: { date }
    });
  }

  async notifyPerfectMatch(phone: string, matchType: string, location: string): Promise<NotificationResponse> {
    return this.sendNotification({
      templateId: 'perfect_match_found',
      recipient: { phone },
      variables: { matchType, location }
    });
  }

  // Analytics and reporting
  getNotificationHistory(limit: number = 100): NotificationHistory[] {
    return this.history.slice(-limit);
  }

  getNotificationStats(): {
    total: number;
    sent: number;
    failed: number;
    delivered: number;
    byType: Record<string, number>;
  } {
    const stats = {
      total: this.history.length,
      sent: this.history.filter(h => h.status === 'sent').length,
      failed: this.history.filter(h => h.status === 'failed').length,
      delivered: this.history.filter(h => h.status === 'delivered').length,
      byType: {} as Record<string, number>
    };

    this.history.forEach(h => {
      stats.byType[h.type] = (stats.byType[h.type] || 0) + 1;
    });

    return stats;
  }

  getTemplates(): NotificationTemplate[] {
    return Array.from(this.templates.values());
  }

  // MSG91 delivery status check
  async checkDeliveryStatus(messageId: string): Promise<string> {
    if (!this.msg91AuthKey) {
      throw new Error('MSG91 auth key not configured');
    }

    try {
      const response = await axios.get(
        `https://api.msg91.com/api/v2/reports/${messageId}`,
        {
          headers: {
            'authkey': this.msg91AuthKey
          }
        }
      );

      return response.data.status || 'unknown';
    } catch (error) {
      console.error('MSG91 status check error:', error);
      return 'unknown';
    }
  }
}

export const notificationService = new NotificationService();