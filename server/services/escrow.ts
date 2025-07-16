import { z } from 'zod';

// Escrow service interfaces
export interface EscrowAccount {
  id: number;
  buyerId: number;
  sellerId: number;
  msmeId: number;
  amount: number;
  currency: string;
  status: 'pending' | 'funded' | 'released' | 'refunded' | 'disputed';
  createdAt: Date;
  updatedAt: Date;
  releaseConditions: string[];
  milestones: EscrowMilestone[];
  transactionHistory: EscrowTransaction[];
}

export interface EscrowMilestone {
  id: number;
  escrowId: number;
  description: string;
  amount: number;
  status: 'pending' | 'completed' | 'disputed';
  dueDate: Date;
  completedAt?: Date;
  completedBy?: number;
  evidence?: string;
}

export interface EscrowTransaction {
  id: number;
  escrowId: number;
  type: 'fund' | 'release' | 'refund' | 'dispute';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  transactionId: string;
  paymentMethod: string;
  timestamp: Date;
  metadata?: any;
}

export interface EscrowAnalytics {
  totalEscrows: number;
  pendingEscrows: number;
  fundedEscrows: number;
  releasedEscrows: number;
  disputedEscrows: number;
  totalVolume: number;
  releasedVolume: number;
  averageEscrowAmount: number;
  successRate: number;
  recentTransactions: EscrowTransaction[];
}

// Validation schemas
const createEscrowSchema = z.object({
  buyerId: z.number(),
  sellerId: z.number(),
  msmeId: z.number(),
  amount: z.number().positive(),
  currency: z.string().default('INR'),
  releaseConditions: z.array(z.string()),
  milestones: z.array(z.object({
    description: z.string(),
    amount: z.number().positive(),
    dueDate: z.string().transform(str => new Date(str))
  }))
});

const fundEscrowSchema = z.object({
  escrowId: z.number(),
  paymentMethod: z.string(),
  transactionId: z.string(),
  amount: z.number().positive().optional()
});

const completeMilestoneSchema = z.object({
  milestoneId: z.number(),
  evidence: z.string().optional(),
  completedBy: z.number()
});

class EscrowService {
  private escrows: Map<number, EscrowAccount> = new Map();
  private milestones: Map<number, EscrowMilestone> = new Map();
  private transactions: Map<number, EscrowTransaction> = new Map();
  private nextEscrowId = 1;
  private nextMilestoneId = 1;
  private nextTransactionId = 1;

  // Create new escrow account
  async createEscrowAccount(data: any): Promise<EscrowAccount> {
    const validatedData = createEscrowSchema.parse(data);
    
    // Validate that milestone amounts sum to total amount
    const totalMilestoneAmount = validatedData.milestones.reduce((sum, m) => sum + m.amount, 0);
    if (totalMilestoneAmount !== validatedData.amount) {
      throw new Error('Milestone amounts must sum to total escrow amount');
    }

    const escrowId = this.nextEscrowId++;
    
    // Create milestones
    const milestones: EscrowMilestone[] = validatedData.milestones.map(milestone => ({
      id: this.nextMilestoneId++,
      escrowId,
      description: milestone.description,
      amount: milestone.amount,
      status: 'pending' as const,
      dueDate: milestone.dueDate
    }));

    // Store milestones
    milestones.forEach(milestone => {
      this.milestones.set(milestone.id, milestone);
    });

    const escrowAccount: EscrowAccount = {
      id: escrowId,
      buyerId: validatedData.buyerId,
      sellerId: validatedData.sellerId,
      msmeId: validatedData.msmeId,
      amount: validatedData.amount,
      currency: validatedData.currency,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      releaseConditions: validatedData.releaseConditions,
      milestones,
      transactionHistory: []
    };

    this.escrows.set(escrowId, escrowAccount);
    return escrowAccount;
  }

  // Fund escrow account
  async fundEscrowAccount(escrowId: number, paymentMethod: string, transactionId: string): Promise<boolean> {
    const escrow = this.escrows.get(escrowId);
    if (!escrow) {
      throw new Error('Escrow account not found');
    }

    if (escrow.status !== 'pending') {
      throw new Error('Escrow account is not in pending status');
    }

    // Create transaction record
    const transaction: EscrowTransaction = {
      id: this.nextTransactionId++,
      escrowId,
      type: 'fund',
      amount: escrow.amount,
      status: 'completed',
      transactionId,
      paymentMethod,
      timestamp: new Date(),
      metadata: {
        fundedBy: escrow.buyerId,
        paymentGateway: paymentMethod
      }
    };

    this.transactions.set(transaction.id, transaction);
    escrow.transactionHistory.push(transaction);
    
    // Update escrow status
    escrow.status = 'funded';
    escrow.updatedAt = new Date();
    
    this.escrows.set(escrowId, escrow);
    return true;
  }

  // Complete milestone
  async completeMilestone(data: any): Promise<boolean> {
    const validatedData = completeMilestoneSchema.parse(data);
    
    const milestone = this.milestones.get(validatedData.milestoneId);
    if (!milestone) {
      throw new Error('Milestone not found');
    }

    if (milestone.status !== 'pending') {
      throw new Error('Milestone is not in pending status');
    }

    const escrow = this.escrows.get(milestone.escrowId);
    if (!escrow) {
      throw new Error('Associated escrow not found');
    }

    if (escrow.status !== 'funded') {
      throw new Error('Escrow must be funded to complete milestones');
    }

    // Update milestone
    milestone.status = 'completed';
    milestone.completedAt = new Date();
    milestone.completedBy = validatedData.completedBy;
    milestone.evidence = validatedData.evidence;

    this.milestones.set(milestone.id, milestone);

    // Update escrow milestones
    const escrowMilestoneIndex = escrow.milestones.findIndex(m => m.id === milestone.id);
    if (escrowMilestoneIndex !== -1) {
      escrow.milestones[escrowMilestoneIndex] = milestone;
    }

    escrow.updatedAt = new Date();
    this.escrows.set(escrow.id, escrow);

    return true;
  }

  // Release funds to seller
  async releaseFunds(escrowId: number): Promise<boolean> {
    const escrow = this.escrows.get(escrowId);
    if (!escrow) {
      throw new Error('Escrow account not found');
    }

    if (escrow.status !== 'funded') {
      throw new Error('Escrow must be funded to release funds');
    }

    // Check if all milestones are completed
    const allMilestonesCompleted = escrow.milestones.every(m => m.status === 'completed');
    if (!allMilestonesCompleted) {
      throw new Error('All milestones must be completed before releasing funds');
    }

    // Create release transaction
    const transaction: EscrowTransaction = {
      id: this.nextTransactionId++,
      escrowId,
      type: 'release',
      amount: escrow.amount,
      status: 'completed',
      transactionId: `release_${Date.now()}`,
      paymentMethod: 'bank_transfer',
      timestamp: new Date(),
      metadata: {
        releasedTo: escrow.sellerId,
        releaseReason: 'milestones_completed'
      }
    };

    this.transactions.set(transaction.id, transaction);
    escrow.transactionHistory.push(transaction);

    // Update escrow status
    escrow.status = 'released';
    escrow.updatedAt = new Date();
    
    this.escrows.set(escrowId, escrow);
    return true;
  }

  // Refund funds to buyer
  async refundFunds(escrowId: number, reason: string): Promise<boolean> {
    const escrow = this.escrows.get(escrowId);
    if (!escrow) {
      throw new Error('Escrow account not found');
    }

    if (escrow.status !== 'funded') {
      throw new Error('Escrow must be funded to refund');
    }

    // Create refund transaction
    const transaction: EscrowTransaction = {
      id: this.nextTransactionId++,
      escrowId,
      type: 'refund',
      amount: escrow.amount,
      status: 'completed',
      transactionId: `refund_${Date.now()}`,
      paymentMethod: 'bank_transfer',
      timestamp: new Date(),
      metadata: {
        refundedTo: escrow.buyerId,
        refundReason: reason
      }
    };

    this.transactions.set(transaction.id, transaction);
    escrow.transactionHistory.push(transaction);

    // Update escrow status
    escrow.status = 'refunded';
    escrow.updatedAt = new Date();
    
    this.escrows.set(escrowId, escrow);
    return true;
  }

  // Get escrow account details
  async getEscrowAccount(escrowId: number): Promise<EscrowAccount | null> {
    return this.escrows.get(escrowId) || null;
  }

  // Get escrows by user (buyer or seller)
  async getEscrowsByUser(userId: number): Promise<EscrowAccount[]> {
    return Array.from(this.escrows.values()).filter(
      escrow => escrow.buyerId === userId || escrow.sellerId === userId
    );
  }

  // Get escrows by MSME
  async getEscrowsByMSME(msmeId: number): Promise<EscrowAccount[]> {
    return Array.from(this.escrows.values()).filter(
      escrow => escrow.msmeId === msmeId
    );
  }

  // Get all escrows (admin)
  async getAllEscrows(): Promise<EscrowAccount[]> {
    return Array.from(this.escrows.values());
  }

  // Get escrow analytics
  async getEscrowAnalytics(): Promise<EscrowAnalytics> {
    const allEscrows = Array.from(this.escrows.values());
    const allTransactions = Array.from(this.transactions.values());

    const totalEscrows = allEscrows.length;
    const pendingEscrows = allEscrows.filter(e => e.status === 'pending').length;
    const fundedEscrows = allEscrows.filter(e => e.status === 'funded').length;
    const releasedEscrows = allEscrows.filter(e => e.status === 'released').length;
    const disputedEscrows = allEscrows.filter(e => e.status === 'disputed').length;

    const totalVolume = allEscrows.reduce((sum, escrow) => sum + escrow.amount, 0);
    const releasedVolume = allEscrows
      .filter(e => e.status === 'released')
      .reduce((sum, escrow) => sum + escrow.amount, 0);

    const averageEscrowAmount = totalEscrows > 0 ? totalVolume / totalEscrows : 0;
    const successRate = totalEscrows > 0 ? (releasedEscrows / totalEscrows) * 100 : 0;

    const recentTransactions = allTransactions
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    return {
      totalEscrows,
      pendingEscrows,
      fundedEscrows,
      releasedEscrows,
      disputedEscrows,
      totalVolume,
      releasedVolume,
      averageEscrowAmount,
      successRate,
      recentTransactions
    };
  }

  // Dispute escrow
  async disputeEscrow(escrowId: number, reason: string, disputedBy: number): Promise<boolean> {
    const escrow = this.escrows.get(escrowId);
    if (!escrow) {
      throw new Error('Escrow account not found');
    }

    if (escrow.status !== 'funded') {
      throw new Error('Only funded escrows can be disputed');
    }

    // Create dispute transaction
    const transaction: EscrowTransaction = {
      id: this.nextTransactionId++,
      escrowId,
      type: 'dispute',
      amount: 0,
      status: 'pending',
      transactionId: `dispute_${Date.now()}`,
      paymentMethod: 'none',
      timestamp: new Date(),
      metadata: {
        disputedBy,
        disputeReason: reason,
        status: 'under_review'
      }
    };

    this.transactions.set(transaction.id, transaction);
    escrow.transactionHistory.push(transaction);

    // Update escrow status
    escrow.status = 'disputed';
    escrow.updatedAt = new Date();
    
    this.escrows.set(escrowId, escrow);
    return true;
  }

  // Resolve dispute
  async resolveDispute(escrowId: number, resolution: 'release' | 'refund' | 'partial', resolutionDetails?: any): Promise<boolean> {
    const escrow = this.escrows.get(escrowId);
    if (!escrow) {
      throw new Error('Escrow account not found');
    }

    if (escrow.status !== 'disputed') {
      throw new Error('Escrow is not in disputed status');
    }

    switch (resolution) {
      case 'release':
        return this.releaseFunds(escrowId);
      case 'refund':
        return this.refundFunds(escrowId, 'dispute_resolved_refund');
      case 'partial':
        // Handle partial resolution
        if (!resolutionDetails || !resolutionDetails.buyerAmount || !resolutionDetails.sellerAmount) {
          throw new Error('Partial resolution requires buyer and seller amounts');
        }
        
        // Create partial transactions
        const buyerTransaction: EscrowTransaction = {
          id: this.nextTransactionId++,
          escrowId,
          type: 'refund',
          amount: resolutionDetails.buyerAmount,
          status: 'completed',
          transactionId: `partial_refund_${Date.now()}`,
          paymentMethod: 'bank_transfer',
          timestamp: new Date(),
          metadata: {
            refundedTo: escrow.buyerId,
            refundReason: 'dispute_resolved_partial'
          }
        };

        const sellerTransaction: EscrowTransaction = {
          id: this.nextTransactionId++,
          escrowId,
          type: 'release',
          amount: resolutionDetails.sellerAmount,
          status: 'completed',
          transactionId: `partial_release_${Date.now()}`,
          paymentMethod: 'bank_transfer',
          timestamp: new Date(),
          metadata: {
            releasedTo: escrow.sellerId,
            releaseReason: 'dispute_resolved_partial'
          }
        };

        this.transactions.set(buyerTransaction.id, buyerTransaction);
        this.transactions.set(sellerTransaction.id, sellerTransaction);
        escrow.transactionHistory.push(buyerTransaction, sellerTransaction);

        escrow.status = 'released';
        escrow.updatedAt = new Date();
        this.escrows.set(escrowId, escrow);
        
        return true;
      default:
        throw new Error('Invalid resolution type');
    }
  }

  // Get milestone by ID
  async getMilestone(milestoneId: number): Promise<EscrowMilestone | null> {
    return this.milestones.get(milestoneId) || null;
  }

  // Get milestones by escrow
  async getMilestonesByEscrow(escrowId: number): Promise<EscrowMilestone[]> {
    return Array.from(this.milestones.values()).filter(m => m.escrowId === escrowId);
  }

  // Get transaction history
  async getTransactionHistory(escrowId: number): Promise<EscrowTransaction[]> {
    return Array.from(this.transactions.values()).filter(t => t.escrowId === escrowId);
  }

  // Auto-release funds (for scheduled releases)
  async autoReleaseFunds(escrowId: number): Promise<boolean> {
    const escrow = this.escrows.get(escrowId);
    if (!escrow) {
      throw new Error('Escrow account not found');
    }

    // Check if auto-release conditions are met
    const now = new Date();
    const overdueUncompletedMilestones = escrow.milestones.filter(
      m => m.status === 'pending' && new Date(m.dueDate) < now
    );

    if (overdueUncompletedMilestones.length > 0) {
      // Don't auto-release if there are overdue milestones
      return false;
    }

    // Check if all milestones are completed
    const allCompleted = escrow.milestones.every(m => m.status === 'completed');
    if (allCompleted) {
      return this.releaseFunds(escrowId);
    }

    return false;
  }

  // Get escrow statistics
  async getEscrowStatistics(): Promise<any> {
    const allEscrows = Array.from(this.escrows.values());
    const allTransactions = Array.from(this.transactions.values());

    return {
      totalEscrows: allEscrows.length,
      statusBreakdown: {
        pending: allEscrows.filter(e => e.status === 'pending').length,
        funded: allEscrows.filter(e => e.status === 'funded').length,
        released: allEscrows.filter(e => e.status === 'released').length,
        refunded: allEscrows.filter(e => e.status === 'refunded').length,
        disputed: allEscrows.filter(e => e.status === 'disputed').length,
      },
      volumeStatistics: {
        totalVolume: allEscrows.reduce((sum, e) => sum + e.amount, 0),
        averageAmount: allEscrows.length > 0 ? allEscrows.reduce((sum, e) => sum + e.amount, 0) / allEscrows.length : 0,
        largestEscrow: Math.max(...allEscrows.map(e => e.amount), 0),
        smallestEscrow: Math.min(...allEscrows.map(e => e.amount), 0),
      },
      transactionStatistics: {
        totalTransactions: allTransactions.length,
        transactionTypes: {
          fund: allTransactions.filter(t => t.type === 'fund').length,
          release: allTransactions.filter(t => t.type === 'release').length,
          refund: allTransactions.filter(t => t.type === 'refund').length,
          dispute: allTransactions.filter(t => t.type === 'dispute').length,
        }
      }
    };
  }
}

export const escrowService = new EscrowService();