// WhatsApp Business API integration for flow-based onboarding
import axios from 'axios';
import { queueManager } from '../infrastructure/queue-system';

interface WhatsAppMessage {
  to: string;
  type: 'text' | 'template' | 'interactive' | 'document';
  content: any;
}

interface WhatsAppTemplate {
  name: string;
  language: string;
  components: any[];
}

interface WhatsAppFlow {
  id: string;
  name: string;
  steps: FlowStep[];
  triggers: string[];
}

interface FlowStep {
  id: string;
  type: 'message' | 'menu' | 'form' | 'action';
  content: any;
  nextStep?: string;
  conditions?: Record<string, any>;
}

class WhatsAppService {
  private baseUrl: string;
  private accessToken: string;
  private phoneNumberId: string;
  private webhookToken: string;

  constructor() {
    this.baseUrl = 'https://graph.facebook.com/v18.0';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.webhookToken = process.env.WHATSAPP_WEBHOOK_TOKEN || '';
  }

  // Send WhatsApp message
  async sendMessage(message: WhatsAppMessage): Promise<boolean> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: message.to,
          type: message.type,
          [message.type]: message.content,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`WhatsApp message sent to ${message.to}:`, response.data);
      return true;
    } catch (error) {
      console.error('WhatsApp message failed:', error.response?.data || error.message);
      return false;
    }
  }

  // Send template message
  async sendTemplate(to: string, template: WhatsAppTemplate): Promise<boolean> {
    const message: WhatsAppMessage = {
      to,
      type: 'template',
      content: {
        name: template.name,
        language: { code: template.language },
        components: template.components,
      },
    };

    return await this.sendMessage(message);
  }

  // Send interactive menu
  async sendInteractiveMenu(to: string, title: string, options: Array<{id: string, title: string}>): Promise<boolean> {
    const message: WhatsAppMessage = {
      to,
      type: 'interactive',
      content: {
        type: 'button',
        body: { text: title },
        action: {
          buttons: options.map(option => ({
            type: 'reply',
            reply: { id: option.id, title: option.title },
          })),
        },
      },
    };

    return await this.sendMessage(message);
  }

  // Send document (PDF reports)
  async sendDocument(to: string, documentUrl: string, filename: string, caption?: string): Promise<boolean> {
    const message: WhatsAppMessage = {
      to,
      type: 'document',
      content: {
        link: documentUrl,
        filename,
        caption,
      },
    };

    return await this.sendMessage(message);
  }

  // MSME onboarding flow
  async startMSMEOnboarding(phoneNumber: string, userType: 'seller' | 'buyer'): Promise<void> {
    const welcomeTemplate = {
      name: 'msme_welcome',
      language: 'en',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: userType === 'seller' ? 'Seller' : 'Buyer' }
          ],
        },
      ],
    };

    await this.sendTemplate(phoneNumber, welcomeTemplate);

    // Send interactive menu for next steps
    await this.sendInteractiveMenu(
      phoneNumber,
      `Welcome to MSMESquare! As a ${userType}, what would you like to do?`,
      userType === 'seller' ? [
        { id: 'list_business', title: 'List My Business' },
        { id: 'get_valuation', title: 'Get Business Valuation' },
        { id: 'view_inquiries', title: 'View Buyer Inquiries' },
        { id: 'contact_agent', title: 'Contact Agent' },
      ] : [
        { id: 'browse_listings', title: 'Browse Businesses' },
        { id: 'saved_searches', title: 'My Saved Searches' },
        { id: 'schedule_viewing', title: 'Schedule Viewing' },
        { id: 'contact_agent', title: 'Contact Agent' },
      ]
    );
  }

  // Agent onboarding flow
  async startAgentOnboarding(phoneNumber: string, agentName: string): Promise<void> {
    const welcomeMessage = `Welcome to MSMESquare, ${agentName}! 🎉

Let's get you started with your agent dashboard. You can:

📊 Track your earnings and commissions
🏢 Manage your client portfolio
💰 View payout status
📈 Access performance analytics`;

    await this.sendMessage({
      to: phoneNumber,
      type: 'text',
      content: { body: welcomeMessage },
    });

    await this.sendInteractiveMenu(
      phoneNumber,
      'What would you like to do first?',
      [
        { id: 'setup_profile', title: 'Complete Profile Setup' },
        { id: 'view_dashboard', title: 'View Agent Dashboard' },
        { id: 'find_clients', title: 'Find Potential Clients' },
        { id: 'training_resources', title: 'Training Resources' },
      ]
    );
  }

  // NBFC onboarding flow
  async startNBFCOnboarding(phoneNumber: string, institutionName: string): Promise<void> {
    const welcomeMessage = `Welcome to MSMESquare, ${institutionName}! 🏦

As an NBFC partner, you can:

📋 Upload loan products
🔍 Review loan applications
💼 Manage your lending portfolio
📊 Access market insights`;

    await this.sendMessage({
      to: phoneNumber,
      type: 'text',
      content: { body: welcomeMessage },
    });

    await this.sendInteractiveMenu(
      phoneNumber,
      'Let\'s get you set up:',
      [
        { id: 'upload_products', title: 'Upload Loan Products' },
        { id: 'compliance_check', title: 'Complete Compliance' },
        { id: 'setup_criteria', title: 'Set Lending Criteria' },
        { id: 'view_applications', title: 'View Applications' },
      ]
    );
  }

  // Retention flow for unmatched users
  async sendRetentionMessage(phoneNumber: string, userType: 'buyer' | 'seller', daysSinceLastActivity: number): Promise<void> {
    let message = '';
    let options: Array<{id: string, title: string}> = [];

    if (userType === 'buyer') {
      message = `Hi! It's been ${daysSinceLastActivity} days since your last visit. 

New businesses matching your criteria are available! 🏢

Don't miss out on great opportunities.`;
      
      options = [
        { id: 'view_new_listings', title: 'View New Listings' },
        { id: 'update_preferences', title: 'Update Preferences' },
        { id: 'schedule_call', title: 'Schedule Call' },
      ];
    } else {
      message = `Hi! It's been ${daysSinceLastActivity} days since your last visit.

${daysSinceLastActivity > 7 ? 'Multiple buyers' : 'New buyers'} are looking for businesses like yours! 💰

Increase your visibility now.`;
      
      options = [
        { id: 'boost_listing', title: 'Boost My Listing' },
        { id: 'update_details', title: 'Update Business Details' },
        { id: 'view_inquiries', title: 'View Buyer Inquiries' },
      ];
    }

    await this.sendMessage({
      to: phoneNumber,
      type: 'text',
      content: { body: message },
    });

    await this.sendInteractiveMenu(phoneNumber, 'What would you like to do?', options);
  }

  // Send valuation report
  async sendValuationReport(phoneNumber: string, businessName: string, reportUrl: string): Promise<void> {
    const message = `📊 Your business valuation report for "${businessName}" is ready!

💰 Get detailed insights into your business value
📈 Market analysis and recommendations
🎯 Strategies to increase valuation

Download your comprehensive report below:`;

    await this.sendMessage({
      to: phoneNumber,
      type: 'text',
      content: { body: message },
    });

    await this.sendDocument(
      phoneNumber,
      reportUrl,
      `${businessName}_Valuation_Report.pdf`,
      'Your comprehensive business valuation report'
    );
  }

  // Send payment reminder
  async sendPaymentReminder(phoneNumber: string, amount: number, purpose: string): Promise<void> {
    const message = `💳 Payment Reminder

Amount: ₹${amount.toLocaleString()}
Purpose: ${purpose}

Complete your payment to continue accessing premium features.`;

    await this.sendMessage({
      to: phoneNumber,
      type: 'text',
      content: { body: message },
    });

    await this.sendInteractiveMenu(
      phoneNumber,
      'Choose payment method:',
      [
        { id: 'pay_now', title: 'Pay Now' },
        { id: 'payment_help', title: 'Payment Help' },
        { id: 'contact_support', title: 'Contact Support' },
      ]
    );
  }

  // Send transaction updates
  async sendTransactionUpdate(phoneNumber: string, transactionId: string, status: string, details: any): Promise<void> {
    const statusEmojis = {
      'initiated': '🔄',
      'in_progress': '⏳',
      'completed': '✅',
      'failed': '❌',
      'cancelled': '🚫',
    };

    const message = `${statusEmojis[status] || '📄'} Transaction Update

Transaction ID: ${transactionId}
Status: ${status.toUpperCase()}

${details.message || 'No additional details available.'}`;

    await this.sendMessage({
      to: phoneNumber,
      type: 'text',
      content: { body: message },
    });

    if (status === 'completed') {
      await this.sendInteractiveMenu(
        phoneNumber,
        'What would you like to do next?',
        [
          { id: 'view_receipt', title: 'View Receipt' },
          { id: 'rate_experience', title: 'Rate Experience' },
          { id: 'find_more', title: 'Find More Opportunities' },
        ]
      );
    }
  }

  // Handle incoming webhooks
  async handleWebhook(body: any): Promise<void> {
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            const message = change.value.messages?.[0];
            if (message) {
              await this.processIncomingMessage(message);
            }
          }
        }
      }
    }
  }

  // Process incoming messages
  private async processIncomingMessage(message: any): Promise<void> {
    const from = message.from;
    const messageType = message.type;

    try {
      switch (messageType) {
        case 'text':
          await this.handleTextMessage(from, message.text.body);
          break;
        case 'button':
          await this.handleButtonResponse(from, message.button.payload);
          break;
        case 'interactive':
          await this.handleInteractiveResponse(from, message.interactive);
          break;
        default:
          await this.sendMessage({
            to: from,
            type: 'text',
            content: { body: 'Sorry, I didn\'t understand that. Please use the menu options.' },
          });
      }
    } catch (error) {
      console.error('Error processing incoming message:', error);
      await this.sendMessage({
        to: from,
        type: 'text',
        content: { body: 'Sorry, there was an error processing your message. Please try again.' },
      });
    }
  }

  // Handle text messages
  private async handleTextMessage(from: string, text: string): Promise<void> {
    const lowerText = text.toLowerCase();

    // Simple keyword matching
    if (lowerText.includes('help')) {
      await this.sendInteractiveMenu(
        from,
        'How can I help you?',
        [
          { id: 'get_started', title: 'Get Started' },
          { id: 'contact_agent', title: 'Contact Agent' },
          { id: 'technical_support', title: 'Technical Support' },
        ]
      );
    } else if (lowerText.includes('valuation')) {
      await this.sendInteractiveMenu(
        from,
        'Business Valuation Services:',
        [
          { id: 'free_valuation', title: 'Free Quick Valuation' },
          { id: 'premium_valuation', title: 'Premium Report (₹499)' },
          { id: 'schedule_consultation', title: 'Schedule Consultation' },
        ]
      );
    } else {
      // Add to queue for AI processing
      await queueManager.addNotification(from, 'whatsapp_ai_response', { text });
    }
  }

  // Handle button responses
  private async handleButtonResponse(from: string, payload: string): Promise<void> {
    switch (payload) {
      case 'get_started':
        await this.sendInteractiveMenu(
          from,
          'What type of user are you?',
          [
            { id: 'seller_onboarding', title: 'Business Seller' },
            { id: 'buyer_onboarding', title: 'Business Buyer' },
            { id: 'agent_onboarding', title: 'Agent/Broker' },
            { id: 'nbfc_onboarding', title: 'NBFC/Lender' },
          ]
        );
        break;
      case 'seller_onboarding':
        await this.startMSMEOnboarding(from, 'seller');
        break;
      case 'buyer_onboarding':
        await this.startMSMEOnboarding(from, 'buyer');
        break;
      case 'agent_onboarding':
        await this.startAgentOnboarding(from, 'Agent');
        break;
      case 'nbfc_onboarding':
        await this.startNBFCOnboarding(from, 'NBFC');
        break;
      default:
        // Add to queue for processing
        await queueManager.addNotification(from, 'whatsapp_action', { payload });
    }
  }

  // Handle interactive responses
  private async handleInteractiveResponse(from: string, interactive: any): Promise<void> {
    const responseId = interactive.button_reply?.id || interactive.list_reply?.id;
    if (responseId) {
      await this.handleButtonResponse(from, responseId);
    }
  }

  // Verify webhook
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.webhookToken) {
      return challenge;
    }
    return null;
  }
}

// Scheduled retention campaigns
export class WhatsAppRetentionCampaigns {
  private whatsappService: WhatsAppService;

  constructor() {
    this.whatsappService = new WhatsAppService();
  }

  // Daily retention check
  async runDailyRetentionCheck(): Promise<void> {
    console.log('Running daily WhatsApp retention check...');
    
    // This would query the database for inactive users
    // For now, using mock data
    const inactiveUsers = [
      { phoneNumber: '+911234567890', userType: 'buyer', daysSinceLastActivity: 3 },
      { phoneNumber: '+911234567891', userType: 'seller', daysSinceLastActivity: 7 },
    ];

    for (const user of inactiveUsers) {
      await this.whatsappService.sendRetentionMessage(
        user.phoneNumber,
        user.userType as 'buyer' | 'seller',
        user.daysSinceLastActivity
      );
    }
  }

  // Weekly digest
  async sendWeeklyDigest(): Promise<void> {
    console.log('Sending weekly WhatsApp digest...');
    
    // Send weekly market updates, new listings, etc.
    // Implementation would query database for user preferences
  }
}

export const whatsappService = new WhatsAppService();
export const retentionCampaigns = new WhatsAppRetentionCampaigns();
export { WhatsAppService, WhatsAppMessage, WhatsAppTemplate, WhatsAppFlow };