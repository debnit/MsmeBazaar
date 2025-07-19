// Razorpay integration for payments, escrow, and agent payouts
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { queueManager } from '../infrastructure/queue-system';
import { storage } from '../storage';

interface PaymentOrder {
  orderId: string;
  amount: number;
  currency: string;
  receipt: string;
  status: 'created' | 'attempted' | 'paid' | 'failed';
  createdAt: string;
  userId: string;
  productType: 'subscription' | 'valuation' | 'matchmaking' | 'premium_feature';
}

interface EscrowAccount {
  id: string;
  transactionId: string;
  amount: number;
  buyerId: string;
  sellerId: string;
  agentId?: string;
  status: 'created' | 'funded' | 'released' | 'refunded';
  createdAt: string;
  releasedAt?: string;
}

interface AgentPayout {
  id: string;
  agentId: string;
  amount: number;
  commission: number;
  transactionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: string;
  processedAt?: string;
  payoutMethod: 'bank_transfer' | 'upi' | 'wallet';
}

class RazorpayService {
  private razorpay: Razorpay;
  private webhookSecret: string;

  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || '',
      key_secret: process.env.RAZORPAY_KEY_SECRET || '',
    });
    this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  }

  // Create payment order for various services
  async createPaymentOrder(
    userId: string,
    amount: number,
    productType: PaymentOrder['productType'],
    metadata?: any,
  ): Promise<PaymentOrder> {
    const receipt = `${productType}_${userId}_${Date.now()}`;

    const orderOptions = {
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt,
      notes: {
        userId,
        productType,
        ...metadata,
      },
    };

    try {
      const order = await this.razorpay.orders.create(orderOptions);

      const paymentOrder: PaymentOrder = {
        orderId: order.id,
        amount: amount,
        currency: 'INR',
        receipt,
        status: 'created',
        createdAt: new Date().toISOString(),
        userId,
        productType,
      };

      // Store payment order
      await this.storePaymentOrder(paymentOrder);

      return paymentOrder;
    } catch (error) {
      console.error('Payment order creation failed:', error);
      throw new Error('Failed to create payment order');
    }
  }

  // Create subscription order
  async createSubscriptionOrder(userId: string, planType: 'pro' | 'premium'): Promise<PaymentOrder> {
    const amounts = {
      pro: 499,
      premium: 999,
    };

    const amount = amounts[planType];

    return await this.createPaymentOrder(
      userId,
      amount,
      'subscription',
      { planType, duration: 'monthly' },
    );
  }

  // Create valuation report payment
  async createValuationPayment(userId: string, businessId: string, reportType: 'basic' | 'premium'): Promise<PaymentOrder> {
    const amounts = {
      basic: 199,
      premium: 499,
    };

    const amount = amounts[reportType];

    return await this.createPaymentOrder(
      userId,
      amount,
      'valuation',
      { businessId, reportType },
    );
  }

  // Create matchmaking report payment
  async createMatchmakingPayment(userId: string, requestId: string): Promise<PaymentOrder> {
    return await this.createPaymentOrder(
      userId,
      99,
      'matchmaking',
      { requestId },
    );
  }

  // Verify payment signature
  verifyPaymentSignature(paymentId: string, orderId: string, signature: string): boolean {
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', this.razorpay.key_secret)
      .update(body.toString())
      .digest('hex');

    return expectedSignature === signature;
  }

  // Handle payment success
  async handlePaymentSuccess(paymentId: string, orderId: string, signature: string): Promise<void> {
    // Verify signature
    if (!this.verifyPaymentSignature(paymentId, orderId, signature)) {
      throw new Error('Invalid payment signature');
    }

    // Get payment order
    const paymentOrder = await this.getPaymentOrder(orderId);
    if (!paymentOrder) {
      throw new Error('Payment order not found');
    }

    // Update payment status
    await this.updatePaymentStatus(orderId, 'paid');

    // Process based on product type
    switch (paymentOrder.productType) {
    case 'subscription':
      await this.processSubscriptionPayment(paymentOrder);
      break;
    case 'valuation':
      await this.processValuationPayment(paymentOrder);
      break;
    case 'matchmaking':
      await this.processMatchmakingPayment(paymentOrder);
      break;
    default:
      console.warn('Unknown product type:', paymentOrder.productType);
    }
  }

  // Escrow management
  async createEscrowAccount(
    transactionId: string,
    amount: number,
    buyerId: string,
    sellerId: string,
    agentId?: string,
  ): Promise<EscrowAccount> {
    const escrowAccount: EscrowAccount = {
      id: `escrow_${Date.now()}`,
      transactionId,
      amount,
      buyerId,
      sellerId,
      agentId,
      status: 'created',
      createdAt: new Date().toISOString(),
    };

    // Store escrow account
    await this.storeEscrowAccount(escrowAccount);

    return escrowAccount;
  }

  async fundEscrowAccount(escrowId: string, paymentId: string): Promise<void> {
    const escrowAccount = await this.getEscrowAccount(escrowId);
    if (!escrowAccount) {
      throw new Error('Escrow account not found');
    }

    // Update escrow status
    await this.updateEscrowStatus(escrowId, 'funded');

    // Add to queue for processing
    await queueManager.addNotification('escrow', 'account_funded', {
      escrowId,
      paymentId,
      amount: escrowAccount.amount,
    });
  }

  async releaseEscrowFunds(escrowId: string, releaseReason: string): Promise<void> {
    const escrowAccount = await this.getEscrowAccount(escrowId);
    if (!escrowAccount) {
      throw new Error('Escrow account not found');
    }

    if (escrowAccount.status !== 'funded') {
      throw new Error('Escrow account not funded');
    }

    // Calculate splits
    const splits = await this.calculateEscrowSplits(escrowAccount);

    // Create payout requests
    await this.createPayoutRequests(escrowAccount, splits);

    // Update escrow status
    await this.updateEscrowStatus(escrowId, 'released');

    // Add to queue for processing
    await queueManager.addNotification('escrow', 'funds_released', {
      escrowId,
      releaseReason,
      splits,
    });
  }

  // Agent payout system
  async createAgentPayout(
    agentId: string,
    amount: number,
    commission: number,
    transactionId: string,
    payoutMethod: AgentPayout['payoutMethod'],
  ): Promise<AgentPayout> {
    const payout: AgentPayout = {
      id: `payout_${Date.now()}`,
      agentId,
      amount,
      commission,
      transactionId,
      status: 'pending',
      requestedAt: new Date().toISOString(),
      payoutMethod,
    };

    // Store payout request
    await this.storeAgentPayout(payout);

    // Add to queue for processing
    await queueManager.addNotification('payouts', 'agent_payout_requested', payout);

    return payout;
  }

  async processAgentPayouts(): Promise<void> {
    const pendingPayouts = await this.getPendingPayouts();

    for (const payout of pendingPayouts) {
      try {
        await this.processIndividualPayout(payout);
      } catch (error) {
        console.error(`Failed to process payout ${payout.id}:`, error);
        await this.updatePayoutStatus(payout.id, 'failed');
      }
    }
  }

  private async processIndividualPayout(payout: AgentPayout): Promise<void> {
    // Update status to processing
    await this.updatePayoutStatus(payout.id, 'processing');

    // Get agent bank details
    const agent = await storage.getAgentById(payout.agentId);
    if (!agent || !agent.bankDetails) {
      throw new Error('Agent bank details not found');
    }

    // Create Razorpay contact and fund account
    const contact = await this.createRazorpayContact(agent);
    const fundAccount = await this.createRazorpayFundAccount(contact.id, agent.bankDetails);

    // Create payout
    const razorpayPayout = await this.razorpay.payouts.create({
      account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
      fund_account_id: fundAccount.id,
      amount: payout.amount * 100, // Convert to paise
      currency: 'INR',
      mode: payout.payoutMethod === 'bank_transfer' ? 'IMPS' : 'UPI',
      purpose: 'payout',
      notes: {
        agentId: payout.agentId,
        payoutId: payout.id,
        transactionId: payout.transactionId,
      },
    });

    // Update payout status
    await this.updatePayoutStatus(payout.id, 'completed');

    // Notify agent
    await queueManager.addNotification(payout.agentId, 'payout_completed', {
      payoutId: payout.id,
      amount: payout.amount,
      razorpayPayoutId: razorpayPayout.id,
    });
  }

  // Webhook handler
  async handleWebhook(body: any, signature: string): Promise<void> {
    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(JSON.stringify(body))
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new Error('Invalid webhook signature');
    }

    const event = body.event;
    const payload = body.payload;

    switch (event) {
    case 'payment.captured':
      await this.handlePaymentCaptured(payload.payment.entity);
      break;
    case 'payment.failed':
      await this.handlePaymentFailed(payload.payment.entity);
      break;
    case 'payout.processed':
      await this.handlePayoutProcessed(payload.payout.entity);
      break;
    case 'payout.failed':
      await this.handlePayoutFailed(payload.payout.entity);
      break;
    default:
      console.log('Unhandled webhook event:', event);
    }
  }

  // Revenue analytics
  async getRevenueAnalytics(period: string = '30d'): Promise<any> {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
    case '7d':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(endDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(endDate.getDate() - 90);
      break;
    default:
      startDate.setDate(endDate.getDate() - 30);
    }

    // Mock analytics data - in production, query actual transactions
    return {
      period,
      totalRevenue: 2567800,
      subscriptionRevenue: 1234500,
      valuationRevenue: 567800,
      matchmakingRevenue: 234500,
      escrowFees: 531000,
      agentCommissions: 456700,
      netRevenue: 2111100,
      transactions: 1247,
      avgTransactionValue: 2058,
      revenueBySource: {
        subscriptions: 48.1,
        valuations: 22.1,
        matchmaking: 9.1,
        escrowFees: 20.7,
      },
      monthlyGrowth: 15.8,
      churnRate: 3.2,
      ltv: 8750,
      cac: 1250,
    };
  }

  // Private helper methods
  private async storePaymentOrder(order: PaymentOrder): Promise<void> {
    // Store in database
    console.log('Storing payment order:', order.orderId);
  }

  private async getPaymentOrder(orderId: string): Promise<PaymentOrder | null> {
    // Retrieve from database
    console.log('Getting payment order:', orderId);
    return null;
  }

  private async updatePaymentStatus(orderId: string, status: PaymentOrder['status']): Promise<void> {
    // Update in database
    console.log('Updating payment status:', orderId, status);
  }

  private async processSubscriptionPayment(order: PaymentOrder): Promise<void> {
    // Process subscription activation
    await queueManager.addNotification(order.userId, 'subscription_activated', {
      orderId: order.orderId,
      planType: 'pro', // Extract from order notes
    });
  }

  private async processValuationPayment(order: PaymentOrder): Promise<void> {
    // Generate valuation report
    await queueManager.addDocumentGeneration(
      'valuation_report',
      { businessId: 'extracted_from_order' },
      order.userId,
    );
  }

  private async processMatchmakingPayment(order: PaymentOrder): Promise<void> {
    // Generate matchmaking report
    await queueManager.addMatchmaking(order.userId, { premium: true });
  }

  private async storeEscrowAccount(account: EscrowAccount): Promise<void> {
    // Store in database
    console.log('Storing escrow account:', account.id);
  }

  private async getEscrowAccount(escrowId: string): Promise<EscrowAccount | null> {
    // Retrieve from database
    console.log('Getting escrow account:', escrowId);
    return null;
  }

  private async updateEscrowStatus(escrowId: string, status: EscrowAccount['status']): Promise<void> {
    // Update in database
    console.log('Updating escrow status:', escrowId, status);
  }

  private async calculateEscrowSplits(account: EscrowAccount) {
    const platformFee = account.amount * 0.02; // 2% platform fee
    const agentCommission = account.agentId ? account.amount * 0.03 : 0; // 3% agent commission
    const sellerAmount = account.amount - platformFee - agentCommission;

    return {
      platform: platformFee,
      agent: agentCommission,
      seller: sellerAmount,
    };
  }

  private async createPayoutRequests(account: EscrowAccount, splits: any): Promise<void> {
    // Create payout requests for seller and agent
    if (account.agentId && splits.agent > 0) {
      await this.createAgentPayout(
        account.agentId,
        splits.agent,
        splits.agent,
        account.transactionId,
        'bank_transfer',
      );
    }
  }

  private async storeAgentPayout(payout: AgentPayout): Promise<void> {
    // Store in database
    console.log('Storing agent payout:', payout.id);
  }

  private async getPendingPayouts(): Promise<AgentPayout[]> {
    // Retrieve from database
    console.log('Getting pending payouts');
    return [];
  }

  private async updatePayoutStatus(payoutId: string, status: AgentPayout['status']): Promise<void> {
    // Update in database
    console.log('Updating payout status:', payoutId, status);
  }

  private async createRazorpayContact(agent: any) {
    return await this.razorpay.contacts.create({
      name: agent.name,
      email: agent.email,
      contact: agent.phone,
      type: 'vendor',
    });
  }

  private async createRazorpayFundAccount(contactId: string, bankDetails: any) {
    return await this.razorpay.fund_accounts.create({
      contact_id: contactId,
      account_type: 'bank_account',
      bank_account: {
        name: bankDetails.accountHolderName,
        account_number: bankDetails.accountNumber,
        ifsc: bankDetails.ifscCode,
      },
    });
  }

  private async handlePaymentCaptured(payment: any): Promise<void> {
    console.log('Payment captured:', payment.id);
    await this.updatePaymentStatus(payment.order_id, 'paid');
  }

  private async handlePaymentFailed(payment: any): Promise<void> {
    console.log('Payment failed:', payment.id);
    await this.updatePaymentStatus(payment.order_id, 'failed');
  }

  private async handlePayoutProcessed(payout: any): Promise<void> {
    console.log('Payout processed:', payout.id);
    // Update payout status in database
  }

  private async handlePayoutFailed(payout: any): Promise<void> {
    console.log('Payout failed:', payout.id);
    // Update payout status and notify agent
  }
}

export const razorpayService = new RazorpayService();
export { PaymentOrder, EscrowAccount, AgentPayout };
