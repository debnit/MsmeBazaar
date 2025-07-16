import {
  users,
  nbfcDetails,
  msmeListings,
  loanApplications,
  buyerInterests,
  agentAssignments,
  loanProducts,
  complianceRecords,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, ilike, sql } from "drizzle-orm";
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
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, password: hashedPassword })
      .returning();
    return user;
  }

  async updateUser(id: number, updateUser: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updateUser, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async authenticateUser(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user || !user.password) return null;
    
    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  // NBFC operations
  async createNbfcDetails(nbfc: InsertNbfcDetails): Promise<NbfcDetails> {
    const [nbfcDetail] = await db
      .insert(nbfcDetails)
      .values(nbfc)
      .returning();
    return nbfcDetail;
  }

  async getNbfcDetails(userId: number): Promise<NbfcDetails | undefined> {
    const [nbfc] = await db
      .select()
      .from(nbfcDetails)
      .where(eq(nbfcDetails.userId, userId));
    return nbfc;
  }

  async updateNbfcDetails(userId: number, nbfc: Partial<InsertNbfcDetails>): Promise<NbfcDetails> {
    const [updated] = await db
      .update(nbfcDetails)
      .set({ ...nbfc, updatedAt: new Date() })
      .where(eq(nbfcDetails.userId, userId))
      .returning();
    return updated;
  }

  // MSME operations
  async createMsmeListing(listing: InsertMsmeListing): Promise<MsmeListing> {
    const [msme] = await db
      .insert(msmeListings)
      .values(listing)
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
      if (filters.status) conditions.push(eq(msmeListings.status, filters.status));
      if (filters.industry) conditions.push(ilike(msmeListings.industry, `%${filters.industry}%`));
      if (filters.city) conditions.push(ilike(msmeListings.city, `%${filters.city}%`));
      
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
    const [updated] = await db
      .update(msmeListings)
      .set({ ...listing, updatedAt: new Date() })
      .where(eq(msmeListings.id, id))
      .returning();
    return updated;
  }

  async deleteMsmeListing(id: number): Promise<void> {
    await db.delete(msmeListings).where(eq(msmeListings.id, id));
  }

  // Loan application operations
  async createLoanApplication(application: InsertLoanApplication): Promise<LoanApplication> {
    const [loan] = await db
      .insert(loanApplications)
      .values(application)
      .returning();
    return loan;
  }

  async getLoanApplication(id: number): Promise<LoanApplication | undefined> {
    const [loan] = await db
      .select()
      .from(loanApplications)
      .where(eq(loanApplications.id, id));
    return loan;
  }

  async getLoanApplications(filters?: { nbfcId?: number; buyerId?: number; status?: string }): Promise<LoanApplication[]> {
    let query = db.select().from(loanApplications);
    
    if (filters) {
      const conditions = [];
      if (filters.nbfcId) conditions.push(eq(loanApplications.nbfcId, filters.nbfcId));
      if (filters.buyerId) conditions.push(eq(loanApplications.buyerId, filters.buyerId));
      if (filters.status) conditions.push(eq(loanApplications.status, filters.status));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    return await query.orderBy(desc(loanApplications.createdAt));
  }

  async updateLoanApplication(id: number, application: Partial<InsertLoanApplication>): Promise<LoanApplication> {
    const [updated] = await db
      .update(loanApplications)
      .set({ ...application, updatedAt: new Date() })
      .where(eq(loanApplications.id, id))
      .returning();
    return updated;
  }

  // Buyer interest operations
  async createBuyerInterest(interest: InsertBuyerInterest): Promise<BuyerInterest> {
    const [buyerInterest] = await db
      .insert(buyerInterests)
      .values(interest)
      .returning();
    return buyerInterest;
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
    const [updated] = await db
      .update(buyerInterests)
      .set({ ...interest, updatedAt: new Date() })
      .where(eq(buyerInterests.id, id))
      .returning();
    return updated;
  }

  // Agent operations
  async createAgentAssignment(assignment: InsertAgentAssignment): Promise<AgentAssignment> {
    const [agentAssignment] = await db
      .insert(agentAssignments)
      .values(assignment)
      .returning();
    return agentAssignment;
  }

  async getAgentAssignments(agentId: number): Promise<AgentAssignment[]> {
    return await db
      .select()
      .from(agentAssignments)
      .where(eq(agentAssignments.agentId, agentId))
      .orderBy(desc(agentAssignments.createdAt));
  }

  async updateAgentAssignment(id: number, assignment: Partial<InsertAgentAssignment>): Promise<AgentAssignment> {
    const [updated] = await db
      .update(agentAssignments)
      .set({ ...assignment, updatedAt: new Date() })
      .where(eq(agentAssignments.id, id))
      .returning();
    return updated;
  }

  // Loan product operations
  async createLoanProduct(product: InsertLoanProduct): Promise<LoanProduct> {
    const [loanProduct] = await db
      .insert(loanProducts)
      .values(product)
      .returning();
    return loanProduct;
  }

  async getLoanProducts(nbfcId?: number): Promise<LoanProduct[]> {
    let query = db.select().from(loanProducts);
    
    if (nbfcId) {
      query = query.where(eq(loanProducts.nbfcId, nbfcId));
    }
    
    return await query.orderBy(desc(loanProducts.createdAt));
  }

  async updateLoanProduct(id: number, product: Partial<InsertLoanProduct>): Promise<LoanProduct> {
    const [updated] = await db
      .update(loanProducts)
      .set({ ...product, updatedAt: new Date() })
      .where(eq(loanProducts.id, id))
      .returning();
    return updated;
  }

  // Compliance operations
  async createComplianceRecord(record: InsertComplianceRecord): Promise<ComplianceRecord> {
    const [complianceRecord] = await db
      .insert(complianceRecords)
      .values(record)
      .returning();
    return complianceRecord;
  }

  async getComplianceRecords(nbfcId: number): Promise<ComplianceRecord[]> {
    return await db
      .select()
      .from(complianceRecords)
      .where(eq(complianceRecords.nbfcId, nbfcId))
      .orderBy(desc(complianceRecords.createdAt));
  }

  async updateComplianceRecord(id: number, record: Partial<InsertComplianceRecord>): Promise<ComplianceRecord> {
    const [updated] = await db
      .update(complianceRecords)
      .set({ ...record, updatedAt: new Date() })
      .where(eq(complianceRecords.id, id))
      .returning();
    return updated;
  }

  // Analytics
  async getDashboardStats(userId: number, role: string): Promise<any> {
    const stats: any = {};
    
    if (role === 'nbfc') {
      // NBFC dashboard stats
      const [loanStats] = await db
        .select({
          totalApplications: sql<number>`count(*)`,
          totalAmount: sql<number>`sum(loan_amount)`,
          approvedCount: sql<number>`sum(case when status = 'approved' then 1 else 0 end)`,
          disbursedCount: sql<number>`sum(case when status = 'disbursed' then 1 else 0 end)`,
        })
        .from(loanApplications)
        .where(eq(loanApplications.nbfcId, userId));
      
      stats.loanApplications = loanStats.totalApplications || 0;
      stats.disbursedAmount = loanStats.totalAmount || 0;
      stats.approvedLoans = loanStats.approvedCount || 0;
      stats.disbursedLoans = loanStats.disbursedCount || 0;
    } else if (role === 'seller') {
      // Seller dashboard stats
      const [sellerStats] = await db
        .select({
          totalListings: sql<number>`count(*)`,
          activeListings: sql<number>`sum(case when status = 'active' then 1 else 0 end)`,
          soldListings: sql<number>`sum(case when status = 'sold' then 1 else 0 end)`,
        })
        .from(msmeListings)
        .where(eq(msmeListings.sellerId, userId));
      
      stats.totalListings = sellerStats.totalListings || 0;
      stats.activeListings = sellerStats.activeListings || 0;
      stats.soldListings = sellerStats.soldListings || 0;
    } else if (role === 'buyer') {
      // Buyer dashboard stats
      const [buyerStats] = await db
        .select({
          totalInterests: sql<number>`count(*)`,
          activeInterests: sql<number>`sum(case when status = 'active' then 1 else 0 end)`,
        })
        .from(buyerInterests)
        .where(eq(buyerInterests.buyerId, userId));
      
      stats.totalInterests = buyerStats.totalInterests || 0;
      stats.activeInterests = buyerStats.activeInterests || 0;
    } else if (role === 'agent') {
      // Agent dashboard stats
      const [agentStats] = await db
        .select({
          totalAssignments: sql<number>`count(*)`,
          activeAssignments: sql<number>`sum(case when status = 'active' then 1 else 0 end)`,
          totalEarnings: sql<number>`sum(earnings)`,
        })
        .from(agentAssignments)
        .where(eq(agentAssignments.agentId, userId));
      
      stats.totalAssignments = agentStats.totalAssignments || 0;
      stats.activeAssignments = agentStats.activeAssignments || 0;
      stats.totalEarnings = agentStats.totalEarnings || 0;
    }
    
    return stats;
  }
}

export const storage = new DatabaseStorage();
