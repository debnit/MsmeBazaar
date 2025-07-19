import { EscrowAccount, EscrowMilestone, EscrowTransaction, InsertEscrowAccount, InsertEscrowMilestone, InsertEscrowTransaction } from '@shared/schema';
import { storage } from '../storage';
import { notificationService } from './notifications';

export class EscrowService {
  private escrows = new Map<number, EscrowAccount>();
  private milestones = new Map<number, EscrowMilestone>();
  private transactions = new Map<number, EscrowTransaction>();
  private nextEscrowId = 1;
  private nextMilestoneId = 1;
  private nextTransactionId = 1;

  async createEscrowAccount(accountData: InsertEscrowAccount): Promise<EscrowAccount> {
    const account: EscrowAccount = {
      id: this.nextEscrowId++,
      ...accountData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.escrows.set(account.id, account);
    return account;
  }

  async fundEscrow(escrowId: number, amount: number): Promise<boolean> {
    const escrow = this.escrows.get(escrowId);
    if (!escrow) {
      throw new Error('Escrow account not found');
    }

    if (escrow.status !== 'pending') {
      throw new Error('Escrow must be in pending status to fund');
    }

    const transaction: EscrowTransaction = {
      id: this.nextTransactionId++,
      escrowId,
      fromParty: 'buyer',
      toParty: 'escrow',
      amount,
      type: 'deposit',
      status: 'completed',
      createdAt: new Date(),
    };

    this.transactions.set(transaction.id, transaction);
    escrow.status = 'funded';
    escrow.updatedAt = new Date();

    // Send notification to seller
    await notificationService.sendNotification(escrow.sellerId, {
      type: 'escrow_funded',
      title: 'Escrow Account Funded',
      message: `Escrow account for your listing has been funded with ₹${amount.toLocaleString('en-IN')}`,
      metadata: { escrowId, amount },
    });

    return true;
  }

  async releaseFunds(escrowId: number): Promise<boolean> {
    const escrow = this.escrows.get(escrowId);
    if (!escrow) {
      throw new Error('Escrow account not found');
    }

    if (escrow.status !== 'funded') {
      throw new Error('Escrow must be funded to release funds');
    }

    // Check if all milestones are completed
    const escrowMilestones = Array.from(this.milestones.values())
      .filter(m => m.escrowId === escrowId);

    const allMilestonesCompleted = escrowMilestones.every(m => m.status === 'completed');
    if (!allMilestonesCompleted) {
      throw new Error('All milestones must be completed before releasing funds');
    }

    const totalAmount = escrow.amount;
    const platformFee = totalAmount * 0.02; // 2% platform fee
    const agentCommission = escrow.agentId ? totalAmount * 0.01 : 0; // 1% agent commission
    const sellerAmount = totalAmount - platformFee - agentCommission;

    // Release funds to seller
    const sellerTransaction: EscrowTransaction = {
      id: this.nextTransactionId++,
      escrowId,
      fromParty: 'escrow',
      toParty: 'seller',
      amount: sellerAmount,
      type: 'withdrawal',
      status: 'completed',
      createdAt: new Date(),
    };

    this.transactions.set(sellerTransaction.id, sellerTransaction);

    // Agent commission transaction
    if (escrow.agentId && agentCommission > 0) {
      const agentTransaction: EscrowTransaction = {
        id: this.nextTransactionId++,
        escrowId,
        fromParty: 'escrow',
        toParty: 'agent',
        amount: agentCommission,
        type: 'commission',
        status: 'completed',
        createdAt: new Date(),
      };

      this.transactions.set(agentTransaction.id, agentTransaction);

      // Notify agent
      await notificationService.sendNotification(escrow.agentId, {
        type: 'commission_paid',
        title: 'Commission Payment',
        message: `You've received a commission of ₹${agentCommission.toLocaleString('en-IN')}`,
        metadata: { escrowId, amount: agentCommission },
      });
    }

    escrow.status = 'completed';
    escrow.updatedAt = new Date();

    // Notify all parties
    await notificationService.sendNotification(escrow.sellerId, {
      type: 'funds_released',
      title: 'Funds Released',
      message: `₹${sellerAmount.toLocaleString('en-IN')} has been released to your account`,
      metadata: { escrowId, amount: sellerAmount },
    });

    await notificationService.sendNotification(escrow.buyerId, {
      type: 'transaction_completed',
      title: 'Transaction Completed',
      message: 'The business acquisition transaction has been completed successfully',
      metadata: { escrowId },
    });

    return true;
  }

  async createMilestone(milestoneData: InsertEscrowMilestone): Promise<EscrowMilestone> {
    const milestone: EscrowMilestone = {
      id: this.nextMilestoneId++,
      ...milestoneData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.milestones.set(milestone.id, milestone);
    return milestone;
  }

  async completeMilestone(milestoneId: number): Promise<boolean> {
    const milestone = this.milestones.get(milestoneId);
    if (!milestone) {
      throw new Error('Milestone not found');
    }

    if (milestone.status !== 'pending') {
      throw new Error('Milestone must be in pending status to complete');
    }

    milestone.status = 'completed';
    milestone.completedAt = new Date();
    milestone.updatedAt = new Date();

    // Notify relevant parties
    const escrow = this.escrows.get(milestone.escrowId);
    if (escrow) {
      await notificationService.sendNotification(escrow.buyerId, {
        type: 'milestone_completed',
        title: 'Milestone Completed',
        message: `Milestone "${milestone.title}" has been completed`,
        metadata: { milestoneId, escrowId: milestone.escrowId },
      });

      await notificationService.sendNotification(escrow.sellerId, {
        type: 'milestone_completed',
        title: 'Milestone Completed',
        message: `Milestone "${milestone.title}" has been completed`,
        metadata: { milestoneId, escrowId: milestone.escrowId },
      });
    }

    return true;
  }

  async getEscrowAccount(escrowId: number): Promise<EscrowAccount | null> {
    return this.escrows.get(escrowId) || null;
  }

  async getEscrowMilestones(escrowId: number): Promise<EscrowMilestone[]> {
    return Array.from(this.milestones.values())
      .filter(m => m.escrowId === escrowId);
  }

  async getEscrowTransactions(escrowId: number): Promise<EscrowTransaction[]> {
    return Array.from(this.transactions.values())
      .filter(t => t.escrowId === escrowId);
  }

  async getUserEscrowAccounts(userId: number): Promise<EscrowAccount[]> {
    return Array.from(this.escrows.values())
      .filter(e => e.buyerId === userId || e.sellerId === userId || e.agentId === userId);
  }

  async refundEscrow(escrowId: number, reason: string): Promise<boolean> {
    const escrow = this.escrows.get(escrowId);
    if (!escrow) {
      throw new Error('Escrow account not found');
    }

    if (escrow.status !== 'funded') {
      throw new Error('Escrow must be funded to process refund');
    }

    const refundTransaction: EscrowTransaction = {
      id: this.nextTransactionId++,
      escrowId,
      fromParty: 'escrow',
      toParty: 'buyer',
      amount: escrow.amount,
      type: 'refund',
      status: 'completed',
      createdAt: new Date(),
    };

    this.transactions.set(refundTransaction.id, refundTransaction);
    escrow.status = 'refunded';
    escrow.updatedAt = new Date();

    // Notify parties
    await notificationService.sendNotification(escrow.buyerId, {
      type: 'refund_processed',
      title: 'Refund Processed',
      message: `Your escrow amount of ₹${escrow.amount.toLocaleString('en-IN')} has been refunded. Reason: ${reason}`,
      metadata: { escrowId, amount: escrow.amount, reason },
    });

    await notificationService.sendNotification(escrow.sellerId, {
      type: 'transaction_cancelled',
      title: 'Transaction Cancelled',
      message: `The transaction has been cancelled and funds have been refunded to the buyer. Reason: ${reason}`,
      metadata: { escrowId, reason },
    });

    return true;
  }
}

export const escrowService = new EscrowService();
