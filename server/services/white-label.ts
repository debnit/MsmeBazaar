// White-labeling system for channel partners (NBFCs, DSA networks)
import { storage } from '../storage';
import { queueManager } from '../infrastructure/queue-system';

interface WhiteLabelConfig {
  partnerId: string;
  partnerName: string;
  domain: string;
  branding: {
    logo: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily: string;
    favicon: string;
  };
  customization: {
    headerTitle: string;
    footerText: string;
    supportEmail: string;
    supportPhone: string;
    termsUrl: string;
    privacyUrl: string;
    aboutUrl: string;
  };
  features: {
    enabledModules: string[];
    disabledModules: string[];
    customWorkflows: string[];
    integrations: string[];
  };
  commission: {
    percentage: number;
    minimumAmount: number;
    paymentSchedule: 'weekly' | 'monthly' | 'quarterly';
  };
  limits: {
    maxUsers: number;
    maxTransactions: number;
    maxVolume: number;
    apiCallsPerMonth: number;
  };
  createdAt: string;
  updatedAt: string;
  active: boolean;
}

interface CustomPage {
  id: string;
  partnerId: string;
  slug: string;
  title: string;
  content: string;
  template: 'landing' | 'about' | 'contact' | 'terms' | 'privacy' | 'custom';
  seoMeta: {
    title: string;
    description: string;
    keywords: string[];
  };
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CustomWorkflow {
  id: string;
  partnerId: string;
  name: string;
  type: 'onboarding' | 'kyc' | 'loan_approval' | 'document_upload';
  steps: WorkflowStep[];
  conditions: WorkflowCondition[];
  active: boolean;
}

interface WorkflowStep {
  id: string;
  name: string;
  type: 'form' | 'document' | 'verification' | 'approval' | 'notification';
  config: Record<string, any>;
  order: number;
  required: boolean;
}

interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
  action: 'skip' | 'require' | 'redirect';
}

interface PartnerAnalytics {
  partnerId: string;
  period: string;
  users: {
    total: number;
    active: number;
    new: number;
    churned: number;
  };
  transactions: {
    total: number;
    volume: number;
    averageValue: number;
    successRate: number;
  };
  revenue: {
    gross: number;
    commission: number;
    net: number;
    growth: number;
  };
  engagement: {
    sessionDuration: number;
    pageViews: number;
    bounceRate: number;
    conversionRate: number;
  };
}

class WhiteLabelService {
  private configs: Map<string, WhiteLabelConfig> = new Map();
  private customPages: Map<string, CustomPage[]> = new Map();
  private customWorkflows: Map<string, CustomWorkflow[]> = new Map();

  constructor() {
    this.initializeDefaultConfigs();
  }

  // Create new white-label configuration
  async createWhiteLabelConfig(config: Omit<WhiteLabelConfig, 'createdAt' | 'updatedAt'>): Promise<WhiteLabelConfig> {
    const whiteLabelConfig: WhiteLabelConfig = {
      ...config,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.configs.set(config.partnerId, whiteLabelConfig);

    // Setup partner subdomain
    await this.setupPartnerDomain(config.partnerId, config.domain);

    // Generate custom CSS
    await this.generateCustomCSS(config.partnerId, config.branding);

    // Initialize default pages
    await this.createDefaultPages(config.partnerId, config.customization);

    return whiteLabelConfig;
  }

  // Get white-label configuration by partner ID
  async getWhiteLabelConfig(partnerId: string): Promise<WhiteLabelConfig | null> {
    return this.configs.get(partnerId) || null;
  }

  // Get configuration by domain
  async getConfigByDomain(domain: string): Promise<WhiteLabelConfig | null> {
    for (const config of this.configs.values()) {
      if (config.domain === domain) {
        return config;
      }
    }
    return null;
  }

  // Update white-label configuration
  async updateWhiteLabelConfig(partnerId: string, updates: Partial<WhiteLabelConfig>): Promise<WhiteLabelConfig> {
    const config = this.configs.get(partnerId);
    if (!config) {
      throw new Error('White-label configuration not found');
    }

    const updatedConfig = {
      ...config,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.configs.set(partnerId, updatedConfig);

    // Update CSS if branding changed
    if (updates.branding) {
      await this.generateCustomCSS(partnerId, updatedConfig.branding);
    }

    // Update domain if changed
    if (updates.domain) {
      await this.setupPartnerDomain(partnerId, updates.domain);
    }

    return updatedConfig;
  }

  // Create custom page
  async createCustomPage(page: Omit<CustomPage, 'id' | 'createdAt' | 'updatedAt'>): Promise<CustomPage> {
    const customPage: CustomPage = {
      ...page,
      id: `page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!this.customPages.has(page.partnerId)) {
      this.customPages.set(page.partnerId, []);
    }

    this.customPages.get(page.partnerId)!.push(customPage);

    // Generate static HTML
    await this.generatePageHTML(customPage);

    return customPage;
  }

  // Get custom pages for partner
  async getCustomPages(partnerId: string): Promise<CustomPage[]> {
    return this.customPages.get(partnerId) || [];
  }

  // Update custom page
  async updateCustomPage(partnerId: string, pageId: string, updates: Partial<CustomPage>): Promise<CustomPage> {
    const pages = this.customPages.get(partnerId) || [];
    const pageIndex = pages.findIndex(p => p.id === pageId);

    if (pageIndex === -1) {
      throw new Error('Custom page not found');
    }

    pages[pageIndex] = {
      ...pages[pageIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Regenerate HTML
    await this.generatePageHTML(pages[pageIndex]);

    return pages[pageIndex];
  }

  // Create custom workflow
  async createCustomWorkflow(workflow: Omit<CustomWorkflow, 'id'>): Promise<CustomWorkflow> {
    const customWorkflow: CustomWorkflow = {
      ...workflow,
      id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    if (!this.customWorkflows.has(workflow.partnerId)) {
      this.customWorkflows.set(workflow.partnerId, []);
    }

    this.customWorkflows.get(workflow.partnerId)!.push(customWorkflow);

    return customWorkflow;
  }

  // Get custom workflows for partner
  async getCustomWorkflows(partnerId: string): Promise<CustomWorkflow[]> {
    return this.customWorkflows.get(partnerId) || [];
  }

  // Process custom workflow
  async processCustomWorkflow(partnerId: string, workflowId: string, userData: any): Promise<any> {
    const workflows = this.customWorkflows.get(partnerId) || [];
    const workflow = workflows.find(w => w.id === workflowId);

    if (!workflow) {
      throw new Error('Custom workflow not found');
    }

    const result = {
      workflowId,
      steps: [],
      currentStep: 0,
      completed: false,
      data: userData,
    };

    // Process each step
    for (const step of workflow.steps.sort((a, b) => a.order - b.order)) {
      const stepResult = await this.processWorkflowStep(step, userData);
      result.steps.push(stepResult);

      if (!stepResult.success && step.required) {
        break;
      }

      result.currentStep++;
    }

    result.completed = result.currentStep === workflow.steps.length;

    return result;
  }

  // Get partner analytics
  async getPartnerAnalytics(partnerId: string, period: string = '30d'): Promise<PartnerAnalytics> {
    const config = await this.getWhiteLabelConfig(partnerId);
    if (!config) {
      throw new Error('Partner not found');
    }

    // In production, fetch from analytics service
    return {
      partnerId,
      period,
      users: {
        total: 1247,
        active: 892,
        new: 124,
        churned: 23,
      },
      transactions: {
        total: 2847,
        volume: 12450000,
        averageValue: 43750,
        successRate: 94.3,
      },
      revenue: {
        gross: 1245000,
        commission: config.commission.percentage * 1245000 / 100,
        net: 1245000 - (config.commission.percentage * 1245000 / 100),
        growth: 12.4,
      },
      engagement: {
        sessionDuration: 8.5,
        pageViews: 15.2,
        bounceRate: 23.4,
        conversionRate: 7.8,
      },
    };
  }

  // Generate partner-specific API key
  async generateAPIKey(partnerId: string): Promise<string> {
    const config = await this.getWhiteLabelConfig(partnerId);
    if (!config) {
      throw new Error('Partner not found');
    }

    const apiKey = `wl_${partnerId}_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;

    // Store API key with partner association
    await this.storeAPIKey(partnerId, apiKey);

    return apiKey;
  }

  // Validate API key and get partner context
  async validateAPIKey(apiKey: string): Promise<{ partnerId: string; config: WhiteLabelConfig } | null> {
    // In production, validate against stored keys
    const parts = apiKey.split('_');
    if (parts.length >= 2 && parts[0] === 'wl') {
      const partnerId = parts[1];
      const config = await this.getWhiteLabelConfig(partnerId);

      if (config && config.active) {
        return { partnerId, config };
      }
    }

    return null;
  }

  // Get partner commission structure
  async getCommissionStructure(partnerId: string): Promise<any> {
    const config = await this.getWhiteLabelConfig(partnerId);
    if (!config) {
      throw new Error('Partner not found');
    }

    return {
      percentage: config.commission.percentage,
      minimumAmount: config.commission.minimumAmount,
      paymentSchedule: config.commission.paymentSchedule,
      tiers: [
        { min: 0, max: 1000000, rate: config.commission.percentage },
        { min: 1000000, max: 5000000, rate: config.commission.percentage + 0.5 },
        { min: 5000000, max: Infinity, rate: config.commission.percentage + 1 },
      ],
    };
  }

  // Calculate partner commission
  async calculateCommission(partnerId: string, transactionAmount: number): Promise<number> {
    const structure = await this.getCommissionStructure(partnerId);

    for (const tier of structure.tiers) {
      if (transactionAmount >= tier.min && transactionAmount < tier.max) {
        return Math.max(
          structure.minimumAmount,
          (transactionAmount * tier.rate) / 100,
        );
      }
    }

    return structure.minimumAmount;
  }

  // Process partner payout
  async processPartnerPayout(partnerId: string, period: string): Promise<any> {
    const analytics = await this.getPartnerAnalytics(partnerId, period);

    const payout = {
      partnerId,
      period,
      amount: analytics.revenue.commission,
      transactions: analytics.transactions.total,
      volume: analytics.transactions.volume,
      processedAt: new Date().toISOString(),
    };

    // Queue payout processing
    await queueManager.addPayment({
      type: 'partner_payout',
      partnerId,
      amount: payout.amount,
      metadata: payout,
    });

    return payout;
  }

  // Private helper methods
  private async setupPartnerDomain(partnerId: string, domain: string): Promise<void> {
    // In production, configure DNS and SSL
    console.log(`Setting up domain ${domain} for partner ${partnerId}`);
  }

  private async generateCustomCSS(partnerId: string, branding: WhiteLabelConfig['branding']): Promise<void> {
    const css = `
      :root {
        --primary-color: ${branding.primaryColor};
        --secondary-color: ${branding.secondaryColor};
        --accent-color: ${branding.accentColor};
        --font-family: ${branding.fontFamily};
      }
      
      .logo {
        content: url(${branding.logo});
      }
      
      .header {
        background-color: var(--primary-color);
        color: white;
        font-family: var(--font-family);
      }
      
      .button-primary {
        background-color: var(--primary-color);
        border-color: var(--primary-color);
      }
      
      .button-secondary {
        background-color: var(--secondary-color);
        border-color: var(--secondary-color);
      }
      
      .accent {
        color: var(--accent-color);
      }
    `;

    // Store CSS file
    await this.storeCSSFile(partnerId, css);
  }

  private async createDefaultPages(partnerId: string, customization: WhiteLabelConfig['customization']): Promise<void> {
    const defaultPages = [
      {
        slug: 'about',
        title: 'About Us',
        content: `<h1>About ${customization.headerTitle}</h1><p>Welcome to our platform.</p>`,
        template: 'about' as const,
      },
      {
        slug: 'contact',
        title: 'Contact Us',
        content: `<h1>Contact Us</h1><p>Email: ${customization.supportEmail}</p><p>Phone: ${customization.supportPhone}</p>`,
        template: 'contact' as const,
      },
      {
        slug: 'terms',
        title: 'Terms of Service',
        content: '<h1>Terms of Service</h1><p>Terms content here.</p>',
        template: 'terms' as const,
      },
      {
        slug: 'privacy',
        title: 'Privacy Policy',
        content: '<h1>Privacy Policy</h1><p>Privacy content here.</p>',
        template: 'privacy' as const,
      },
    ];

    for (const page of defaultPages) {
      await this.createCustomPage({
        ...page,
        partnerId,
        seoMeta: {
          title: page.title,
          description: `${page.title} - ${customization.headerTitle}`,
          keywords: [page.title.toLowerCase(), 'business', 'marketplace'],
        },
        published: true,
      });
    }
  }

  private async generatePageHTML(page: CustomPage): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${page.seoMeta.title}</title>
          <meta name="description" content="${page.seoMeta.description}">
          <meta name="keywords" content="${page.seoMeta.keywords.join(', ')}">
          <link rel="stylesheet" href="/css/partner-${page.partnerId}.css">
        </head>
        <body>
          <div class="container">
            ${page.content}
          </div>
        </body>
      </html>
    `;

    // Store HTML file
    await this.storeHTMLFile(page.partnerId, page.slug, html);
  }

  private async processWorkflowStep(step: WorkflowStep, userData: any): Promise<any> {
    // Process workflow step based on type
    switch (step.type) {
    case 'form':
      return this.processFormStep(step, userData);
    case 'document':
      return this.processDocumentStep(step, userData);
    case 'verification':
      return this.processVerificationStep(step, userData);
    case 'approval':
      return this.processApprovalStep(step, userData);
    case 'notification':
      return this.processNotificationStep(step, userData);
    default:
      return { success: false, message: 'Unknown step type' };
    }
  }

  private async processFormStep(step: WorkflowStep, userData: any): Promise<any> {
    // Validate form data
    const requiredFields = step.config.requiredFields || [];
    const missingFields = requiredFields.filter(field => !userData[field]);

    if (missingFields.length > 0) {
      return {
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields,
      };
    }

    return { success: true, data: userData };
  }

  private async processDocumentStep(step: WorkflowStep, userData: any): Promise<any> {
    // Validate document upload
    const requiredDocuments = step.config.requiredDocuments || [];
    const uploadedDocuments = userData.documents || [];

    const missingDocuments = requiredDocuments.filter(doc =>
      !uploadedDocuments.some(upload => upload.type === doc),
    );

    if (missingDocuments.length > 0) {
      return {
        success: false,
        message: `Missing required documents: ${missingDocuments.join(', ')}`,
        missingDocuments,
      };
    }

    return { success: true, documents: uploadedDocuments };
  }

  private async processVerificationStep(step: WorkflowStep, userData: any): Promise<any> {
    // Simulate verification process
    return { success: true, verified: true };
  }

  private async processApprovalStep(step: WorkflowStep, userData: any): Promise<any> {
    // Simulate approval process
    return { success: true, approved: true };
  }

  private async processNotificationStep(step: WorkflowStep, userData: any): Promise<any> {
    // Send notification
    return { success: true, notified: true };
  }

  private async storeCSSFile(partnerId: string, css: string): Promise<void> {
    // Store CSS file in CDN or file system
    console.log(`Storing CSS for partner ${partnerId}`);
  }

  private async storeHTMLFile(partnerId: string, slug: string, html: string): Promise<void> {
    // Store HTML file in CDN or file system
    console.log(`Storing HTML page ${slug} for partner ${partnerId}`);
  }

  private async storeAPIKey(partnerId: string, apiKey: string): Promise<void> {
    // Store API key in secure storage
    console.log(`Storing API key for partner ${partnerId}`);
  }

  private initializeDefaultConfigs(): void {
    // Initialize with sample configurations
    console.log('White-label service initialized');
  }
}

// Middleware for white-label detection
export const whiteLabelMiddleware = async (req: any, res: any, next: any) => {
  const host = req.get('host');

  if (host && host !== 'localhost:5000' && host !== 'msmesquare.com') {
    const config = await whiteLabelService.getConfigByDomain(host);

    if (config) {
      req.whiteLabelConfig = config;
      req.partnerId = config.partnerId;

      // Set custom headers
      res.set('X-Partner-ID', config.partnerId);
      res.set('X-Partner-Name', config.partnerName);
    }
  }

  next();
};

export const whiteLabelService = new WhiteLabelService();
export { WhiteLabelConfig, CustomPage, CustomWorkflow, PartnerAnalytics };
