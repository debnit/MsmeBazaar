import {
  users,
  nbfcDetails,
  msmeListings,
  loanApplications,
  buyerInterests,
  agentAssignments,
  loanProducts,
  complianceRecords,
  agentCommissions,
  valuationPayments,
  matchmakingReportPayments,
  leadCredits,
  leadPurchases,
  apiAccess,
  platformRevenue,
  userSubscriptions,
  type User,
  type InsertUser,
  type NbfcDetails,
  type InsertNbfcDetails,
  type MsmeListing,
  type InsertMsmeListing,
  type LoanApplication,
  type InsertLoanApplication,
  type BuyerInterest,
  type InsertBuyerInterest,
  type AgentAssignment,
  type InsertAgentAssignment,
  type LoanProduct,
  type InsertLoanProduct,
  type ComplianceRecord,
  type InsertComplianceRecord,
  type AgentCommission,
  type InsertAgentCommission,
  type ValuationPayment,
  type InsertValuationPayment,
  type MatchmakingReportPayment,
  type InsertMatchmakingReportPayment,
  type LeadCredit,
  type InsertLeadCredit,
  type LeadPurchase,
  type InsertLeadPurchase,
  type ApiAccess,
  type InsertApiAccess,
  type PlatformRevenue,
  type InsertPlatformRevenue,
  type UserSubscription,
} from "@shared/schema";
import { db } from "../db";
import { eq, and, desc, ilike, sql, or } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  authenticateUser(email: string, password: string): Promise<User | null>;
  
  // NBFC operations
  createNbfcDetails(nbfc: InsertNbfcDetails): Promise<NbfcDetails>;
  getNbfcDetails(userId: number): Promise<NbfcDetails | undefined>;
  updateNbfcDetails(userId: number, nbfc: Partial<InsertNbfcDetails>): Promise<NbfcDetails>;
  
  // MSME operations
  createMsmeListing(listing: InsertMsmeListing): Promise<MsmeListing>;
  getMsmeListing(id: number): Promise<MsmeListing | undefined>;
  getMsmeListings(filters?: { status?: string; industry?: string; city?: string }): Promise<MsmeListing[]>;
  getUserMsmeListings(userId: number): Promise<MsmeListing[]>;
  updateMsmeListing(id: number, listing: Partial<InsertMsmeListing>): Promise<MsmeListing>;
  deleteMsmeListing(id: number): Promise<void>;
  
  // Loan application operations
  createLoanApplication(application: InsertLoanApplication): Promise<LoanApplication>;
  getLoanApplication(id: number): Promise<LoanApplication | undefined>;
  getLoanApplications(filters?: { nbfcId?: number; buyerId?: number; status?: string }): Promise<LoanApplication[]>;
  updateLoanApplication(id: number, application: Partial<InsertLoanApplication>): Promise<LoanApplication>;
  
  // Buyer interest operations
  createBuyerInterest(interest: InsertBuyerInterest): Promise<BuyerInterest>;
  getBuyerInterests(msmeId: number): Promise<BuyerInterest[]>;
  getUserBuyerInterests(userId: number): Promise<BuyerInterest[]>;
  updateBuyerInterest(id: number, interest: Partial<InsertBuyerInterest>): Promise<BuyerInterest>;
  
  // Agent operations
  createAgentAssignment(assignment: InsertAgentAssignment): Promise<AgentAssignment>;
  getAgentAssignments(agentId: number): Promise<AgentAssignment[]>;
  updateAgentAssignment(id: number, assignment: Partial<InsertAgentAssignment>): Promise<AgentAssignment>;
  
  // Loan product operations
  createLoanProduct(product: InsertLoanProduct): Promise<LoanProduct>;
  getLoanProducts(nbfcId?: number): Promise<LoanProduct[]>;
  updateLoanProduct(id: number, product: Partial<InsertLoanProduct>): Promise<LoanProduct>;
  
  // Compliance operations
  createComplianceRecord(record: InsertComplianceRecord): Promise<ComplianceRecord>;
  getComplianceRecords(nbfcId: number): Promise<ComplianceRecord[]>;
  updateComplianceRecord(id: number, record: Partial<InsertComplianceRecord>): Promise<ComplianceRecord>;
  
  // Analytics
  getDashboardStats(userId: number, role: string): Promise<any>;
  
  // Monetization operations
  createAgentCommission(commission: InsertAgentCommission): Promise<AgentCommission>;
  getAgentCommissions(agentId: number): Promise<AgentCommission[]>;
  updateAgentCommission(id: number, commission: Partial<InsertAgentCommission>): Promise<AgentCommission>;
  
  createValuationPayment(payment: InsertValuationPayment): Promise<ValuationPayment>;
  getValuationPaymentByPaymentId(paymentId: string): Promise<ValuationPayment | undefined>;
  updateValuationPayment(paymentId: string, payment: Partial<InsertValuationPayment>): Promise<ValuationPayment>;
  
  createMatchmakingReportPayment(payment: InsertMatchmakingReportPayment): Promise<MatchmakingReportPayment>;
  getMatchmakingReportPaymentByPaymentId(paymentId: string): Promise<MatchmakingReportPayment | undefined>;
  updateMatchmakingReportPayment(paymentId: string, payment: Partial<InsertMatchmakingReportPayment>): Promise<MatchmakingReportPayment>;
  
  createLeadCredit(credit: InsertLeadCredit): Promise<LeadCredit>;
  getLeadCredits(userId: number): Promise<LeadCredit | undefined>;
  updateLeadCredits(userId: number, credit: Partial<InsertLeadCredit>): Promise<LeadCredit>;
  
  createLeadPurchase(purchase: InsertLeadPurchase): Promise<LeadPurchase>;
  getLeadPurchases(sellerId: number): Promise<LeadPurchase[]>;
  
  createApiAccess(access: InsertApiAccess): Promise<ApiAccess>;
  getApiAccess(apiKey: string): Promise<ApiAccess | undefined>;
  updateApiAccess(id: number, access: Partial<InsertApiAccess>): Promise<ApiAccess>;
  
  createPlatformRevenue(revenue: InsertPlatformRevenue): Promise<PlatformRevenue>;
  getPlatformRevenue(filters?: { startDate?: Date; endDate?: Date; status?: string }): Promise<PlatformRevenue[]>;
  
  getUserActiveSubscription(userId: number): Promise<UserSubscription | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Hash password if provided
    if (insertUser.password) {
      insertUser.password = await bcrypt.hash(insertUser.password, 10);
    }

    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        updatedAt: new Date(),
      })
      .returning();
    return user;
  }

  async updateUser(id: number, updateUser: Partial<InsertUser>): Promise<User> {
    // Hash password if being updated
    if (updateUser.password) {
      updateUser.password = await bcrypt.hash(updateUser.password, 10);
    }

    const [user] = await db
      .update(users)
      .set({
        ...updateUser,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async authenticateUser(email: string, password: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    
    if (!user || !user.password) {
      return null;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    return isValidPassword ? user : null;
  }

  // NBFC operations
  async createNbfcDetails(nbfc: InsertNbfcDetails): Promise<NbfcDetails> {
    const [nbfcRecord] = await db
      .insert(nbfcDetails)
      .values({
        ...nbfc,
        updatedAt: new Date(),
      })
      .returning();
    return nbfcRecord;
  }

  async getNbfcDetails(userId: number): Promise<NbfcDetails | undefined> {
    const [nbfc] = await db
      .select()
      .from(nbfcDetails)
      .where(eq(nbfcDetails.userId, userId));
    return nbfc;
  }

  async updateNbfcDetails(userId: number, nbfc: Partial<InsertNbfcDetails>): Promise<NbfcDetails> {
    const [nbfcRecord] = await db
      .update(nbfcDetails)
      .set({
        ...nbfc,
        updatedAt: new Date(),
      })
      .where(eq(nbfcDetails.userId, userId))
      .returning();
    return nbfcRecord;
  }

  // MSME operations
  async createMsmeListing(listing: InsertMsmeListing): Promise<MsmeListing> {
    const [msme] = await db
      .insert(msmeListings)
      .values({
        ...listing,
        updatedAt: new Date(),
      })
      .returning();
    return msme;
  }

  async getMsmeListing(id: number): Promise<MsmeListing | undefined> {
    const [msme] = await db
      .select()
      .from(msmeListings)
      .where(eq(msmeListings.id, id));
    return msme;
  }

  async getMsmeListings(filters?: { status?: string; industry?: string; city?: string }): Promise<MsmeListing[]> {
    let query = db.select().from(msmeListings);
    
    if (filters) {
      const conditions = [];
      
      if (filters.status) {
        conditions.push(eq(msmeListings.status, filters.status));
      }
      
      if (filters.industry) {
        conditions.push(eq(msmeListings.industry, filters.industry));
      }
      
      if (filters.city) {
        conditions.push(eq(msmeListings.city, filters.city));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    return await query.orderBy(desc(msmeListings.createdAt));
  }

  async getUserMsmeListings(userId: number): Promise<MsmeListing[]> {
    return await db
      .select()
      .from(msmeListings)
      .where(eq(msmeListings.sellerId, userId))
      .orderBy(desc(msmeListings.createdAt));
  }

  async updateMsmeListing(id: number, listing: Partial<InsertMsmeListing>): Promise<MsmeListing> {
    const [msme] = await db
      .update(msmeListings)
      .set({
        ...listing,
        updatedAt: new Date(),
      })
      .where(eq(msmeListings.id, id))
      .returning();
    return msme;
  }

  async deleteMsmeListing(id: number): Promise<void> {
    await db.delete(msmeListings).where(eq(msmeListings.id, id));
  }

  // Loan application operations
  async createLoanApplication(application: InsertLoanApplication): Promise<LoanApplication> {
    const [loanApp] = await db
      .insert(loanApplications)
      .values({
        ...application,
        updatedAt: new Date(),
      })
      .returning();
    return loanApp;
  }

  async getLoanApplication(id: number): Promise<LoanApplication | undefined> {
    const [loanApp] = await db
      .select()
      .from(loanApplications)
      .where(eq(loanApplications.id, id));
    return loanApp;
  }

  async getLoanApplications(filters?: { nbfcId?: number; buyerId?: number; status?: string }): Promise<LoanApplication[]> {
    let query = db.select().from(loanApplications);
    
    if (filters) {
      const conditions = [];
      
      if (filters.nbfcId) {
        conditions.push(eq(loanApplications.nbfcId, filters.nbfcId));
      }
      
      if (filters.buyerId) {
        conditions.push(eq(loanApplications.buyerId, filters.buyerId));
      }
      
      if (filters.status) {
        conditions.push(eq(loanApplications.status, filters.status));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    return await query.orderBy(desc(loanApplications.createdAt));
  }

  async updateLoanApplication(id: number, application: Partial<InsertLoanApplication>): Promise<LoanApplication> {
    const [loanApp] = await db
      .update(loanApplications)
      .set({
        ...application,
        updatedAt: new Date(),
      })
      .where(eq(loanApplications.id, id))
      .returning();
    return loanApp;
  }

  // Buyer interest operations
  async createBuyerInterest(interest: InsertBuyerInterest): Promise<BuyerInterest> {
    const [buyerInt] = await db
      .insert(buyerInterests)
      .values({
        ...interest,
        updatedAt: new Date(),
      })
      .returning();
    return buyerInt;
  }

  async getBuyerInterests(msmeId: number): Promise<BuyerInterest[]> {
    return await db
      .select()
      .from(buyerInterests)
      .where(eq(buyerInterests.msmeId, msmeId))
      .orderBy(desc(buyerInterests.createdAt));
  }

  async getUserBuyerInterests(userId: number): Promise<BuyerInterest[]> {
    return await db
      .select()
      .from(buyerInterests)
      .where(eq(buyerInterests.buyerId, userId))
      .orderBy(desc(buyerInterests.createdAt));
  }

  async updateBuyerInterest(id: number, interest: Partial<InsertBuyerInterest>): Promise<BuyerInterest> {
    const [buyerInt] = await db
      .update(buyerInterests)
      .set({
        ...interest,
        updatedAt: new Date(),
      })
      .where(eq(buyerInterests.id, id))
      .returning();
    return buyerInt;
  }

  // Agent operations
  async createAgentAssignment(assignment: InsertAgentAssignment): Promise<AgentAssignment> {
    const [agent] = await db
      .insert(agentAssignments)
      .values({
        ...assignment,
        updatedAt: new Date(),
      })
      .returning();
    return agent;
  }

  async getAgentAssignments(agentId: number): Promise<AgentAssignment[]> {
    return await db
      .select()
      .from(agentAssignments)
      .where(eq(agentAssignments.agentId, agentId))
      .orderBy(desc(agentAssignments.createdAt));
  }

  async updateAgentAssignment(id: number, assignment: Partial<InsertAgentAssignment>): Promise<AgentAssignment> {
    const [agent] = await db
      .update(agentAssignments)
      .set({
        ...assignment,
        updatedAt: new Date(),
      })
      .where(eq(agentAssignments.id, id))
      .returning();
    return agent;
  }

  // Loan product operations
  async createLoanProduct(product: InsertLoanProduct): Promise<LoanProduct> {
    const [loanProd] = await db
      .insert(loanProducts)
      .values({
        ...product,
        updatedAt: new Date(),
      })
      .returning();
    return loanProd;
  }

  async getLoanProducts(nbfcId?: number): Promise<LoanProduct[]> {
    let query = db.select().from(loanProducts);
    
    if (nbfcId) {
      query = query.where(eq(loanProducts.nbfcId, nbfcId));
    }
    
    return await query.orderBy(desc(loanProducts.createdAt));
  }

  async updateLoanProduct(id: number, product: Partial<InsertLoanProduct>): Promise<LoanProduct> {
    const [loanProd] = await db
      .update(loanProducts)
      .set({
        ...product,
        updatedAt: new Date(),
      })
      .where(eq(loanProducts.id, id))
      .returning();
    return loanProd;
  }

  // Compliance operations
  async createComplianceRecord(record: InsertComplianceRecord): Promise<ComplianceRecord> {
    const [compliance] = await db
      .insert(complianceRecords)
      .values({
        ...record,
        updatedAt: new Date(),
      })
      .returning();
    return compliance;
  }

  async getComplianceRecords(nbfcId: number): Promise<ComplianceRecord[]> {
    return await db
      .select()
      .from(complianceRecords)
      .where(eq(complianceRecords.nbfcId, nbfcId))
      .orderBy(desc(complianceRecords.createdAt));
  }

  async updateComplianceRecord(id: number, record: Partial<InsertComplianceRecord>): Promise<ComplianceRecord> {
    const [compliance] = await db
      .update(complianceRecords)
      .set({
        ...record,
        updatedAt: new Date(),
      })
      .where(eq(complianceRecords.id, id))
      .returning();
    return compliance;
  }

  // Analytics and dashboard stats
  async getDashboardStats(userId: number, role: string): Promise<any> {
    try {
      const stats: any = {
        totalUsers: 0,
        totalListings: 0,
        totalLoanApplications: 0,
        totalBuyerInterests: 0,
        recentActivity: [],
      };

      // Get total counts
      const [userCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users);
      stats.totalUsers = userCount?.count || 0;

      const [listingCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(msmeListings);
      stats.totalListings = listingCount?.count || 0;

      const [loanCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(loanApplications);
      stats.totalLoanApplications = loanCount?.count || 0;

      const [interestCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(buyerInterests);
      stats.totalBuyerInterests = interestCount?.count || 0;

      // Role-specific stats
      switch (role) {
        case 'seller':
          const userListings = await db
            .select()
            .from(msmeListings)
            .where(eq(msmeListings.sellerId, userId))
            .orderBy(desc(msmeListings.createdAt))
            .limit(5);
          stats.myListings = userListings.length;
          stats.recentListings = userListings;

          const myInterests = await db
            .select()
            .from(buyerInterests)
            .where(eq(buyerInterests.msmeId, sql`ANY(SELECT id FROM msme_listings WHERE seller_id = ${userId})`))
            .orderBy(desc(buyerInterests.createdAt))
            .limit(5);
          stats.recentInterests = myInterests;
          break;

        case 'buyer':
          const myBuyerInterests = await db
            .select()
            .from(buyerInterests)
            .where(eq(buyerInterests.buyerId, userId))
            .orderBy(desc(buyerInterests.createdAt))
            .limit(5);
          stats.myInterests = myBuyerInterests.length;
          stats.recentInterests = myBuyerInterests;

          const myLoanApps = await db
            .select()
            .from(loanApplications)
            .where(eq(loanApplications.buyerId, userId))
            .orderBy(desc(loanApplications.createdAt))
            .limit(5);
          stats.myLoanApplications = myLoanApps.length;
          stats.recentLoanApplications = myLoanApps;
          break;

        case 'nbfc':
          const nbfcLoans = await db
            .select()
            .from(loanApplications)
            .where(eq(loanApplications.nbfcId, userId))
            .orderBy(desc(loanApplications.createdAt))
            .limit(5);
          stats.assignedLoans = nbfcLoans.length;
          stats.recentLoanApplications = nbfcLoans;

          const nbfcProducts = await db
            .select()
            .from(loanProducts)
            .where(eq(loanProducts.nbfcId, userId))
            .orderBy(desc(loanProducts.createdAt))
            .limit(5);
          stats.myProducts = nbfcProducts.length;
          stats.recentProducts = nbfcProducts;
          break;

        case 'agent':
          const agentAssigns = await db
            .select()
            .from(agentAssignments)
            .where(eq(agentAssignments.agentId, userId))
            .orderBy(desc(agentAssignments.createdAt))
            .limit(5);
          stats.myAssignments = agentAssigns.length;
          stats.recentAssignments = agentAssigns;
          break;

        case 'admin':
          // Get recent activities across all entities
          const recentListings = await db
            .select()
            .from(msmeListings)
            .orderBy(desc(msmeListings.createdAt))
            .limit(10);
          stats.recentListings = recentListings;

          const recentLoans = await db
            .select()
            .from(loanApplications)
            .orderBy(desc(loanApplications.createdAt))
            .limit(10);
          stats.recentLoanApplications = recentLoans;

          const recentUsers = await db
            .select()
            .from(users)
            .orderBy(desc(users.createdAt))
            .limit(10);
          stats.recentUsers = recentUsers;
          break;
      }

      return stats;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        totalUsers: 0,
        totalListings: 0,
        totalLoanApplications: 0,
        totalBuyerInterests: 0,
        recentActivity: [],
      };
    }
  }

  // Search functionality
  async searchMsmeListings(query: string, filters?: any): Promise<MsmeListing[]> {
    let dbQuery = db.select().from(msmeListings);
    
    const conditions = [];
    
    if (query) {
      conditions.push(
        or(
          ilike(msmeListings.companyName, `%${query}%`),
          ilike(msmeListings.industry, `%${query}%`),
          ilike(msmeListings.businessType, `%${query}%`),
          ilike(msmeListings.description, `%${query}%`)
        )
      );
    }
    
    if (filters) {
      if (filters.industry) {
        conditions.push(eq(msmeListings.industry, filters.industry));
      }
      if (filters.city) {
        conditions.push(eq(msmeListings.city, filters.city));
      }
      if (filters.status) {
        conditions.push(eq(msmeListings.status, filters.status));
      }
      if (filters.minPrice) {
        conditions.push(sql`${msmeListings.askingPrice} >= ${filters.minPrice}`);
      }
      if (filters.maxPrice) {
        conditions.push(sql`${msmeListings.askingPrice} <= ${filters.maxPrice}`);
      }
    }
    
    if (conditions.length > 0) {
      dbQuery = dbQuery.where(and(...conditions));
    }
    
    return await dbQuery
      .orderBy(desc(msmeListings.createdAt))
      .limit(50);
  }

  // Get user with relations
  async getUserWithRelations(id: number): Promise<any> {
    const user = await this.getUser(id);
    if (!user) return null;

    const result: any = { ...user };

    // Get related data based on role
    switch (user.role) {
      case 'seller':
        result.listings = await this.getUserMsmeListings(id);
        break;
      case 'buyer':
        result.interests = await this.getUserBuyerInterests(id);
        result.loanApplications = await this.getLoanApplications({ buyerId: id });
        break;
      case 'nbfc':
        result.details = await this.getNbfcDetails(id);
        result.loanApplications = await this.getLoanApplications({ nbfcId: id });
        result.products = await this.getLoanProducts(id);
        break;
      case 'agent':
        result.assignments = await this.getAgentAssignments(id);
        break;
    }

    return result;
  }

  // Bulk operations
  async bulkUpdateMsmeListings(updates: Array<{ id: number; data: Partial<InsertMsmeListing> }>): Promise<void> {
    for (const update of updates) {
      await this.updateMsmeListing(update.id, update.data);
    }
  }

  async bulkUpdateLoanApplications(updates: Array<{ id: number; data: Partial<InsertLoanApplication> }>): Promise<void> {
    for (const update of updates) {
      await this.updateLoanApplication(update.id, update.data);
    }
  }

  // Statistics and analytics
  async getMarketplaceStats(): Promise<any> {
    const [activeListings] = await db
      .select({ count: sql<number>`count(*)` })
      .from(msmeListings)
      .where(eq(msmeListings.status, 'active'));

    const [totalValue] = await db
      .select({ sum: sql<number>`sum(asking_price)` })
      .from(msmeListings)
      .where(eq(msmeListings.status, 'active'));

    const [avgPrice] = await db
      .select({ avg: sql<number>`avg(asking_price)` })
      .from(msmeListings)
      .where(eq(msmeListings.status, 'active'));

    const industriesCounts = await db
      .select({
        industry: msmeListings.industry,
        count: sql<number>`count(*)`
      })
      .from(msmeListings)
      .where(eq(msmeListings.status, 'active'))
      .groupBy(msmeListings.industry)
      .orderBy(sql`count(*) DESC`)
      .limit(10);

    return {
      activeListings: activeListings?.count || 0,
      totalMarketValue: totalValue?.sum || 0,
      averagePrice: avgPrice?.avg || 0,
      topIndustries: industriesCounts,
    };
  }

  // Monetization operations
  async createAgentCommission(commission: InsertAgentCommission): Promise<AgentCommission> {
    const [result] = await db
      .insert(agentCommissions)
      .values(commission)
      .returning();
    return result;
  }

  async getAgentCommissions(agentId: number): Promise<AgentCommission[]> {
    return await db
      .select()
      .from(agentCommissions)
      .where(eq(agentCommissions.agentId, agentId))
      .orderBy(desc(agentCommissions.createdAt));
  }

  async updateAgentCommission(id: number, commission: Partial<InsertAgentCommission>): Promise<AgentCommission> {
    const [result] = await db
      .update(agentCommissions)
      .set(commission)
      .where(eq(agentCommissions.id, id))
      .returning();
    return result;
  }

  async createValuationPayment(payment: InsertValuationPayment): Promise<ValuationPayment> {
    const [result] = await db
      .insert(valuationPayments)
      .values(payment)
      .returning();
    return result;
  }

  async getValuationPaymentByPaymentId(paymentId: string): Promise<ValuationPayment | undefined> {
    const [result] = await db
      .select()
      .from(valuationPayments)
      .where(eq(valuationPayments.paymentId, paymentId));
    return result;
  }

  async updateValuationPayment(paymentId: string, payment: Partial<InsertValuationPayment>): Promise<ValuationPayment> {
    const [result] = await db
      .update(valuationPayments)
      .set(payment)
      .where(eq(valuationPayments.paymentId, paymentId))
      .returning();
    return result;
  }

  async createMatchmakingReportPayment(payment: InsertMatchmakingReportPayment): Promise<MatchmakingReportPayment> {
    const [result] = await db
      .insert(matchmakingReportPayments)
      .values(payment)
      .returning();
    return result;
  }

  async getMatchmakingReportPaymentByPaymentId(paymentId: string): Promise<MatchmakingReportPayment | undefined> {
    const [result] = await db
      .select()
      .from(matchmakingReportPayments)
      .where(eq(matchmakingReportPayments.paymentId, paymentId));
    return result;
  }

  async updateMatchmakingReportPayment(paymentId: string, payment: Partial<InsertMatchmakingReportPayment>): Promise<MatchmakingReportPayment> {
    const [result] = await db
      .update(matchmakingReportPayments)
      .set(payment)
      .where(eq(matchmakingReportPayments.paymentId, paymentId))
      .returning();
    return result;
  }

  async createLeadCredit(credit: InsertLeadCredit): Promise<LeadCredit> {
    const [result] = await db
      .insert(leadCredits)
      .values(credit)
      .returning();
    return result;
  }

  async getLeadCredits(userId: number): Promise<LeadCredit | undefined> {
    const [result] = await db
      .select()
      .from(leadCredits)
      .where(eq(leadCredits.userId, userId));
    return result;
  }

  async updateLeadCredits(userId: number, credit: Partial<InsertLeadCredit>): Promise<LeadCredit> {
    const [result] = await db
      .update(leadCredits)
      .set({ ...credit, updatedAt: new Date() })
      .where(eq(leadCredits.userId, userId))
      .returning();
    return result;
  }

  async createLeadPurchase(purchase: InsertLeadPurchase): Promise<LeadPurchase> {
    const [result] = await db
      .insert(leadPurchases)
      .values(purchase)
      .returning();
    return result;
  }

  async getLeadPurchases(sellerId: number): Promise<LeadPurchase[]> {
    return await db
      .select()
      .from(leadPurchases)
      .where(eq(leadPurchases.sellerId, sellerId))
      .orderBy(desc(leadPurchases.purchasedAt));
  }

  async createApiAccess(access: InsertApiAccess): Promise<ApiAccess> {
    const [result] = await db
      .insert(apiAccess)
      .values(access)
      .returning();
    return result;
  }

  async getApiAccess(apiKey: string): Promise<ApiAccess | undefined> {
    const [result] = await db
      .select()
      .from(apiAccess)
      .where(eq(apiAccess.apiKey, apiKey));
    return result;
  }

  async updateApiAccess(id: number, access: Partial<InsertApiAccess>): Promise<ApiAccess> {
    const [result] = await db
      .update(apiAccess)
      .set({ ...access, updatedAt: new Date() })
      .where(eq(apiAccess.id, id))
      .returning();
    return result;
  }

  async createPlatformRevenue(revenue: InsertPlatformRevenue): Promise<PlatformRevenue> {
    const [result] = await db
      .insert(platformRevenue)
      .values(revenue)
      .returning();
    return result;
  }

  async getPlatformRevenue(filters?: { startDate?: Date; endDate?: Date; status?: string }): Promise<PlatformRevenue[]> {
    let query = db.select().from(platformRevenue);
    
    if (filters?.startDate) {
      query = query.where(sql`${platformRevenue.createdAt} >= ${filters.startDate}`);
    }
    
    if (filters?.endDate) {
      query = query.where(sql`${platformRevenue.createdAt} <= ${filters.endDate}`);
    }
    
    if (filters?.status) {
      query = query.where(eq(platformRevenue.status, filters.status));
    }
    
    return await query.orderBy(desc(platformRevenue.createdAt));
  }

  async getUserActiveSubscription(userId: number): Promise<UserSubscription | undefined> {
    const [result] = await db
      .select()
      .from(userSubscriptions)
      .where(
        and(
          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.status, 'active'),
          sql`${userSubscriptions.endDate} > NOW()`
        )
      );
    return result;
  }
}

export const storage = new DatabaseStorage();