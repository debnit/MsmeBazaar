// Retention system with email/WhatsApp nudges and engagement tracking
import { queueManager } from '../infrastructure/queue-system';
import { whatsappService } from '../integrations/whatsapp';
import { storage } from '../storage';

interface RetentionProfile {
  userId: string;
  userType: 'buyer' | 'seller' | 'agent' | 'nbfc';
  lastActivity: string;
  engagementScore: number;
  preferences: {
    emailNotifications: boolean;
    whatsappNotifications: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    timeZone: string;
  };
  segments: string[];
  riskScore: number; // Risk of churning
}

interface RetentionCampaign {
  id: string;
  name: string;
  targetSegment: string;
  trigger: 'inactivity' | 'engagement_drop' | 'milestone' | 'seasonal';
  channels: ('email' | 'whatsapp' | 'sms')[];
  schedule: {
    type: 'immediate' | 'delayed' | 'recurring';
    delay?: number; // minutes
    recurringPattern?: string; // cron expression
  };
  content: {
    subject: string;
    template: string;
    variables: Record<string, any>;
  };
  active: boolean;
}

interface EngagementMetrics {
  userId: string;
  date: string;
  pageViews: number;
  timeSpent: number; // minutes
  actions: number;
  conversions: number;
  sessionCount: number;
}

interface RetentionStats {
  totalUsers: number;
  activeUsers: {
    dau: number;
    wau: number;
    mau: number;
  };
  churnRate: number;
  retentionRate: {
    day1: number;
    day7: number;
    day30: number;
  };
  campaignPerformance: {
    sent: number;
    opened: number;
    clicked: number;
    converted: number;
  };
}

class RetentionSystem {
  private campaigns: Map<string, RetentionCampaign> = new Map();

  constructor() {
    this.initializeCampaigns();
  }

  // Initialize default retention campaigns
  private initializeCampaigns(): void {
    const campaigns: RetentionCampaign[] = [
      {
        id: 'buyer_7day_inactive',
        name: 'Buyer 7-Day Inactivity',
        targetSegment: 'inactive_buyers',
        trigger: 'inactivity',
        channels: ['email', 'whatsapp'],
        schedule: { type: 'immediate' },
        content: {
          subject: 'New businesses matching your criteria are available!',
          template: 'buyer_reactivation',
          variables: { daysSinceLastActivity: 7 },
        },
        active: true,
      },
      {
        id: 'seller_14day_inactive',
        name: 'Seller 14-Day Inactivity',
        targetSegment: 'inactive_sellers',
        trigger: 'inactivity',
        channels: ['email', 'whatsapp'],
        schedule: { type: 'immediate' },
        content: {
          subject: 'Buyers are actively looking for businesses like yours',
          template: 'seller_reactivation',
          variables: { daysSinceLastActivity: 14 },
        },
        active: true,
      },
      {
        id: 'agent_monthly_performance',
        name: 'Agent Monthly Performance',
        targetSegment: 'active_agents',
        trigger: 'milestone',
        channels: ['email'],
        schedule: { type: 'recurring', recurringPattern: '0 9 1 * *' }, // 1st of every month at 9 AM
        content: {
          subject: 'Your monthly performance summary',
          template: 'agent_performance',
          variables: {},
        },
        active: true,
      },
      {
        id: 'nbfc_application_followup',
        name: 'NBFC Application Follow-up',
        targetSegment: 'nbfc_pending_applications',
        trigger: 'inactivity',
        channels: ['email', 'whatsapp'],
        schedule: { type: 'delayed', delay: 2880 }, // 48 hours
        content: {
          subject: 'Pending loan applications need your attention',
          template: 'nbfc_followup',
          variables: { pendingCount: 0 },
        },
        active: true,
      },
    ];

    campaigns.forEach(campaign => {
      this.campaigns.set(campaign.id, campaign);
    });
  }

  // Track user engagement
  async trackEngagement(userId: string, metrics: Partial<EngagementMetrics>): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    const engagement: EngagementMetrics = {
      userId,
      date: today,
      pageViews: metrics.pageViews || 0,
      timeSpent: metrics.timeSpent || 0,
      actions: metrics.actions || 0,
      conversions: metrics.conversions || 0,
      sessionCount: metrics.sessionCount || 0,
    };

    // Store engagement data
    await this.storeEngagementMetrics(engagement);

    // Update retention profile
    await this.updateRetentionProfile(userId, engagement);

    // Trigger campaigns if needed
    await this.evaluateCampaignTriggers(userId);
  }

  // Identify users at risk of churning
  async identifyChurnRisk(): Promise<string[]> {
    const atRiskUsers: string[] = [];

    // Get all user profiles
    const profiles = await this.getAllRetentionProfiles();

    for (const profile of profiles) {
      const riskScore = await this.calculateChurnRisk(profile);

      if (riskScore > 70) {
        atRiskUsers.push(profile.userId);

        // Trigger high-priority retention campaign
        await this.triggerUrgentRetentionCampaign(profile);
      }
    }

    return atRiskUsers;
  }

  // Run daily retention campaigns
  async runDailyRetentionCheck(): Promise<void> {
    console.log('Running daily retention check...');

    const inactiveUsers = await this.getInactiveUsers();

    for (const user of inactiveUsers) {
      const profile = await this.getRetentionProfile(user.id);
      if (!profile) {continue;}

      const daysSinceLastActivity = Math.floor(
        (Date.now() - new Date(profile.lastActivity).getTime()) / (24 * 60 * 60 * 1000),
      );

      // Trigger appropriate campaigns based on user type and inactivity period
      await this.triggerInactivityCampaigns(profile, daysSinceLastActivity);
    }
  }

  // Personalized retention messaging
  async generatePersonalizedMessage(
    userId: string,
    template: string,
    variables: Record<string, any>,
  ): Promise<string> {
    const profile = await this.getRetentionProfile(userId);
    if (!profile) {return '';}

    const user = await storage.getUserById(userId);
    if (!user) {return '';}

    // Base message templates
    const templates = {
      buyer_reactivation: this.getBuyerReactivationTemplate(),
      seller_reactivation: this.getSellerReactivationTemplate(),
      agent_performance: this.getAgentPerformanceTemplate(),
      nbfc_followup: this.getNBFCFollowupTemplate(),
    };

    let message = templates[template] || '';

    // Replace variables
    const allVariables = {
      firstName: user.firstName || 'User',
      lastName: user.lastName || '',
      userType: profile.userType,
      daysSinceLastActivity: variables.daysSinceLastActivity || 0,
      ...variables,
    };

    Object.entries(allVariables).forEach(([key, value]) => {
      message = message.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    });

    return message;
  }

  // Send retention notification
  async sendRetentionNotification(
    userId: string,
    channel: 'email' | 'whatsapp' | 'sms',
    content: { subject: string; message: string },
  ): Promise<void> {
    const user = await storage.getUserById(userId);
    if (!user) {return;}

    switch (channel) {
    case 'email':
      await this.sendEmailNotification(user.email, content.subject, content.message);
      break;
    case 'whatsapp':
      await this.sendWhatsAppNotification(user.phone, content.message);
      break;
    case 'sms':
      await this.sendSMSNotification(user.phone, content.message);
      break;
    }

    // Track notification sent
    await this.trackNotificationSent(userId, channel, content.subject);
  }

  // A/B testing for retention campaigns
  async runRetentionExperiment(
    campaignId: string,
    variant: 'control' | 'experimental',
    userId: string,
  ): Promise<void> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {return;}

    let content = campaign.content;

    if (variant === 'experimental') {
      // Use experimental version
      content = await this.getExperimentalContent(campaignId);
    }

    const message = await this.generatePersonalizedMessage(
      userId,
      content.template,
      content.variables,
    );

    // Send notification
    for (const channel of campaign.channels) {
      await this.sendRetentionNotification(userId, channel, {
        subject: content.subject,
        message,
      });
    }

    // Track experiment
    await this.trackExperiment(campaignId, variant, userId);
  }

  // Get retention analytics
  async getRetentionAnalytics(period: string = '30d'): Promise<RetentionStats> {
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
    }

    // Mock analytics - in production, query actual data
    return {
      totalUsers: 15247,
      activeUsers: {
        dau: 3456,
        wau: 8923,
        mau: 12847,
      },
      churnRate: 8.3,
      retentionRate: {
        day1: 85.2,
        day7: 72.4,
        day30: 58.7,
      },
      campaignPerformance: {
        sent: 2345,
        opened: 1876,
        clicked: 432,
        converted: 89,
      },
    };
  }

  // Advanced segmentation
  async segmentUsers(): Promise<Map<string, string[]>> {
    const segments = new Map<string, string[]>();

    // Get all users
    const users = await storage.getAllUsers();

    for (const user of users) {
      const profile = await this.getRetentionProfile(user.id);
      if (!profile) {continue;}

      const userSegments = await this.calculateUserSegments(user, profile);

      userSegments.forEach(segment => {
        if (!segments.has(segment)) {
          segments.set(segment, []);
        }
        segments.get(segment)!.push(user.id);
      });
    }

    return segments;
  }

  // Predictive churn modeling
  async predictChurnProbability(userId: string): Promise<number> {
    const profile = await this.getRetentionProfile(userId);
    if (!profile) {return 0;}

    const engagementHistory = await this.getEngagementHistory(userId);
    const behaviorFeatures = await this.extractBehaviorFeatures(userId, engagementHistory);

    // Simple predictive model (in production, use ML model)
    const features = {
      daysSinceLastActivity: Math.floor(
        (Date.now() - new Date(profile.lastActivity).getTime()) / (24 * 60 * 60 * 1000),
      ),
      avgSessionLength: behaviorFeatures.avgSessionLength,
      actionFrequency: behaviorFeatures.actionFrequency,
      conversionRate: behaviorFeatures.conversionRate,
      engagementTrend: behaviorFeatures.engagementTrend,
    };

    // Weighted scoring
    let churnScore = 0;

    if (features.daysSinceLastActivity > 14) {churnScore += 30;}
    if (features.avgSessionLength < 2) {churnScore += 20;}
    if (features.actionFrequency < 0.1) {churnScore += 25;}
    if (features.conversionRate < 0.05) {churnScore += 15;}
    if (features.engagementTrend < -0.2) {churnScore += 10;}

    return Math.min(100, churnScore);
  }

  // Private helper methods
  private async storeEngagementMetrics(engagement: EngagementMetrics): Promise<void> {
    // Store in TimescaleDB or PostgreSQL
    console.log('Storing engagement metrics:', engagement);
  }

  private async updateRetentionProfile(userId: string, engagement: EngagementMetrics): Promise<void> {
    const profile = await this.getRetentionProfile(userId);
    if (!profile) {return;}

    // Update engagement score
    const newEngagementScore = this.calculateEngagementScore(engagement);
    profile.engagementScore = (profile.engagementScore * 0.8) + (newEngagementScore * 0.2);
    profile.lastActivity = new Date().toISOString();

    // Save updated profile
    await this.saveRetentionProfile(profile);
  }

  private async evaluateCampaignTriggers(userId: string): Promise<void> {
    const profile = await this.getRetentionProfile(userId);
    if (!profile) {return;}

    // Check if any campaigns should be triggered
    for (const campaign of this.campaigns.values()) {
      if (await this.shouldTriggerCampaign(campaign, profile)) {
        await this.executeCampaign(campaign, userId);
      }
    }
  }

  private async calculateChurnRisk(profile: RetentionProfile): Promise<number> {
    const daysSinceLastActivity = Math.floor(
      (Date.now() - new Date(profile.lastActivity).getTime()) / (24 * 60 * 60 * 1000),
    );

    let riskScore = 0;

    // Inactivity risk
    if (daysSinceLastActivity > 30) {riskScore += 40;}
    else if (daysSinceLastActivity > 14) {riskScore += 25;}
    else if (daysSinceLastActivity > 7) {riskScore += 10;}

    // Engagement risk
    if (profile.engagementScore < 20) {riskScore += 30;}
    else if (profile.engagementScore < 50) {riskScore += 15;}

    // User type specific risk
    if (profile.userType === 'buyer' && daysSinceLastActivity > 14) {riskScore += 10;}
    if (profile.userType === 'seller' && daysSinceLastActivity > 21) {riskScore += 10;}

    return Math.min(100, riskScore);
  }

  private async triggerUrgentRetentionCampaign(profile: RetentionProfile): Promise<void> {
    const urgentCampaign: RetentionCampaign = {
      id: 'urgent_retention',
      name: 'Urgent Retention',
      targetSegment: 'high_churn_risk',
      trigger: 'engagement_drop',
      channels: ['email', 'whatsapp'],
      schedule: { type: 'immediate' },
      content: {
        subject: 'We miss you! Special offer inside',
        template: 'urgent_retention',
        variables: { churnRisk: 'high' },
      },
      active: true,
    };

    await this.executeCampaign(urgentCampaign, profile.userId);
  }

  private async getInactiveUsers(): Promise<Array<{ id: string; lastActivity: string }>> {
    // Query database for inactive users
    return [];
  }

  private async getAllRetentionProfiles(): Promise<RetentionProfile[]> {
    // Query database for all retention profiles
    return [];
  }

  private async getRetentionProfile(userId: string): Promise<RetentionProfile | null> {
    // Query database for retention profile
    return null;
  }

  private async triggerInactivityCampaigns(profile: RetentionProfile, daysSinceLastActivity: number): Promise<void> {
    const applicableCampaigns = Array.from(this.campaigns.values()).filter(campaign => {
      if (!campaign.active) {return false;}
      if (campaign.trigger !== 'inactivity') {return false;}

      // Check if campaign applies to user type
      return campaign.targetSegment.includes(profile.userType);
    });

    for (const campaign of applicableCampaigns) {
      await this.executeCampaign(campaign, profile.userId);
    }
  }

  private async executeCampaign(campaign: RetentionCampaign, userId: string): Promise<void> {
    const message = await this.generatePersonalizedMessage(
      userId,
      campaign.content.template,
      campaign.content.variables,
    );

    for (const channel of campaign.channels) {
      await this.sendRetentionNotification(userId, channel, {
        subject: campaign.content.subject,
        message,
      });
    }
  }

  private async shouldTriggerCampaign(campaign: RetentionCampaign, profile: RetentionProfile): Promise<boolean> {
    // Logic to determine if campaign should be triggered
    return false;
  }

  private getBuyerReactivationTemplate(): string {
    return `Hi {{firstName}},

We noticed you haven't visited MSMESquare in {{daysSinceLastActivity}} days. 

🏢 New businesses matching your criteria are available!
💰 Great investment opportunities you might have missed
📊 Updated market insights and trends

Don't let the perfect business opportunity slip away.

[View Latest Listings] [Update Preferences]

Best regards,
MSMESquare Team`;
  }

  private getSellerReactivationTemplate(): string {
    return `Hi {{firstName}},

Your business listing has been inactive for {{daysSinceLastActivity}} days.

👥 Multiple buyers are actively looking for businesses like yours
📈 Increase your visibility to serious investors
💡 Get tips to improve your listing performance

[Boost Your Listing] [Update Business Details]

Best regards,
MSMESquare Team`;
  }

  private getAgentPerformanceTemplate(): string {
    return `Hi {{firstName}},

Here's your monthly performance summary:

📊 Total Earnings: ₹{{totalEarnings}}
🤝 New Clients: {{newClients}}
📈 Conversion Rate: {{conversionRate}}%
🎯 Completed Deals: {{completedDeals}}

[View Full Dashboard] [Download Report]

Keep up the great work!
MSMESquare Team`;
  }

  private getNBFCFollowupTemplate(): string {
    return `Hi {{firstName}},

You have {{pendingCount}} pending loan applications that need your attention.

⏰ Quick processing improves your approval ratings
💼 Don't miss out on quality lending opportunities
📊 Track your performance metrics

[Review Applications] [Update Loan Products]

Best regards,
MSMESquare Team`;
  }

  private async sendEmailNotification(email: string, subject: string, message: string): Promise<void> {
    await queueManager.addEmail(email, subject, 'retention_email', { message });
  }

  private async sendWhatsAppNotification(phone: string, message: string): Promise<void> {
    await whatsappService.sendMessage({
      to: phone,
      type: 'text',
      content: { body: message },
    });
  }

  private async sendSMSNotification(phone: string, message: string): Promise<void> {
    // SMS implementation
    console.log('Sending SMS to:', phone, message);
  }

  private async trackNotificationSent(userId: string, channel: string, subject: string): Promise<void> {
    // Track notification in analytics
    console.log('Notification sent:', { userId, channel, subject });
  }

  private async getExperimentalContent(campaignId: string): Promise<any> {
    // Return experimental content variant
    return { subject: 'Experimental subject', template: 'experimental_template', variables: {} };
  }

  private async trackExperiment(campaignId: string, variant: string, userId: string): Promise<void> {
    // Track A/B test data
    console.log('Experiment tracked:', { campaignId, variant, userId });
  }

  private calculateEngagementScore(engagement: EngagementMetrics): number {
    // Calculate engagement score based on metrics
    return (engagement.pageViews * 2) + (engagement.actions * 5) + (engagement.conversions * 10);
  }

  private async saveRetentionProfile(profile: RetentionProfile): Promise<void> {
    // Save profile to database
    console.log('Saving retention profile:', profile.userId);
  }

  private async calculateUserSegments(user: any, profile: RetentionProfile): Promise<string[]> {
    const segments: string[] = [];

    // Basic segmentation
    segments.push(profile.userType);

    if (profile.engagementScore > 80) {segments.push('high_engagement');}
    if (profile.engagementScore < 30) {segments.push('low_engagement');}

    const daysSinceLastActivity = Math.floor(
      (Date.now() - new Date(profile.lastActivity).getTime()) / (24 * 60 * 60 * 1000),
    );

    if (daysSinceLastActivity > 7) {segments.push('inactive');}
    if (daysSinceLastActivity <= 1) {segments.push('active');}

    return segments;
  }

  private async getEngagementHistory(userId: string): Promise<EngagementMetrics[]> {
    // Get engagement history from database
    return [];
  }

  private async extractBehaviorFeatures(userId: string, history: EngagementMetrics[]): Promise<any> {
    // Extract behavioral features for modeling
    return {
      avgSessionLength: 5.2,
      actionFrequency: 0.15,
      conversionRate: 0.08,
      engagementTrend: 0.02,
    };
  }
}

export const retentionSystem = new RetentionSystem();
export { RetentionProfile, RetentionCampaign, EngagementMetrics, RetentionStats };
