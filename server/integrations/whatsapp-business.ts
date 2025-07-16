/**
 * WhatsApp Business API Integration
 * Handles flow-based onboarding, retention campaigns, and chat-led user acquisition
 */

import axios from 'axios';
import { db } from '../db';
import { users, notificationHistory } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface WhatsAppMessage {
  to: string;
  type: 'text' | 'template' | 'interactive';
  text?: { body: string };
  template?: {
    name: string;
    language: { code: string };
    components: any[];
  };
  interactive?: {
    type: 'button' | 'list';
    body: { text: string };
    action: any;
  };
}

interface WhatsAppTemplate {
  name: string;
  language: string;
  components: any[];
}

export class WhatsAppBusinessService {
  private accessToken: string;
  private phoneNumberId: string;
  private businessAccountId: string;
  private apiUrl: string;

  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';
    this.apiUrl = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;
  }

  /**
   * Send WhatsApp message
   */
  async sendMessage(message: WhatsAppMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await axios.post(this.apiUrl, message, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      // Log message to database
      await this.logMessage(message.to, 'sent', message.type, JSON.stringify(message));

      return {
        success: true,
        messageId: response.data.messages[0].id
      };
    } catch (error: any) {
      console.error('WhatsApp send error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Flow-based onboarding system
   */
  async startOnboardingFlow(phoneNumber: string, userRole: string): Promise<void> {
    const welcomeMessage: WhatsAppMessage = {
      to: phoneNumber,
      type: 'template',
      template: {
        name: 'welcome_onboarding',
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: userRole.charAt(0).toUpperCase() + userRole.slice(1) }
            ]
          },
          {
            type: 'button',
            sub_type: 'quick_reply',
            index: 0,
            parameters: [
              { type: 'payload', payload: `start_${userRole}_journey` }
            ]
          }
        ]
      }
    };

    await this.sendMessage(welcomeMessage);
    
    // Schedule follow-up messages
    setTimeout(() => this.sendOnboardingStep2(phoneNumber, userRole), 24 * 60 * 60 * 1000); // 24 hours
  }

  /**
   * Send onboarding step 2 (profile completion)
   */
  async sendOnboardingStep2(phoneNumber: string, userRole: string): Promise<void> {
    const profileMessage: WhatsAppMessage = {
      to: phoneNumber,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: `Complete your ${userRole} profile to unlock premium features:\n\n✅ Verified badge\n✅ Priority support\n✅ Advanced analytics\n\nTap below to continue:`
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
                id: 'remind_later',
                title: 'Remind Later'
              }
            }
          ]
        }
      }
    };

    await this.sendMessage(profileMessage);
  }

  /**
   * Retention campaign system
   */
  async startRetentionCampaign(userId: number): Promise<void> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!user || !user.mobile) return;

    const retentionMessage: WhatsAppMessage = {
      to: user.mobile,
      type: 'template',
      template: {
        name: 'retention_campaign',
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: user.name || 'User' }
            ]
          }
        ]
      }
    };

    await this.sendMessage(retentionMessage);
  }

  /**
   * Send deal notification
   */
  async sendDealNotification(phoneNumber: string, dealDetails: {
    buyerName: string;
    businessName: string;
    amount: number;
    status: string;
  }): Promise<void> {
    const dealMessage: WhatsAppMessage = {
      to: phoneNumber,
      type: 'template',
      template: {
        name: 'deal_notification',
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: dealDetails.buyerName },
              { type: 'text', text: dealDetails.businessName },
              { type: 'currency', currency: 'INR', amount_1000: dealDetails.amount * 1000 }
            ]
          }
        ]
      }
    };

    await this.sendMessage(dealMessage);
  }

  /**
   * Send payment reminder
   */
  async sendPaymentReminder(phoneNumber: string, amount: number, dueDate: string): Promise<void> {
    const paymentMessage: WhatsAppMessage = {
      to: phoneNumber,
      type: 'template',
      template: {
        name: 'payment_reminder',
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'currency', currency: 'INR', amount_1000: amount * 1000 },
              { type: 'text', text: dueDate }
            ]
          }
        ]
      }
    };

    await this.sendMessage(paymentMessage);
  }

  /**
   * Chat-led user acquisition
   */
  async handleIncomingMessage(phoneNumber: string, message: string): Promise<void> {
    const lowercaseMessage = message.toLowerCase();

    if (lowercaseMessage.includes('sell') || lowercaseMessage.includes('business')) {
      await this.sendSellerAcquisitionMessage(phoneNumber);
    } else if (lowercaseMessage.includes('buy') || lowercaseMessage.includes('acquire')) {
      await this.sendBuyerAcquisitionMessage(phoneNumber);
    } else if (lowercaseMessage.includes('agent') || lowercaseMessage.includes('earn')) {
      await this.sendAgentAcquisitionMessage(phoneNumber);
    } else {
      await this.sendGeneralInfoMessage(phoneNumber);
    }
  }

  /**
   * Send seller acquisition message
   */
  async sendSellerAcquisitionMessage(phoneNumber: string): Promise<void> {
    const sellerMessage: WhatsAppMessage = {
      to: phoneNumber,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: '🏢 *Sell Your Business on MSMESquare*\n\n✅ Get verified business valuation\n✅ Connect with serious buyers\n✅ Complete exit documentation\n✅ Secure escrow process\n\n*Join 10,000+ successful sellers*'
        },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: {
                id: 'register_seller',
                title: 'Register as Seller'
              }
            },
            {
              type: 'reply',
              reply: {
                id: 'learn_more',
                title: 'Learn More'
              }
            }
          ]
        }
      }
    };

    await this.sendMessage(sellerMessage);
  }

  /**
   * Send buyer acquisition message
   */
  async sendBuyerAcquisitionMessage(phoneNumber: string): Promise<void> {
    const buyerMessage: WhatsAppMessage = {
      to: phoneNumber,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: '💼 *Buy Verified Businesses*\n\n✅ Pre-verified business listings\n✅ Detailed financial analysis\n✅ Loan facilitation support\n✅ Legal documentation help\n\n*Find your perfect business match*'
        },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: {
                id: 'register_buyer',
                title: 'Register as Buyer'
              }
            },
            {
              type: 'reply',
              reply: {
                id: 'browse_listings',
                title: 'Browse Listings'
              }
            }
          ]
        }
      }
    };

    await this.sendMessage(buyerMessage);
  }

  /**
   * Send agent acquisition message
   */
  async sendAgentAcquisitionMessage(phoneNumber: string): Promise<void> {
    const agentMessage: WhatsAppMessage = {
      to: phoneNumber,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: '🤝 *Become a Business Agent*\n\n💰 Earn ₹50,000+ per deal\n📊 Professional CRM dashboard\n🎯 Quality lead generation\n📈 Performance analytics\n\n*Join our agent network*'
        },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: {
                id: 'register_agent',
                title: 'Become Agent'
              }
            },
            {
              type: 'reply',
              reply: {
                id: 'agent_benefits',
                title: 'View Benefits'
              }
            }
          ]
        }
      }
    };

    await this.sendMessage(agentMessage);
  }

  /**
   * Send general info message
   */
  async sendGeneralInfoMessage(phoneNumber: string): Promise<void> {
    const infoMessage: WhatsAppMessage = {
      to: phoneNumber,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: {
          text: '👋 *Welcome to MSMESquare*\n\nIndia\'s largest MSME marketplace for buying, selling, and financing businesses.\n\nHow can we help you today?'
        },
        action: {
          button: 'Select Option',
          sections: [
            {
              title: 'Get Started',
              rows: [
                {
                  id: 'sell_business',
                  title: 'Sell My Business',
                  description: 'List and sell your business'
                },
                {
                  id: 'buy_business',
                  title: 'Buy a Business',
                  description: 'Find businesses to acquire'
                },
                {
                  id: 'become_agent',
                  title: 'Become an Agent',
                  description: 'Earn by facilitating deals'
                }
              ]
            },
            {
              title: 'Services',
              rows: [
                {
                  id: 'business_valuation',
                  title: 'Business Valuation',
                  description: 'Get professional valuation'
                },
                {
                  id: 'loan_assistance',
                  title: 'Loan Assistance',
                  description: 'Financing support'
                }
              ]
            }
          ]
        }
      }
    };

    await this.sendMessage(infoMessage);
  }

  /**
   * Log message to database
   */
  private async logMessage(phoneNumber: string, direction: 'sent' | 'received', type: string, content: string): Promise<void> {
    try {
      await db.insert(notificationHistory).values({
        channel: 'whatsapp',
        recipient: phoneNumber,
        subject: `WhatsApp ${type} message`,
        content,
        status: direction === 'sent' ? 'sent' : 'received',
        sentAt: new Date()
      });
    } catch (error) {
      console.error('Failed to log WhatsApp message:', error);
    }
  }

  /**
   * Create WhatsApp templates
   */
  async createTemplate(template: WhatsAppTemplate): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${this.businessAccountId}/message_templates`,
        template,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        id: response.data.id
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Get message templates
   */
  async getTemplates(): Promise<any[]> {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${this.businessAccountId}/message_templates`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      return [];
    }
  }

  /**
   * Webhook handler for incoming messages
   */
  async handleWebhook(data: any): Promise<void> {
    const entry = data.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (value?.messages) {
      for (const message of value.messages) {
        const phoneNumber = message.from;
        const messageText = message.text?.body || '';
        const messageType = message.type;

        // Log incoming message
        await this.logMessage(phoneNumber, 'received', messageType, messageText);

        // Handle message based on type
        if (messageType === 'text') {
          await this.handleIncomingMessage(phoneNumber, messageText);
        } else if (messageType === 'interactive') {
          await this.handleInteractiveMessage(phoneNumber, message.interactive);
        }
      }
    }
  }

  /**
   * Handle interactive message responses
   */
  async handleInteractiveMessage(phoneNumber: string, interactive: any): Promise<void> {
    const buttonReply = interactive.button_reply;
    const listReply = interactive.list_reply;

    if (buttonReply) {
      const buttonId = buttonReply.id;
      
      switch (buttonId) {
        case 'register_seller':
          await this.sendRegistrationLink(phoneNumber, 'seller');
          break;
        case 'register_buyer':
          await this.sendRegistrationLink(phoneNumber, 'buyer');
          break;
        case 'register_agent':
          await this.sendRegistrationLink(phoneNumber, 'agent');
          break;
        case 'complete_profile':
          await this.sendProfileCompletionLink(phoneNumber);
          break;
        default:
          await this.sendGeneralInfoMessage(phoneNumber);
      }
    }

    if (listReply) {
      const listId = listReply.id;
      
      switch (listId) {
        case 'sell_business':
          await this.sendSellerAcquisitionMessage(phoneNumber);
          break;
        case 'buy_business':
          await this.sendBuyerAcquisitionMessage(phoneNumber);
          break;
        case 'become_agent':
          await this.sendAgentAcquisitionMessage(phoneNumber);
          break;
        case 'business_valuation':
          await this.sendValuationInfo(phoneNumber);
          break;
        case 'loan_assistance':
          await this.sendLoanInfo(phoneNumber);
          break;
      }
    }
  }

  /**
   * Send registration link
   */
  async sendRegistrationLink(phoneNumber: string, role: string): Promise<void> {
    const registrationMessage: WhatsAppMessage = {
      to: phoneNumber,
      type: 'text',
      text: {
        body: `🎉 *Welcome to MSMESquare!*\n\nClick the link below to complete your ${role} registration:\n\n🔗 https://msmesquare.com/register?role=${role}&source=whatsapp\n\n*Need help?* Reply with "help" anytime.`
      }
    };

    await this.sendMessage(registrationMessage);
  }

  /**
   * Send profile completion link
   */
  async sendProfileCompletionLink(phoneNumber: string): Promise<void> {
    const profileMessage: WhatsAppMessage = {
      to: phoneNumber,
      type: 'text',
      text: {
        body: `📝 *Complete Your Profile*\n\nFinish setting up your profile to unlock all features:\n\n🔗 https://msmesquare.com/profile/complete\n\n*Get verified faster and access premium features!*`
      }
    };

    await this.sendMessage(profileMessage);
  }

  /**
   * Send valuation info
   */
  async sendValuationInfo(phoneNumber: string): Promise<void> {
    const valuationMessage: WhatsAppMessage = {
      to: phoneNumber,
      type: 'text',
      text: {
        body: `💰 *Business Valuation Service*\n\n✅ AI-powered valuation\n✅ Professional certificate\n✅ Detailed report\n\nPricing:\n• Basic: ₹999\n• Premium: ₹2,499\n\n🔗 Get started: https://msmesquare.com/valuation`
      }
    };

    await this.sendMessage(valuationMessage);
  }

  /**
   * Send loan info
   */
  async sendLoanInfo(phoneNumber: string): Promise<void> {
    const loanMessage: WhatsAppMessage = {
      to: phoneNumber,
      type: 'text',
      text: {
        body: `🏦 *Business Loan Assistance*\n\n✅ Pre-approved offers\n✅ Competitive rates\n✅ Quick processing\n✅ Minimal documentation\n\nPartner NBFCs:\n• Up to ₹10 crores\n• 10-15% interest rates\n\n🔗 Apply now: https://msmesquare.com/loans`
      }
    };

    await this.sendMessage(loanMessage);
  }
}

export const whatsappService = new WhatsAppBusinessService();