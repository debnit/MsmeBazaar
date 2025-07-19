/**
 * 💳 Razorpay Payment Integration
 * Complete payment, escrow, and payout system for MSME transactions
 */

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { db } from '../db';
import { users, msmeListings, escrowTransactions, paymentTransactions } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { Request, Response } from 'express';

interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receipt: string;
  created_at: number;
}

interface RazorpayPayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  captured: boolean;
  created_at: number;
}

interface EscrowTransaction {
  id: string;
  buyerId: number;
  sellerId: number;
  msmeId: number;
  amount: number;
  status: 'pending' | 'held' | 'released' | 'refunded';
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PayoutRequest {
  account_id: string;
  amount: number;
  currency: string;
  mode: 'IMPS' | 'NEFT' | 'RTGS' | 'UPI';
  purpose: string;
  fund_account: {
    account_type: 'bank_account' | 'vpa';
    bank_account?: {
      name: string;
      ifsc: string;
      account_number: string;
    };
    vpa?: {
      address: string;
    };
  };
  queue_if_low_balance?: boolean;
  reference_id: string;
  narration: string;
}

export class MSMERazorpayIntegration {
  private razorpay: Razorpay;
  private webhookSecret: string;

  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || '',
      key_secret: process.env.RAZORPAY_KEY_SECRET || '',
    });
    this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  }

  // Order Creation for MSME Acquisition
  async createAcquisitionOrder(data: {
    buyerId: number;
    msmeId: number;
    amount: number;
    currency?: string;
    notes?: Record<string, string>;
  }): Promise<RazorpayOrder> {
    const { buyerId, msmeId, amount, currency = 'INR', notes = {} } = data;

    const order = await this.razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency,
      receipt: `msme_${msmeId}_buyer_${buyerId}_${Date.now()}`,
      notes: {
        type: 'msme_acquisition',
        buyer_id: buyerId.toString(),
        msme_id: msmeId.toString(),
        ...notes,
      },
      partial_payment: false,
    });

    return order;
  }

  // Create Escrow Transaction
  async createEscrowTransaction(data: {
    buyerId: number;
    sellerId: number;
    msmeId: number;
    amount: number;
    razorpayOrderId: string;
  }): Promise<string> {
    const { buyerId, sellerId, msmeId, amount, razorpayOrderId } = data;

    const [escrow] = await db.insert(escrowTransactions).values({
      buyerId,
      sellerId,
      msmeId,
      amount,
      status: 'pending',
      razorpayOrderId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return escrow.id;
  }

  // Verify Payment and Update Escrow
  async verifyPaymentAndUpdateEscrow(data: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }): Promise<{ success: boolean; escrowId?: string; error?: string }> {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = data;

    // Verify signature
    const isValid = this.verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    );

    if (!isValid) {
      return { success: false, error: 'Invalid payment signature' };
    }

    // Get payment details
    const payment = await this.razorpay.payments.fetch(razorpayPaymentId);

    if (payment.status !== 'captured') {
      return { success: false, error: 'Payment not captured' };
    }

    // Update escrow transaction
    const [escrow] = await db
      .update(escrowTransactions)
      .set({
        status: 'held',
        razorpayPaymentId,
        updatedAt: new Date(),
      })
      .where(eq(escrowTransactions.razorpayOrderId, razorpayOrderId))
      .returning();

    if (!escrow) {
      return { success: false, error: 'Escrow transaction not found' };
    }

    // Record payment transaction
    await db.insert(paymentTransactions).values({
      userId: escrow.buyerId,
      msmeId: escrow.msmeId,
      amount: payment.amount / 100, // Convert from paise
      currency: payment.currency,
      status: 'completed',
      razorpayPaymentId,
      razorpayOrderId,
      paymentMethod: payment.method,
      createdAt: new Date(),
    });

    return { success: true, escrowId: escrow.id };
  }

  // Release Escrow to Seller
  async releaseEscrowToSeller(escrowId: string, agentCommission?: number): Promise<{
    success: boolean;
    payoutId?: string;
    error?: string;
  }> {
    // Get escrow details
    const [escrow] = await db
      .select()
      .from(escrowTransactions)
      .where(eq(escrowTransactions.id, escrowId));

    if (!escrow || escrow.status !== 'held') {
      return { success: false, error: 'Escrow not found or not in held status' };
    }

    // Get seller details
    const [seller] = await db
      .select()
      .from(users)
      .where(eq(users.id, escrow.sellerId));

    if (!seller || !seller.bankAccount) {
      return { success: false, error: 'Seller bank account not found' };
    }

    // Calculate payout amount (after agent commission)
    const commissionAmount = agentCommission || 0;
    const payoutAmount = escrow.amount - commissionAmount;

    try {
      // Create payout to seller
      const payout = await this.createPayout({
        account_id: seller.razorpayAccountId || '',
        amount: payoutAmount * 100, // Convert to paise
        currency: 'INR',
        mode: 'IMPS',
        purpose: 'business_acquisition',
        fund_account: {
          account_type: 'bank_account',
          bank_account: {
            name: seller.bankAccount.accountHolderName,
            ifsc: seller.bankAccount.ifsc,
            account_number: seller.bankAccount.accountNumber,
          },
        },
        reference_id: `seller_payout_${escrowId}_${Date.now()}`,
        narration: `MSME acquisition payment for listing ${escrow.msmeId}`,
      });

      // Update escrow status
      await db
        .update(escrowTransactions)
        .set({
          status: 'released',
          updatedAt: new Date(),
        })
        .where(eq(escrowTransactions.id, escrowId));

      // Handle agent commission if applicable
      if (agentCommission > 0) {
        await this.processAgentCommission(escrowId, commissionAmount);
      }

      return { success: true, payoutId: payout.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Process Agent Commission
  async processAgentCommission(escrowId: string, commissionAmount: number): Promise<void> {
    // Get escrow details to find the agent
    const [escrow] = await db
      .select()
      .from(escrowTransactions)
      .where(eq(escrowTransactions.id, escrowId));

    if (!escrow) {return;}

    // Get MSME listing to find the agent
    const [listing] = await db
      .select()
      .from(msmeListings)
      .where(eq(msmeListings.id, escrow.msmeId));

    if (!listing || !listing.agentId) {return;}

    // Get agent details
    const [agent] = await db
      .select()
      .from(users)
      .where(eq(users.id, listing.agentId));

    if (!agent || !agent.bankAccount) {return;}

    // Create payout to agent
    await this.createPayout({
      account_id: agent.razorpayAccountId || '',
      amount: commissionAmount * 100, // Convert to paise
      currency: 'INR',
      mode: 'IMPS',
      purpose: 'agent_commission',
      fund_account: {
        account_type: 'bank_account',
        bank_account: {
          name: agent.bankAccount.accountHolderName,
          ifsc: agent.bankAccount.ifsc,
          account_number: agent.bankAccount.accountNumber,
        },
      },
      reference_id: `agent_commission_${escrowId}_${Date.now()}`,
      narration: `Agent commission for MSME listing ${escrow.msmeId}`,
    });
  }

  // Refund Escrow to Buyer
  async refundEscrowToBuyer(escrowId: string, reason: string): Promise<{
    success: boolean;
    refundId?: string;
    error?: string;
  }> {
    // Get escrow details
    const [escrow] = await db
      .select()
      .from(escrowTransactions)
      .where(eq(escrowTransactions.id, escrowId));

    if (!escrow || escrow.status !== 'held') {
      return { success: false, error: 'Escrow not found or not in held status' };
    }

    if (!escrow.razorpayPaymentId) {
      return { success: false, error: 'Payment ID not found' };
    }

    try {
      // Create refund
      const refund = await this.razorpay.payments.refund(escrow.razorpayPaymentId, {
        amount: escrow.amount * 100, // Convert to paise
        notes: {
          reason,
          escrow_id: escrowId,
        },
      });

      // Update escrow status
      await db
        .update(escrowTransactions)
        .set({
          status: 'refunded',
          updatedAt: new Date(),
        })
        .where(eq(escrowTransactions.id, escrowId));

      return { success: true, refundId: refund.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Create Payout
  private async createPayout(payoutData: PayoutRequest): Promise<any> {
    const response = await fetch('https://api.razorpay.com/v1/payouts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(
          `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`,
        ).toString('base64')}`,
      },
      body: JSON.stringify(payoutData),
    });

    if (!response.ok) {
      throw new Error(`Payout creation failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Verify Payment Signature
  private verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string,
  ): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(orderId + '|' + paymentId)
      .digest('hex');

    return expectedSignature === signature;
  }

  // Webhook Handler
  async handleWebhook(req: Request, res: Response): Promise<void> {
    const signature = req.headers['x-razorpay-signature'] as string;
    const body = JSON.stringify(req.body);

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      res.status(400).json({ error: 'Invalid signature' });
      return;
    }

    const event = req.body;

    try {
      switch (event.event) {
      case 'payment.captured':
        await this.handlePaymentCaptured(event.payload.payment.entity);
        break;
      case 'payment.failed':
        await this.handlePaymentFailed(event.payload.payment.entity);
        break;
      case 'payout.processed':
        await this.handlePayoutProcessed(event.payload.payout.entity);
        break;
      case 'payout.failed':
        await this.handlePayoutFailed(event.payload.payout.entity);
        break;
      case 'refund.processed':
        await this.handleRefundProcessed(event.payload.refund.entity);
        break;
      default:
        console.log(`Unhandled webhook event: ${event.event}`);
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Webhook handling error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  // Webhook Event Handlers
  private async handlePaymentCaptured(payment: RazorpayPayment): Promise<void> {
    // Update payment status in database
    await db
      .update(paymentTransactions)
      .set({
        status: 'completed',
        updatedAt: new Date(),
      })
      .where(eq(paymentTransactions.razorpayPaymentId, payment.id));

    // Send notification to relevant parties
    console.log(`Payment captured: ${payment.id}`);
  }

  private async handlePaymentFailed(payment: RazorpayPayment): Promise<void> {
    // Update payment status in database
    await db
      .update(paymentTransactions)
      .set({
        status: 'failed',
        updatedAt: new Date(),
      })
      .where(eq(paymentTransactions.razorpayPaymentId, payment.id));

    // Send notification to buyer
    console.log(`Payment failed: ${payment.id}`);
  }

  private async handlePayoutProcessed(payout: any): Promise<void> {
    // Update payout status in database
    console.log(`Payout processed: ${payout.id}`);
  }

  private async handlePayoutFailed(payout: any): Promise<void> {
    // Handle payout failure
    console.log(`Payout failed: ${payout.id}`);
  }

  private async handleRefundProcessed(refund: any): Promise<void> {
    // Update refund status in database
    console.log(`Refund processed: ${refund.id}`);
  }

  // Utility Methods
  async getPaymentDetails(paymentId: string): Promise<RazorpayPayment> {
    return this.razorpay.payments.fetch(paymentId);
  }

  async getOrderDetails(orderId: string): Promise<RazorpayOrder> {
    return this.razorpay.orders.fetch(orderId);
  }

  // Account Management
  async createLinkedAccount(data: {
    email: string;
    phone: string;
    legal_business_name: string;
    business_type: string;
    customer_facing_business_name: string;
    profile: {
      category: string;
      subcategory: string;
      addresses: {
        registered: {
          street1: string;
          street2?: string;
          city: string;
          state: string;
          postal_code: string;
          country: string;
        };
      };
    };
  }): Promise<any> {
    const response = await fetch('https://api.razorpay.com/v2/accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(
          `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`,
        ).toString('base64')}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Account creation failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Health Check
  isHealthy(): boolean {
    return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  }
}

export const razorpayIntegration = new MSMERazorpayIntegration();
