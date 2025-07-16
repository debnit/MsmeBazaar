// Atomic operations for better performance and consistency
import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import { 
  users, 
  msmeListings, 
  buyerInterests, 
  notifications, 
  escrowAccounts, 
  escrowTransactions, 
  valuationRequests,
  userProfiles 
} from '../../shared/schema';

export class AtomicOperations {
  private static instance: AtomicOperations;
  private transactionPool: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): AtomicOperations {
    if (!AtomicOperations.instance) {
      AtomicOperations.instance = new AtomicOperations();
    }
    return AtomicOperations.instance;
  }

  // Atomic user operations
  async createUserWithProfile(userData: any, profileData: any) {
    return await db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values(userData).returning();
      const [profile] = await tx.insert(userProfiles).values({
        ...profileData,
        userId: user.id
      }).returning();
      
      return { user, profile };
    });
  }

  // Atomic MSME listing operations
  async createMSMEWithValuation(msmeData: any, valuationData: any) {
    return await db.transaction(async (tx) => {
      const [msme] = await tx.insert(msmeListings).values(msmeData).returning();
      const [valuation] = await tx.insert(valuationRequests).values({
        ...valuationData,
        msmeId: msme.id
      }).returning();
      
      return { msme, valuation };
    });
  }

  // Atomic interest expression with notification
  async expressInterestWithNotification(interestData: any, notificationData: any) {
    return await db.transaction(async (tx) => {
      const [interest] = await tx.insert(buyerInterests).values(interestData).returning();
      const [notification] = await tx.insert(notifications).values({
        ...notificationData,
        relatedId: interest.id
      }).returning();
      
      return { interest, notification };
    });
  }

  // Atomic escrow operations
  async createEscrowWithTransaction(escrowData: any, transactionData: any) {
    return await db.transaction(async (tx) => {
      const [escrow] = await tx.insert(escrowAccounts).values(escrowData).returning();
      const [transaction] = await tx.insert(escrowTransactions).values({
        ...transactionData,
        escrowId: escrow.id
      }).returning();
      
      return { escrow, transaction };
    });
  }

  // Batch operations for better performance
  async batchUpdateListings(updates: Array<{ id: string, data: any }>) {
    return await db.transaction(async (tx) => {
      const results = [];
      for (const update of updates) {
        const [result] = await tx
          .update(msmeListings)
          .set(update.data)
          .where(eq(msmeListings.id, update.id))
          .returning();
        results.push(result);
      }
      return results;
    });
  }

  // Atomic cache operations
  private cacheOperations = new Map<string, any>();
  
  async atomicCacheUpdate(key: string, value: any, ttl: number = 300000) {
    // Prevent concurrent cache updates
    if (this.cacheOperations.has(key)) {
      return this.cacheOperations.get(key);
    }
    
    const operation = Promise.resolve().then(() => {
      // Actual cache update logic
      return { key, value, ttl };
    }).finally(() => {
      this.cacheOperations.delete(key);
    });
    
    this.cacheOperations.set(key, operation);
    return operation;
  }
}

export const atomicOperations = AtomicOperations.getInstance();