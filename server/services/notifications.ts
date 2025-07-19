import { NotificationTemplate, NotificationHistoryRecord, NotificationPreference, InsertNotificationHistory } from '@shared/schema';
import { storage } from '../storage';

export interface NotificationData {
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

export class NotificationService {
  private templates = new Map<string, NotificationTemplate>();
  private history = new Map<number, NotificationHistoryRecord>();
  private preferences = new Map<number, NotificationPreference>();
  private nextHistoryId = 1;

  constructor() {
    this.loadDefaultTemplates();
  }

  private loadDefaultTemplates() {
    const defaultTemplates: NotificationTemplate[] = [
      {
        id: 1,
        name: 'escrow_funded',
        subject: 'Escrow Account Funded',
        body: 'Your escrow account has been funded with ₹{{amount}}',
        type: 'email',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        name: 'funds_released',
        subject: 'Funds Released',
        body: '₹{{amount}} has been released to your account',
        type: 'email',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 3,
        name: 'loan_approved',
        subject: 'Loan Application Approved',
        body: 'Your loan application for ₹{{amount}} has been approved',
        type: 'email',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 4,
        name: 'buyer_interest',
        subject: 'New Buyer Interest',
        body: 'A buyer has expressed interest in your MSME listing',
        type: 'email',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.name, template);
    });
  }

  async sendNotification(userId: number, data: NotificationData): Promise<boolean> {
    try {
      const template = this.templates.get(data.type);
      const userPreferences = this.preferences.get(userId);

      // Check if user has disabled this notification type
      if (userPreferences?.disabledTypes?.includes(data.type)) {
        return true; // Skip notification
      }

      // Create notification history record
      const historyRecord: NotificationHistoryRecord = {
        id: this.nextHistoryId++,
        userId,
        type: data.type,
        title: data.title,
        message: this.processTemplate(data.message, data.metadata || {}),
        metadata: data.metadata || {},
        isRead: false,
        createdAt: new Date(),
      };

      this.history.set(historyRecord.id, historyRecord);

      // Send via preferred channels
      if (userPreferences?.emailEnabled !== false) {
        await this.sendEmailNotification(userId, historyRecord);
      }

      if (userPreferences?.smsEnabled === true) {
        await this.sendSMSNotification(userId, historyRecord);
      }

      if (userPreferences?.pushEnabled !== false) {
        await this.sendPushNotification(userId, historyRecord);
      }

      return true;
    } catch (error) {
      console.error('Failed to send notification:', error);
      return false;
    }
  }

  private processTemplate(template: string, variables: Record<string, any>): string {
    let processed = template;
    for (const [key, value] of Object.entries(variables)) {
      processed = processed.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
    return processed;
  }

  private async sendEmailNotification(userId: number, notification: NotificationHistoryRecord): Promise<void> {
    // Mock email sending - in production, integrate with email service
    console.log(`📧 Email sent to user ${userId}:`, notification.title);
  }

  private async sendSMSNotification(userId: number, notification: NotificationHistoryRecord): Promise<void> {
    // Mock SMS sending - in production, integrate with MSG91 or similar
    console.log(`📱 SMS sent to user ${userId}:`, notification.message);
  }

  private async sendPushNotification(userId: number, notification: NotificationHistoryRecord): Promise<void> {
    // Mock push notification - in production, integrate with push service
    console.log(`🔔 Push notification sent to user ${userId}:`, notification.title);
  }

  async getUserNotifications(userId: number, limit: number = 20): Promise<NotificationHistoryRecord[]> {
    return Array.from(this.history.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async markAsRead(notificationId: number): Promise<boolean> {
    const notification = this.history.get(notificationId);
    if (notification) {
      notification.isRead = true;
      return true;
    }
    return false;
  }

  async updateUserPreferences(userId: number, preferences: Partial<NotificationPreference>): Promise<boolean> {
    const existing = this.preferences.get(userId);
    const updated: NotificationPreference = {
      id: existing?.id || userId,
      userId,
      emailEnabled: preferences.emailEnabled ?? existing?.emailEnabled ?? true,
      smsEnabled: preferences.smsEnabled ?? existing?.smsEnabled ?? false,
      pushEnabled: preferences.pushEnabled ?? existing?.pushEnabled ?? true,
      disabledTypes: preferences.disabledTypes ?? existing?.disabledTypes ?? [],
      createdAt: existing?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    this.preferences.set(userId, updated);
    return true;
  }

  async getUnreadCount(userId: number): Promise<number> {
    return Array.from(this.history.values())
      .filter(n => n.userId === userId && !n.isRead)
      .length;
  }

  async bulkSendNotification(userIds: number[], data: NotificationData): Promise<boolean> {
    try {
      const promises = userIds.map(userId => this.sendNotification(userId, data));
      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('Failed to send bulk notifications:', error);
      return false;
    }
  }
}

export const notificationService = new NotificationService();
