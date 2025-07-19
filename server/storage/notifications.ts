import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db';
import {
  notificationTemplates,
  notificationHistory,
  notificationPreferences,
  type NotificationTemplate,
  type InsertNotificationTemplate,
  type NotificationHistoryRecord,
  type InsertNotificationHistory,
  type NotificationPreference,
  type InsertNotificationPreference,
} from '@shared/schema';

// Database storage class for notifications
export class NotificationStorage {
  // Template operations
  async createTemplate(data: InsertNotificationTemplate): Promise<NotificationTemplate> {
    const [template] = await db
      .insert(notificationTemplates)
      .values({
        ...data,
        updatedAt: new Date(),
      })
      .returning();
    return template;
  }

  async getTemplate(templateId: string): Promise<NotificationTemplate | null> {
    const [template] = await db
      .select()
      .from(notificationTemplates)
      .where(eq(notificationTemplates.templateId, templateId));
    return template || null;
  }

  async getAllTemplates(): Promise<NotificationTemplate[]> {
    return await db
      .select()
      .from(notificationTemplates)
      .where(eq(notificationTemplates.isActive, true))
      .orderBy(notificationTemplates.name);
  }

  async updateTemplate(templateId: string, data: Partial<InsertNotificationTemplate>): Promise<NotificationTemplate> {
    const [template] = await db
      .update(notificationTemplates)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(notificationTemplates.templateId, templateId))
      .returning();
    return template;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await db
      .update(notificationTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(notificationTemplates.templateId, templateId));
  }

  // History operations
  async createHistory(data: InsertNotificationHistory): Promise<NotificationHistoryRecord> {
    const [history] = await db
      .insert(notificationHistory)
      .values({
        ...data,
        createdAt: new Date(),
      })
      .returning();
    return history;
  }

  async getHistory(id: number): Promise<NotificationHistoryRecord | null> {
    const [history] = await db
      .select()
      .from(notificationHistory)
      .where(eq(notificationHistory.id, id));
    return history || null;
  }

  async getHistoryByUser(userId: number, limit: number = 50): Promise<NotificationHistoryRecord[]> {
    return await db
      .select()
      .from(notificationHistory)
      .where(eq(notificationHistory.userId, userId))
      .orderBy(desc(notificationHistory.createdAt))
      .limit(limit);
  }

  async getHistoryByTemplate(templateId: string, limit: number = 100): Promise<NotificationHistoryRecord[]> {
    return await db
      .select()
      .from(notificationHistory)
      .where(eq(notificationHistory.templateId, templateId))
      .orderBy(desc(notificationHistory.createdAt))
      .limit(limit);
  }

  async getHistoryByStatus(status: string, limit: number = 100): Promise<NotificationHistoryRecord[]> {
    return await db
      .select()
      .from(notificationHistory)
      .where(eq(notificationHistory.status, status))
      .orderBy(desc(notificationHistory.createdAt))
      .limit(limit);
  }

  async getRecentHistory(limit: number = 50): Promise<NotificationHistoryRecord[]> {
    return await db
      .select()
      .from(notificationHistory)
      .orderBy(desc(notificationHistory.createdAt))
      .limit(limit);
  }

  async updateHistory(id: number, data: Partial<InsertNotificationHistory>): Promise<NotificationHistoryRecord> {
    const [history] = await db
      .update(notificationHistory)
      .set(data)
      .where(eq(notificationHistory.id, id))
      .returning();
    return history;
  }

  async updateHistoryStatus(messageId: string, status: string, deliveredAt?: Date): Promise<void> {
    const updateData: any = { status };
    if (deliveredAt) {
      updateData.deliveredAt = deliveredAt;
    }

    await db
      .update(notificationHistory)
      .set(updateData)
      .where(eq(notificationHistory.messageId, messageId));
  }

  // Preference operations
  async createPreference(data: InsertNotificationPreference): Promise<NotificationPreference> {
    const [preference] = await db
      .insert(notificationPreferences)
      .values({
        ...data,
        updatedAt: new Date(),
      })
      .returning();
    return preference;
  }

  async getPreference(userId: number, templateId: string): Promise<NotificationPreference | null> {
    const [preference] = await db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.templateId, templateId),
        ),
      );
    return preference || null;
  }

  async getUserPreferences(userId: number): Promise<NotificationPreference[]> {
    return await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .orderBy(notificationPreferences.templateId);
  }

  async updatePreference(userId: number, templateId: string, data: Partial<InsertNotificationPreference>): Promise<NotificationPreference> {
    const [preference] = await db
      .update(notificationPreferences)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.templateId, templateId),
        ),
      )
      .returning();
    return preference;
  }

  async deletePreference(userId: number, templateId: string): Promise<void> {
    await db
      .delete(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.templateId, templateId),
        ),
      );
  }

  // Analytics and statistics
  async getNotificationStats(): Promise<any> {
    // Total notifications
    const [totalNotifications] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notificationHistory);

    // Notifications by status
    const statusCounts = await db
      .select({
        status: notificationHistory.status,
        count: sql<number>`count(*)`,
      })
      .from(notificationHistory)
      .groupBy(notificationHistory.status);

    // Notifications by type
    const typeCounts = await db
      .select({
        type: notificationHistory.type,
        count: sql<number>`count(*)`,
      })
      .from(notificationHistory)
      .groupBy(notificationHistory.type);

    // Success rate
    const [successfulNotifications] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notificationHistory)
      .where(eq(notificationHistory.status, 'delivered'));

    // Recent activity
    const recentActivity = await db
      .select({
        templateId: notificationHistory.templateId,
        count: sql<number>`count(*)`,
        date: sql<string>`date(created_at)`,
      })
      .from(notificationHistory)
      .where(sql`created_at >= NOW() - INTERVAL '7 days'`)
      .groupBy(notificationHistory.templateId, sql`date(created_at)`)
      .orderBy(sql`date(created_at) DESC`);

    const statusBreakdown = statusCounts.reduce((acc, curr) => {
      acc[curr.status] = curr.count;
      return acc;
    }, {} as Record<string, number>);

    const typeBreakdown = typeCounts.reduce((acc, curr) => {
      acc[curr.type] = curr.count;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalNotifications: totalNotifications?.count || 0,
      sent: statusBreakdown.sent || 0,
      delivered: statusBreakdown.delivered || 0,
      failed: statusBreakdown.failed || 0,
      queued: statusBreakdown.queued || 0,
      successRate: totalNotifications?.count ? ((statusBreakdown.delivered || 0) / totalNotifications.count) * 100 : 0,
      byType: typeBreakdown,
      recentActivity,
    };
  }

  async getTemplateStats(templateId: string): Promise<any> {
    const [totalSent] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notificationHistory)
      .where(eq(notificationHistory.templateId, templateId));

    const [delivered] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notificationHistory)
      .where(
        and(
          eq(notificationHistory.templateId, templateId),
          eq(notificationHistory.status, 'delivered'),
        ),
      );

    const [failed] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notificationHistory)
      .where(
        and(
          eq(notificationHistory.templateId, templateId),
          eq(notificationHistory.status, 'failed'),
        ),
      );

    return {
      templateId,
      totalSent: totalSent?.count || 0,
      delivered: delivered?.count || 0,
      failed: failed?.count || 0,
      successRate: totalSent?.count ? ((delivered?.count || 0) / totalSent.count) * 100 : 0,
    };
  }

  async getMonthlyTrends(months: number = 12): Promise<any[]> {
    return await db
      .select({
        month: sql<string>`to_char(created_at, 'YYYY-MM')`,
        total: sql<number>`count(*)`,
        delivered: sql<number>`count(*) filter (where status = 'delivered')`,
        failed: sql<number>`count(*) filter (where status = 'failed')`,
      })
      .from(notificationHistory)
      .where(sql`created_at >= NOW() - INTERVAL '${months} months'`)
      .groupBy(sql`to_char(created_at, 'YYYY-MM')`)
      .orderBy(sql`to_char(created_at, 'YYYY-MM') DESC`);
  }

  // Clean up old history
  async cleanupOldHistory(days: number = 30): Promise<number> {
    const result = await db
      .delete(notificationHistory)
      .where(sql`created_at < NOW() - INTERVAL '${days} days'`)
      .returning({ id: notificationHistory.id });

    return result.length;
  }
}

export const notificationStorage = new NotificationStorage();
