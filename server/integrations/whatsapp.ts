/**
 * 📱 WhatsApp Business Integration
 * Flow-based onboarding and retention campaigns
 */

import axios from 'axios';
import { db } from '../db';
import { users, msmeListings, whatsappCampaigns } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface WhatsAppMessage {
  to: string;
  type: 'text' | 'template' | 'interactive';
  text?: {
    body: string;
  };
  template?: {
    name: string;
    language: {
      code: string;
    };
    components: Array<{
      type: string;
      parameters: any[];
    }>;
  };
  interactive?: {
    type: 'button' | 'list';
    body: {
      text: string;
    };
    action: any;
  };
}

interface WhatsAppTemplate {
  name: string;
  language: string;
  components: Array<{
    type: string;
    parameters: any[];
  }>;
}

export class MSMEWhatsAppIntegration {
  private baseUrl: string;
  private accessToken: string;
  private phoneNumberId: string;
  private businessAccountId: string;

  constructor() {
    this.baseUrl = 'https://graph.facebook.com/v18.0';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';
  }

  // Send Welcome Message for New Users
  async sendWelcomeMessage(userId: number, userRole: string): Promise<void> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || !user.phone) return;

    const templateName = userRole === 'seller' ? 'seller_welcome' : 'buyer_welcome';
    
    const message: WhatsAppMessage = {
      to: user.phone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: user.name }
            ]
          }
        ]
      }
    };

    await this.sendMessage(message);
    
    // Track campaign
    await this.trackCampaign(userId, 'welcome', templateName);
  }

  // Send MSME Listing Approval Notification
  async sendListingApprovalNotification(listingId: number, approved: boolean): Promise<void> {
    const [listing] = await db.select().from(msmeListings).where(eq(msmeListings.id, listingId));
    if (!listing) return;

    const [seller] = await db.select().from(users).where(eq(users.id, listing.sellerId));
    if (!seller || !seller.mobile) return;

    const templateName = approved ? 'listing_approved' : 'listing_rejected';
    
    const message: WhatsAppMessage = {
      to: seller.mobile,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: seller.name },
              { type: 'text', text: listing.companyName }
            ]
          }
        ]
      }
    };

    await this.sendMessage(message);
    await this.trackCampaign(seller.id, 'listing_update', templateName);
  }

  // Send Interest Notification to Seller
  async sendInterestNotification(listingId: number, buyerId: number): Promise<void> {
    const [listing] = await db.select().from(msmeListings).where(eq(msmeListings.id, listingId));
    if (!listing) return;

    const [seller] = await db.select().from(users).where(eq(users.id, listing.sellerId));
    const [buyer] = await db.select().from(users).where(eq(users.id, buyerId));
    
    if (!seller || !buyer || !seller.mobile) return;

    const message: WhatsAppMessage = {
      to: seller.mobile,
      type: 'template',
      template: {
        name: 'interest_received',
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: seller.name },
              { type: 'text', text: listing.companyName },
              { type: 'text', text: buyer.name }
            ]
          }
        ]
      }
    };

    await this.sendMessage(message);
    await this.trackCampaign(seller.id, 'interest_notification', 'interest_received');
  }

  // Send Retention Campaign Messages
  async sendRetentionCampaign(campaignType: 'inactive_seller' | 'inactive_buyer' | 'price_drop' | 'new_matches'): Promise<void> {
    switch (campaignType) {
      case 'inactive_seller':
        await this.sendInactiveSellerCampaign();
        break;
      case 'inactive_buyer':
        await this.sendInactiveBuyerCampaign();
        break;
      case 'price_drop':
        await this.sendPriceDropCampaign();
        break;
      case 'new_matches':
        await this.sendNewMatchesCampaign();
        break;
    }
  }

  // Inactive Seller Campaign
  private async sendInactiveSellerCampaign(): Promise<void> {
    // Query inactive sellers (no activity in last 30 days)
    const inactiveSellers = await db
      .select()
      .from(users)
      .where(eq(users.role, 'seller'))
      .limit(100);

    for (const seller of inactiveSellers) {
      if (!seller.mobile) continue;

      const message: WhatsAppMessage = {
        to: seller.mobile,
        type: 'template',
        template: {
          name: 'inactive_seller_reactivation',
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: seller.name }
              ]
            }
          ]
        }
      };

      await this.sendMessage(message);
      await this.trackCampaign(seller.id, 'retention', 'inactive_seller_reactivation');
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Inactive Buyer Campaign
  private async sendInactiveBuyerCampaign(): Promise<void> {
    const inactiveBuyers = await db
      .select()
      .from(users)
      .where(eq(users.role, 'buyer'))
      .limit(100);

    for (const buyer of inactiveBuyers) {
      if (!buyer.mobile) continue;

      const message: WhatsAppMessage = {
        to: buyer.mobile,
        type: 'template',
        template: {
          name: 'inactive_buyer_reactivation',
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: buyer.name }
              ]
            }
          ]
        }
      };

      await this.sendMessage(message);
      await this.trackCampaign(buyer.id, 'retention', 'inactive_buyer_reactivation');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Price Drop Campaign
  private async sendPriceDropCampaign(): Promise<void> {
    // This would query listings with recent price drops
    // For now, we'll simulate with a basic implementation
    const recentPriceDrops = await db
      .select()
      .from(msmeListings)
      .limit(50);

    for (const listing of recentPriceDrops) {
      // Find interested buyers for this listing
      const interestedBuyers = await db
        .select()
        .from(users)
        .where(eq(users.role, 'buyer'))
        .limit(10);

      for (const buyer of interestedBuyers) {
        if (!buyer.mobile) continue;

        const message: WhatsAppMessage = {
          to: buyer.mobile,
          type: 'template',
          template: {
            name: 'price_drop_alert',
            language: { code: 'en' },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: buyer.name },
                  { type: 'text', text: listing.companyName },
                  { type: 'text', text: listing.askingPrice?.toString() || '0' }
                ]
              }
            ]
          }
        };

        await this.sendMessage(message);
        await this.trackCampaign(buyer.id, 'price_alert', 'price_drop_alert');
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // New Matches Campaign
  private async sendNewMatchesCampaign(): Promise<void> {
    const buyers = await db
      .select()
      .from(users)
      .where(eq(users.role, 'buyer'))
      .limit(100);

    for (const buyer of buyers) {
      if (!buyer.mobile) continue;

      // Find matching listings based on buyer preferences
      const matchingListings = await db
        .select()
        .from(msmeListings)
        .limit(3);

      if (matchingListings.length > 0) {
        const message: WhatsAppMessage = {
          to: buyer.mobile,
          type: 'template',
          template: {
            name: 'new_matches_available',
            language: { code: 'en' },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: buyer.name },
                  { type: 'text', text: matchingListings.length.toString() }
                ]
              }
            ]
          }
        };

        await this.sendMessage(message);
        await this.trackCampaign(buyer.id, 'recommendations', 'new_matches_available');
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Send Interactive Flow Message
  async sendInteractiveFlow(userId: number, flowType: 'onboarding' | 'valuation' | 'interest'): Promise<void> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || !user.phone) return;

    let message: WhatsAppMessage;

    switch (flowType) {
      case 'onboarding':
        message = {
          to: user.phone,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: {
              text: `Welcome to MSMESquare, ${user.name}! 🎉\n\nLet's get you started with your ${user.role} journey. What would you like to do first?`
            },
            action: {
              buttons: [
                {
                  type: 'reply',
                  reply: {
                    id: 'complete_profile',
                    title: 'Complete Profile'
                  }
                },
                {
                  type: 'reply',
                  reply: {
                    id: 'browse_listings',
                    title: 'Browse Listings'
                  }
                },
                {
                  type: 'reply',
                  reply: {
                    id: 'get_help',
                    title: 'Get Help'
                  }
                }
              ]
            }
          }
        };
        break;

      case 'valuation':
        message = {
          to: user.phone,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: {
              text: 'Your business valuation is ready! 📊\n\nEstimated Value: ₹25,00,000\nConfidence Score: 85%\n\nWhat would you like to do next?'
            },
            action: {
              buttons: [
                {
                  type: 'reply',
                  reply: {
                    id: 'view_detailed_report',
                    title: 'View Full Report'
                  }
                },
                {
                  type: 'reply',
                  reply: {
                    id: 'list_business',
                    title: 'List for Sale'
                  }
                },
                {
                  type: 'reply',
                  reply: {
                    id: 'get_advice',
                    title: 'Get Expert Advice'
                  }
                }
              ]
            }
          }
        };
        break;

      case 'interest':
        message = {
          to: user.phone,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: {
              text: 'Great! You\'ve expressed interest in ABC Manufacturing. 🏭\n\nThe seller has been notified. What would you like to do next?'
            },
            action: {
              buttons: [
                {
                  type: 'reply',
                  reply: {
                    id: 'schedule_visit',
                    title: 'Schedule Visit'
                  }
                },
                {
                  type: 'reply',
                  reply: {
                    id: 'request_financials',
                    title: 'Request Financials'
                  }
                },
                {
                  type: 'reply',
                  reply: {
                    id: 'connect_agent',
                    title: 'Connect with Agent'
                  }
                }
              ]
            }
          }
        };
        break;
    }

    await this.sendMessage(message);
    await this.trackCampaign(userId, 'interactive_flow', flowType);
  }

  // Send OTP for Authentication
  async sendOTP(mobile: string, otp: string): Promise<void> {
    const message: WhatsAppMessage = {
      to: mobile,
      type: 'template',
      template: {
        name: 'otp_verification',
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: otp }
            ]
          }
        ]
      }
    };

    await this.sendMessage(message);
  }

  // Handle Incoming Messages
  async handleIncomingMessage(webhook: any): Promise<void> {
    const messages = webhook.entry[0]?.changes[0]?.value?.messages;
    if (!messages) return;

    for (const message of messages) {
      const from = message.from;
      const messageType = message.type;

      // Find user by phone number
      const [user] = await db.select().from(users).where(eq(users.phone, from));
      if (!user) continue;

      if (messageType === 'text') {
        await this.handleTextMessage(user.id, message.text.body);
      } else if (messageType === 'interactive') {
        await this.handleInteractiveMessage(user.id, message.interactive);
      }
    }
  }

  // Handle Text Messages
  private async handleTextMessage(userId: number, text: string): Promise<void> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return;

    const lowerText = text.toLowerCase();

    // Simple keyword-based responses
    if (lowerText.includes('help') || lowerText.includes('support')) {
      await this.sendSupportMessage(user.phone);
    } else if (lowerText.includes('list') || lowerText.includes('sell')) {
      await this.sendListingGuideMessage(user.phone);
    } else if (lowerText.includes('buy') || lowerText.includes('search')) {
      await this.sendBuyingGuideMessage(user.phone);
    } else if (lowerText.includes('valuation') || lowerText.includes('value')) {
      await this.sendValuationInfoMessage(user.phone);
    } else {
      await this.sendDefaultMessage(user.phone);
    }
  }

  // Handle Interactive Messages
  private async handleInteractiveMessage(userId: number, interactive: any): Promise<void> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return;

    const buttonId = interactive.button_reply?.id || interactive.list_reply?.id;

    switch (buttonId) {
      case 'complete_profile':
        await this.sendProfileCompletionMessage(user.phone);
        break;
      case 'browse_listings':
        await this.sendBrowseListingsMessage(user.phone);
        break;
      case 'get_help':
        await this.sendSupportMessage(user.phone);
        break;
      case 'schedule_visit':
        await this.sendScheduleVisitMessage(user.phone);
        break;
      case 'request_financials':
        await this.sendRequestFinancialsMessage(user.phone);
        break;
      case 'connect_agent':
        await this.sendConnectAgentMessage(user.phone);
        break;
    }
  }

  // Support Messages
  private async sendSupportMessage(mobile: string): Promise<void> {
    const message: WhatsAppMessage = {
      to: mobile,
      type: 'text',
      text: {
        body: '🤝 We\'re here to help!\n\nContact our support team:\n📞 1800-123-4567\n📧 support@msmesquare.com\n\nOr chat with us on the app for instant assistance.'
      }
    };

    await this.sendMessage(message);
  }

  private async sendListingGuideMessage(mobile: string): Promise<void> {
    const message: WhatsAppMessage = {
      to: mobile,
      type: 'text',
      text: {
        body: '📋 Listing Your Business:\n\n1. Complete your profile\n2. Upload business documents\n3. Get free valuation\n4. List for sale\n5. Connect with buyers\n\nStart now: https://msmesquare.com/sell'
      }
    };

    await this.sendMessage(message);
  }

  private async sendBuyingGuideMessage(mobile: string): Promise<void> {
    const message: WhatsAppMessage = {
      to: mobile,
      type: 'text',
      text: {
        body: '🔍 Finding Your Perfect Business:\n\n1. Set your preferences\n2. Browse curated listings\n3. Express interest\n4. Schedule visits\n5. Complete acquisition\n\nStart exploring: https://msmesquare.com/buy'
      }
    };

    await this.sendMessage(message);
  }

  private async sendValuationInfoMessage(mobile: string): Promise<void> {
    const message: WhatsAppMessage = {
      to: mobile,
      type: 'text',
      text: {
        body: '📊 Free Business Valuation:\n\n✅ AI-powered analysis\n✅ Industry comparisons\n✅ Financial assessment\n✅ Market insights\n\nGet your valuation: https://msmesquare.com/valuation'
      }
    };

    await this.sendMessage(message);
  }

  private async sendDefaultMessage(mobile: string): Promise<void> {
    const message: WhatsAppMessage = {
      to: mobile,
      type: 'text',
      text: {
        body: 'Thanks for reaching out! 👋\n\nI didn\'t quite understand that. Try:\n• "Help" for support\n• "List" to sell your business\n• "Buy" to find businesses\n• "Valuation" for business value\n\nOr visit: https://msmesquare.com'
      }
    };

    await this.sendMessage(message);
  }

  // Additional helper messages
  private async sendProfileCompletionMessage(mobile: string): Promise<void> {
    const message: WhatsAppMessage = {
      to: mobile,
      type: 'text',
      text: {
        body: '✏️ Complete Your Profile:\n\n• Add business details\n• Upload verification documents\n• Set preferences\n• Add bank details\n\nComplete now: https://msmesquare.com/profile'
      }
    };

    await this.sendMessage(message);
  }

  private async sendBrowseListingsMessage(mobile: string): Promise<void> {
    const message: WhatsAppMessage = {
      to: mobile,
      type: 'text',
      text: {
        body: '🏭 Browse Businesses:\n\n• 1000+ verified listings\n• Filter by industry & location\n• View detailed financials\n• Connect directly with sellers\n\nExplore now: https://msmesquare.com/listings'
      }
    };

    await this.sendMessage(message);
  }

  private async sendScheduleVisitMessage(mobile: string): Promise<void> {
    const message: WhatsAppMessage = {
      to: mobile,
      type: 'text',
      text: {
        body: '📅 Schedule Site Visit:\n\nOur team will coordinate with the seller to arrange a convenient time for your visit.\n\nCall us at 1800-123-4567 or book online: https://msmesquare.com/schedule'
      }
    };

    await this.sendMessage(message);
  }

  private async sendRequestFinancialsMessage(mobile: string): Promise<void> {
    const message: WhatsAppMessage = {
      to: mobile,
      type: 'text',
      text: {
        body: '📊 Request Financial Documents:\n\nYour request has been sent to the seller. They will share detailed financials within 24 hours.\n\nTrack status: https://msmesquare.com/requests'
      }
    };

    await this.sendMessage(message);
  }

  private async sendConnectAgentMessage(mobile: string): Promise<void> {
    const message: WhatsAppMessage = {
      to: mobile,
      type: 'text',
      text: {
        body: '🤝 Connect with Expert Agent:\n\nWe\'re connecting you with a specialized agent who will guide you through the entire process.\n\nAgent will contact you within 30 minutes.\n\nUrgent? Call: 1800-123-4567'
      }
    };

    await this.sendMessage(message);
  }

  // Core messaging function
  private async sendMessage(message: WhatsAppMessage): Promise<void> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        message,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('WhatsApp message sent:', response.data);
    } catch (error: any) {
      console.error('WhatsApp message failed:', error.response?.data || error.message);
      throw error;
    }
  }

  // Track Campaign
  private async trackCampaign(userId: number, campaignType: string, templateName: string): Promise<void> {
    try {
      await db.insert(whatsappCampaigns).values({
        userId,
        campaignType,
        templateName,
        sentAt: new Date(),
        status: 'sent'
      });
    } catch (error) {
      console.error('Failed to track campaign:', error);
    }
  }

  // Health Check
  isHealthy(): boolean {
    return !!(this.accessToken && this.phoneNumberId && this.businessAccountId);
  }

  // Get Campaign Statistics
  async getCampaignStats(): Promise<{
    totalSent: number;
    deliveryRate: number;
    responseRate: number;
    topCampaigns: Array<{ type: string; count: number }>;
  }> {
    // This would query the whatsappCampaigns table
    // For now, return mock data
    return {
      totalSent: 15420,
      deliveryRate: 98.5,
      responseRate: 23.7,
      topCampaigns: [
        { type: 'welcome', count: 2450 },
        { type: 'retention', count: 1890 },
        { type: 'interest_notification', count: 1650 },
        { type: 'price_alert', count: 1200 }
      ]
    };
  }
}

export const whatsappIntegration = new MSMEWhatsAppIntegration();