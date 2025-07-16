import { eq, and, desc, sql, or } from "drizzle-orm";
import { db } from "../db";
import {
  escrowAccounts,
  escrowMilestones,
  escrowTransactions,
  type EscrowAccount,
  type InsertEscrowAccount,
  type EscrowMilestone,
  type InsertEscrowMilestone,
  type EscrowTransaction,
  type InsertEscrowTransaction,
} from "@shared/schema";

// Database storage class for escrow operations
export class EscrowStorage {
  // Create new escrow account
  async createEscrowAccount(data: InsertEscrowAccount): Promise<EscrowAccount> {
    const [escrow] = await db
      .insert(escrowAccounts)
      .values({
        ...data,
        updatedAt: new Date(),
      })
      .returning();
    return escrow;
  }

  // Create escrow milestone
  async createEscrowMilestone(data: InsertEscrowMilestone): Promise<EscrowMilestone> {
    const [milestone] = await db
      .insert(escrowMilestones)
      .values({
        ...data,
        updatedAt: new Date(),
      })
      .returning();
    return milestone;
  }

  // Create escrow transaction
  async createEscrowTransaction(data: InsertEscrowTransaction): Promise<EscrowTransaction> {
    const [transaction] = await db
      .insert(escrowTransactions)
      .values({
        ...data,
        timestamp: new Date(),
        createdAt: new Date(),
      })
      .returning();
    return transaction;
  }

  // Get escrow account by ID
  async getEscrowAccount(id: number): Promise<EscrowAccount | null> {
    const [escrow] = await db
      .select()
      .from(escrowAccounts)
      .where(eq(escrowAccounts.id, id));
    return escrow || null;
  }

  // Get escrow account with relations
  async getEscrowAccountWithRelations(id: number): Promise<any> {
    const escrow = await this.getEscrowAccount(id);
    if (!escrow) return null;

    const milestones = await this.getEscrowMilestones(id);
    const transactions = await this.getEscrowTransactions(id);

    return {
      ...escrow,
      milestones,
      transactions,
    };
  }

  // Get escrow milestones
  async getEscrowMilestones(escrowId: number): Promise<EscrowMilestone[]> {
    return await db
      .select()
      .from(escrowMilestones)
      .where(eq(escrowMilestones.escrowId, escrowId))
      .orderBy(escrowMilestones.dueDate);
  }

  // Get escrow transactions
  async getEscrowTransactions(escrowId: number): Promise<EscrowTransaction[]> {
    return await db
      .select()
      .from(escrowTransactions)
      .where(eq(escrowTransactions.escrowId, escrowId))
      .orderBy(desc(escrowTransactions.timestamp));
  }

  // Update escrow account
  async updateEscrowAccount(id: number, data: Partial<InsertEscrowAccount>): Promise<EscrowAccount> {
    const [escrow] = await db
      .update(escrowAccounts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(escrowAccounts.id, id))
      .returning();
    return escrow;
  }

  // Update escrow milestone
  async updateEscrowMilestone(id: number, data: Partial<InsertEscrowMilestone>): Promise<EscrowMilestone> {
    const [milestone] = await db
      .update(escrowMilestones)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(escrowMilestones.id, id))
      .returning();
    return milestone;
  }

  // Update escrow transaction
  async updateEscrowTransaction(id: number, data: Partial<InsertEscrowTransaction>): Promise<EscrowTransaction> {
    const [transaction] = await db
      .update(escrowTransactions)
      .set(data)
      .where(eq(escrowTransactions.id, id))
      .returning();
    return transaction;
  }

  // Get escrows by user
  async getEscrowsByUser(userId: number): Promise<EscrowAccount[]> {
    return await db
      .select()
      .from(escrowAccounts)
      .where(
        or(
          eq(escrowAccounts.buyerId, userId),
          eq(escrowAccounts.sellerId, userId)
        )
      )
      .orderBy(desc(escrowAccounts.createdAt));
  }

  // Get escrows by MSME
  async getEscrowsByMsme(msmeId: number): Promise<EscrowAccount[]> {
    return await db
      .select()
      .from(escrowAccounts)
      .where(eq(escrowAccounts.msmeId, msmeId))
      .orderBy(desc(escrowAccounts.createdAt));
  }

  // Get escrows by status
  async getEscrowsByStatus(status: string): Promise<EscrowAccount[]> {
    return await db
      .select()
      .from(escrowAccounts)
      .where(eq(escrowAccounts.status, status))
      .orderBy(desc(escrowAccounts.createdAt));
  }

  // Get all escrows (admin)
  async getAllEscrows(): Promise<EscrowAccount[]> {
    return await db
      .select()
      .from(escrowAccounts)
      .orderBy(desc(escrowAccounts.createdAt));
  }

  // Get escrow analytics
  async getEscrowAnalytics(): Promise<any> {
    // Total escrows
    const [totalEscrows] = await db
      .select({ count: sql<number>`count(*)` })
      .from(escrowAccounts);

    // Escrows by status
    const statusCounts = await db
      .select({
        status: escrowAccounts.status,
        count: sql<number>`count(*)`
      })
      .from(escrowAccounts)
      .groupBy(escrowAccounts.status);

    // Total volume
    const [totalVolume] = await db
      .select({ sum: sql<number>`sum(amount)` })
      .from(escrowAccounts);

    // Released volume
    const [releasedVolume] = await db
      .select({ sum: sql<number>`sum(amount)` })
      .from(escrowAccounts)
      .where(eq(escrowAccounts.status, 'released'));

    // Average escrow amount
    const [avgAmount] = await db
      .select({ avg: sql<number>`avg(amount)` })
      .from(escrowAccounts);

    // Recent transactions
    const recentTransactions = await db
      .select()
      .from(escrowTransactions)
      .orderBy(desc(escrowTransactions.timestamp))
      .limit(10);

    const statusBreakdown = statusCounts.reduce((acc, curr) => {
      acc[curr.status] = curr.count;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalEscrows: totalEscrows?.count || 0,
      pendingEscrows: statusBreakdown.pending || 0,
      fundedEscrows: statusBreakdown.funded || 0,
      releasedEscrows: statusBreakdown.released || 0,
      disputedEscrows: statusBreakdown.disputed || 0,
      totalVolume: totalVolume?.sum || 0,
      releasedVolume: releasedVolume?.sum || 0,
      averageEscrowAmount: avgAmount?.avg || 0,
      successRate: totalEscrows?.count ? ((statusBreakdown.released || 0) / totalEscrows.count) * 100 : 0,
      recentTransactions,
    };
  }

  // Get milestone by ID
  async getMilestone(id: number): Promise<EscrowMilestone | null> {
    const [milestone] = await db
      .select()
      .from(escrowMilestones)
      .where(eq(escrowMilestones.id, id));
    return milestone || null;
  }

  // Get transaction by ID
  async getTransaction(id: number): Promise<EscrowTransaction | null> {
    const [transaction] = await db
      .select()
      .from(escrowTransactions)
      .where(eq(escrowTransactions.id, id));
    return transaction || null;
  }

  // Get escrow statistics
  async getEscrowStatistics(): Promise<any> {
    const analytics = await this.getEscrowAnalytics();
    
    // Transaction statistics
    const transactionStats = await db
      .select({
        type: escrowTransactions.type,
        count: sql<number>`count(*)`,
        totalAmount: sql<number>`sum(amount)`
      })
      .from(escrowTransactions)
      .groupBy(escrowTransactions.type);

    // Monthly trends
    const monthlyTrends = await db
      .select({
        month: sql<string>`to_char(created_at, 'YYYY-MM')`,
        count: sql<number>`count(*)`,
        volume: sql<number>`sum(amount)`
      })
      .from(escrowAccounts)
      .groupBy(sql`to_char(created_at, 'YYYY-MM')`)
      .orderBy(sql`to_char(created_at, 'YYYY-MM') DESC`)
      .limit(12);

    return {
      ...analytics,
      transactionStatistics: transactionStats.reduce((acc, curr) => {
        acc[curr.type] = {
          count: curr.count,
          totalAmount: curr.totalAmount
        };
        return acc;
      }, {} as Record<string, any>),
      monthlyTrends,
    };
  }
}

export const escrowStorage = new EscrowStorage();