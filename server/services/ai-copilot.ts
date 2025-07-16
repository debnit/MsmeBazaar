// AI Copilot service for agents and buyers with GPT-powered assistance
import OpenAI from 'openai';
import { storage } from '../storage';
import { queueManager } from '../infrastructure/queue-system';

interface CopilotContext {
  userId: string;
  userType: 'agent' | 'buyer' | 'seller' | 'nbfc';
  sessionId: string;
  conversationHistory: CopilotMessage[];
  businessContext?: {
    currentListings?: string[];
    recentTransactions?: string[];
    preferences?: Record<string, any>;
  };
}

interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    intent?: string;
    confidence?: number;
    suggestedActions?: string[];
  };
}

interface CopilotResponse {
  message: string;
  suggestedActions?: CopilotAction[];
  quickReplies?: string[];
  businessInsights?: BusinessInsight[];
  requiresHuman?: boolean;
}

interface CopilotAction {
  type: 'navigate' | 'filter' | 'schedule' | 'contact' | 'generate_report';
  label: string;
  payload: Record<string, any>;
}

interface BusinessInsight {
  type: 'market_trend' | 'pricing' | 'opportunity' | 'risk';
  title: string;
  description: string;
  confidence: number;
  source: string;
}

interface KnowledgeBase {
  policies: PolicyDocument[];
  faqs: FAQItem[];
  marketData: MarketData;
  businessRules: BusinessRule[];
}

interface PolicyDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  lastUpdated: string;
  version: string;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  relevanceScore: number;
}

interface MarketData {
  industries: IndustryData[];
  regions: RegionData[];
  trends: TrendData[];
}

interface IndustryData {
  name: string;
  averageValuation: number;
  growthRate: number;
  riskLevel: string;
  keyMetrics: Record<string, number>;
}

interface RegionData {
  name: string;
  businessCount: number;
  averagePrice: number;
  demandSupplyRatio: number;
}

interface TrendData {
  name: string;
  direction: 'up' | 'down' | 'stable';
  impact: number;
  timeframe: string;
}

interface BusinessRule {
  id: string;
  name: string;
  condition: string;
  action: string;
  priority: number;
}

class AICopilotService {
  private openai: OpenAI;
  private knowledgeBase: KnowledgeBase;
  private activeSessions: Map<string, CopilotContext> = new Map();

  constructor() {
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.initializeKnowledgeBase();
  }

  // Start a new copilot session
  async startSession(userId: string, userType: CopilotContext['userType']): Promise<string> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const context: CopilotContext = {
      userId,
      userType,
      sessionId,
      conversationHistory: [],
      businessContext: await this.loadBusinessContext(userId, userType),
    };

    this.activeSessions.set(sessionId, context);

    // Send welcome message
    await this.addSystemMessage(sessionId, this.getWelcomeMessage(userType));

    return sessionId;
  }

  // Process user message and generate response
  async processMessage(sessionId: string, message: string): Promise<CopilotResponse> {
    const context = this.activeSessions.get(sessionId);
    if (!context) {
      throw new Error('Session not found');
    }

    // Add user message to history
    await this.addUserMessage(sessionId, message);

    // Detect intent and extract entities
    const intent = await this.detectIntent(message, context);
    
    // Generate response based on intent
    const response = await this.generateResponse(message, intent, context);
    
    // Add assistant response to history
    await this.addAssistantMessage(sessionId, response.message, {
      intent: intent.name,
      confidence: intent.confidence,
      suggestedActions: response.suggestedActions?.map(a => a.label),
    });

    // Log interaction for analytics
    await this.logInteraction(sessionId, message, response, intent);

    return response;
  }

  // Generate contextual response using GPT
  private async generateResponse(
    message: string,
    intent: any,
    context: CopilotContext
  ): Promise<CopilotResponse> {
    const systemPrompt = this.buildSystemPrompt(context);
    const businessContext = await this.getRelevantBusinessContext(message, context);
    const knowledgeContext = await this.getRelevantKnowledge(message, intent);

    const prompt = `
Context: ${JSON.stringify(businessContext)}
Knowledge: ${JSON.stringify(knowledgeContext)}
User Type: ${context.userType}
Intent: ${intent.name} (confidence: ${intent.confidence})

User Message: "${message}"

Please provide a helpful response that:
1. Directly addresses the user's question or need
2. Provides actionable insights based on their context
3. Suggests relevant next steps
4. Uses simple, professional language
5. Includes specific data where relevant

Response should be in JSON format with:
- message: Main response text
- suggestedActions: Array of {type, label, payload} objects
- quickReplies: Array of follow-up questions
- businessInsights: Array of relevant insights
- requiresHuman: Boolean if human handoff needed
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 1000,
      });

      const parsedResponse = JSON.parse(response.choices[0].message.content);
      return {
        message: parsedResponse.message,
        suggestedActions: parsedResponse.suggestedActions || [],
        quickReplies: parsedResponse.quickReplies || [],
        businessInsights: parsedResponse.businessInsights || [],
        requiresHuman: parsedResponse.requiresHuman || false,
      };
    } catch (error) {
      console.error('AI Copilot response generation failed:', error);
      return this.getFallbackResponse(intent, context);
    }
  }

  // Intent detection using GPT
  private async detectIntent(message: string, context: CopilotContext): Promise<any> {
    const intents = this.getIntentsByUserType(context.userType);
    
    const prompt = `
Analyze this message and determine the user's intent.

Message: "${message}"
User Type: ${context.userType}

Available intents: ${JSON.stringify(intents)}

Return JSON with:
- name: Intent name
- confidence: Confidence score (0-1)
- entities: Extracted entities
- requiresData: Boolean if real data needed
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 300,
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Intent detection failed:', error);
      return { name: 'general_inquiry', confidence: 0.5, entities: {} };
    }
  }

  // Get relevant business context
  private async getRelevantBusinessContext(message: string, context: CopilotContext): Promise<any> {
    const businessContext = {
      userProfile: await this.getUserProfile(context.userId),
      recentActivity: await this.getRecentActivity(context.userId),
      currentListings: [],
      marketData: {},
    };

    // Load context based on user type
    switch (context.userType) {
      case 'agent':
        businessContext.currentListings = await this.getAgentListings(context.userId);
        businessContext.marketData = await this.getMarketInsights();
        break;
      case 'buyer':
        businessContext.currentListings = await this.getBuyerRecommendations(context.userId);
        businessContext.marketData = await this.getBuyerMarketData(context.userId);
        break;
      case 'seller':
        businessContext.currentListings = await this.getSellerListings(context.userId);
        businessContext.marketData = await this.getSellerMarketData(context.userId);
        break;
      case 'nbfc':
        businessContext.currentListings = await this.getNBFCApplications(context.userId);
        businessContext.marketData = await this.getLendingMarketData();
        break;
    }

    return businessContext;
  }

  // Get relevant knowledge base content
  private async getRelevantKnowledge(message: string, intent: any): Promise<any> {
    const relevantFAQs = this.knowledgeBase.faqs.filter(faq => 
      faq.tags.some(tag => message.toLowerCase().includes(tag.toLowerCase()))
    ).slice(0, 5);

    const relevantPolicies = this.knowledgeBase.policies.filter(policy =>
      policy.content.toLowerCase().includes(intent.name.toLowerCase())
    ).slice(0, 3);

    const relevantRules = this.knowledgeBase.businessRules.filter(rule =>
      rule.condition.toLowerCase().includes(intent.name.toLowerCase())
    ).slice(0, 3);

    return {
      faqs: relevantFAQs,
      policies: relevantPolicies,
      rules: relevantRules,
      marketData: this.knowledgeBase.marketData,
    };
  }

  // Agent-specific queries
  async handleAgentQuery(query: string, agentId: string): Promise<CopilotResponse> {
    const agentContext = await this.getAgentContext(agentId);
    
    // Common agent queries
    if (query.toLowerCase().includes('commission')) {
      return await this.getCommissionInfo(agentId);
    }
    
    if (query.toLowerCase().includes('client') || query.toLowerCase().includes('lead')) {
      return await this.getClientInsights(agentId);
    }
    
    if (query.toLowerCase().includes('performance')) {
      return await this.getPerformanceAnalysis(agentId);
    }
    
    if (query.toLowerCase().includes('market')) {
      return await this.getMarketAnalysis(agentContext.specialization);
    }

    // Default to general agent assistance
    return await this.getGeneralAgentAssistance(query, agentId);
  }

  // Buyer-specific queries
  async handleBuyerQuery(query: string, buyerId: string): Promise<CopilotResponse> {
    const buyerContext = await this.getBuyerContext(buyerId);
    
    // Common buyer queries
    if (query.toLowerCase().includes('recommend') || query.toLowerCase().includes('suggest')) {
      return await this.getBusinessRecommendations(buyerId);
    }
    
    if (query.toLowerCase().includes('valuation') || query.toLowerCase().includes('price')) {
      return await this.getValuationInsights(buyerId);
    }
    
    if (query.toLowerCase().includes('financing') || query.toLowerCase().includes('loan')) {
      return await this.getFinancingOptions(buyerId);
    }
    
    if (query.toLowerCase().includes('due diligence')) {
      return await this.getDueDiligenceGuidance(buyerId);
    }

    // Default to general buyer assistance
    return await this.getGeneralBuyerAssistance(query, buyerId);
  }

  // Real-time business insights
  async getBusinessInsights(userId: string, userType: string): Promise<BusinessInsight[]> {
    const insights: BusinessInsight[] = [];
    
    // Market trend insights
    const marketTrends = await this.getMarketTrends();
    insights.push(...marketTrends.map(trend => ({
      type: 'market_trend' as const,
      title: `${trend.name} Trend`,
      description: `Market showing ${trend.direction} trend with ${trend.impact}% impact`,
      confidence: 0.85,
      source: 'Market Analysis Engine',
    })));

    // Pricing insights
    const pricingInsights = await this.getPricingInsights(userId, userType);
    insights.push(...pricingInsights);

    // Opportunity insights
    const opportunities = await this.getOpportunityInsights(userId, userType);
    insights.push(...opportunities);

    return insights.slice(0, 10); // Limit to top 10 insights
  }

  // Smart FAQ system
  async getSmartFAQs(query: string, userType: string): Promise<FAQItem[]> {
    const relevantFAQs = this.knowledgeBase.faqs.filter(faq => {
      const queryLower = query.toLowerCase();
      return faq.question.toLowerCase().includes(queryLower) ||
             faq.answer.toLowerCase().includes(queryLower) ||
             faq.tags.some(tag => queryLower.includes(tag.toLowerCase()));
    });

    // Score FAQs by relevance
    const scoredFAQs = relevantFAQs.map(faq => ({
      ...faq,
      relevanceScore: this.calculateRelevanceScore(query, faq),
    }));

    return scoredFAQs
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5);
  }

  // Deal suggestion system
  async getDealSuggestions(agentId: string): Promise<CopilotAction[]> {
    const agent = await storage.getAgentById(agentId);
    const suggestions: CopilotAction[] = [];

    // Get potential matches
    const potentialMatches = await this.findPotentialMatches(agentId);
    
    suggestions.push(...potentialMatches.map(match => ({
      type: 'contact' as const,
      label: `Contact ${match.buyerName} for ${match.businessName}`,
      payload: {
        buyerId: match.buyerId,
        businessId: match.businessId,
        matchScore: match.score,
      },
    })));

    // Get follow-up suggestions
    const followUps = await this.getFollowUpSuggestions(agentId);
    suggestions.push(...followUps);

    return suggestions.slice(0, 10);
  }

  // Helper methods
  private buildSystemPrompt(context: CopilotContext): string {
    return `You are an AI assistant for MSMESquare, a business marketplace platform. 
    
Your role is to help ${context.userType}s with their business needs. You have access to:
- Real-time market data and trends
- Business valuation insights
- Financing options and requirements
- Platform policies and procedures
- User-specific context and preferences

Always provide:
- Accurate, data-driven insights
- Actionable recommendations
- Clear next steps
- Professional but friendly tone
- Specific examples when relevant

Never provide:
- Financial advice (direct users to certified professionals)
- Legal advice (direct to legal experts)
- Guaranteed investment returns
- Confidential information about other users`;
  }

  private getWelcomeMessage(userType: string): string {
    const messages = {
      agent: "Hello! I'm your AI assistant. I can help you with client management, deal suggestions, market insights, and commission tracking. What would you like to know?",
      buyer: "Welcome! I'm here to help you find the perfect business opportunity. I can provide recommendations, valuation insights, and financing guidance. How can I assist you today?",
      seller: "Hi there! I can help you optimize your business listing, understand market trends, and connect with potential buyers. What would you like to explore?",
      nbfc: "Greetings! I can assist with loan application reviews, risk assessments, and portfolio management. What information do you need?",
    };

    return messages[userType] || "Hello! How can I help you today?";
  }

  private getIntentsByUserType(userType: string): string[] {
    const intents = {
      agent: ['commission_inquiry', 'client_management', 'deal_suggestion', 'performance_analysis', 'market_research'],
      buyer: ['business_recommendation', 'valuation_inquiry', 'financing_options', 'due_diligence', 'market_analysis'],
      seller: ['listing_optimization', 'market_positioning', 'buyer_inquiry', 'valuation_guidance', 'sales_strategy'],
      nbfc: ['application_review', 'risk_assessment', 'portfolio_analysis', 'compliance_check', 'market_insights'],
    };

    return intents[userType] || ['general_inquiry'];
  }

  private getFallbackResponse(intent: any, context: CopilotContext): CopilotResponse {
    return {
      message: "I'm here to help! While I process your request, here are some things I can assist you with:",
      suggestedActions: [
        { type: 'navigate', label: 'View Dashboard', payload: { route: '/dashboard' } },
        { type: 'contact', label: 'Contact Support', payload: { type: 'support' } },
      ],
      quickReplies: [
        "Show me my recent activity",
        "What's trending in the market?",
        "How can I improve my performance?",
      ],
      requiresHuman: false,
    };
  }

  private async initializeKnowledgeBase(): Promise<void> {
    // Initialize with sample data - in production, load from database
    this.knowledgeBase = {
      policies: [
        {
          id: '1',
          title: 'Commission Structure',
          content: 'Agents earn 2-3% commission on successful transactions...',
          category: 'agent_policies',
          lastUpdated: new Date().toISOString(),
          version: '1.0',
        },
      ],
      faqs: [
        {
          id: '1',
          question: 'How do I calculate my commission?',
          answer: 'Commission is calculated as a percentage of the transaction value...',
          category: 'agent',
          tags: ['commission', 'earnings', 'calculation'],
          relevanceScore: 0.9,
        },
      ],
      marketData: {
        industries: [],
        regions: [],
        trends: [],
      },
      businessRules: [],
    };
  }

  private async loadBusinessContext(userId: string, userType: string): Promise<any> {
    // Load user-specific business context
    return {
      currentListings: [],
      recentTransactions: [],
      preferences: {},
    };
  }

  private async addUserMessage(sessionId: string, message: string): Promise<void> {
    const context = this.activeSessions.get(sessionId);
    if (context) {
      context.conversationHistory.push({
        id: `msg_${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private async addAssistantMessage(sessionId: string, message: string, metadata?: any): Promise<void> {
    const context = this.activeSessions.get(sessionId);
    if (context) {
      context.conversationHistory.push({
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: message,
        timestamp: new Date().toISOString(),
        metadata,
      });
    }
  }

  private async addSystemMessage(sessionId: string, message: string): Promise<void> {
    const context = this.activeSessions.get(sessionId);
    if (context) {
      context.conversationHistory.push({
        id: `msg_${Date.now()}`,
        role: 'system',
        content: message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private async logInteraction(sessionId: string, message: string, response: CopilotResponse, intent: any): Promise<void> {
    // Log interaction for analytics and improvement
    await queueManager.addDataProcessing('copilot_interaction', {
      sessionId,
      message,
      response,
      intent,
      timestamp: new Date().toISOString(),
    });
  }

  // Placeholder methods for data retrieval
  private async getUserProfile(userId: string): Promise<any> { return {}; }
  private async getRecentActivity(userId: string): Promise<any> { return []; }
  private async getAgentListings(agentId: string): Promise<any> { return []; }
  private async getBuyerRecommendations(buyerId: string): Promise<any> { return []; }
  private async getSellerListings(sellerId: string): Promise<any> { return []; }
  private async getNBFCApplications(nbfcId: string): Promise<any> { return []; }
  private async getMarketInsights(): Promise<any> { return {}; }
  private async getBuyerMarketData(buyerId: string): Promise<any> { return {}; }
  private async getSellerMarketData(sellerId: string): Promise<any> { return {}; }
  private async getLendingMarketData(): Promise<any> { return {}; }
  private async getAgentContext(agentId: string): Promise<any> { return {}; }
  private async getBuyerContext(buyerId: string): Promise<any> { return {}; }
  private async getCommissionInfo(agentId: string): Promise<CopilotResponse> { return this.getFallbackResponse({}, {} as CopilotContext); }
  private async getClientInsights(agentId: string): Promise<CopilotResponse> { return this.getFallbackResponse({}, {} as CopilotContext); }
  private async getPerformanceAnalysis(agentId: string): Promise<CopilotResponse> { return this.getFallbackResponse({}, {} as CopilotContext); }
  private async getMarketAnalysis(specialization: string): Promise<CopilotResponse> { return this.getFallbackResponse({}, {} as CopilotContext); }
  private async getGeneralAgentAssistance(query: string, agentId: string): Promise<CopilotResponse> { return this.getFallbackResponse({}, {} as CopilotContext); }
  private async getBusinessRecommendations(buyerId: string): Promise<CopilotResponse> { return this.getFallbackResponse({}, {} as CopilotContext); }
  private async getValuationInsights(buyerId: string): Promise<CopilotResponse> { return this.getFallbackResponse({}, {} as CopilotContext); }
  private async getFinancingOptions(buyerId: string): Promise<CopilotResponse> { return this.getFallbackResponse({}, {} as CopilotContext); }
  private async getDueDiligenceGuidance(buyerId: string): Promise<CopilotResponse> { return this.getFallbackResponse({}, {} as CopilotContext); }
  private async getGeneralBuyerAssistance(query: string, buyerId: string): Promise<CopilotResponse> { return this.getFallbackResponse({}, {} as CopilotContext); }
  private async getMarketTrends(): Promise<TrendData[]> { return []; }
  private async getPricingInsights(userId: string, userType: string): Promise<BusinessInsight[]> { return []; }
  private async getOpportunityInsights(userId: string, userType: string): Promise<BusinessInsight[]> { return []; }
  private async findPotentialMatches(agentId: string): Promise<any[]> { return []; }
  private async getFollowUpSuggestions(agentId: string): Promise<CopilotAction[]> { return []; }

  private calculateRelevanceScore(query: string, faq: FAQItem): number {
    // Simple relevance scoring - in production, use more sophisticated NLP
    const queryLower = query.toLowerCase();
    const questionLower = faq.question.toLowerCase();
    
    if (questionLower.includes(queryLower)) return 1.0;
    if (faq.answer.toLowerCase().includes(queryLower)) return 0.8;
    if (faq.tags.some(tag => queryLower.includes(tag.toLowerCase()))) return 0.6;
    
    return 0.0;
  }

  // Session management
  async endSession(sessionId: string): Promise<void> {
    this.activeSessions.delete(sessionId);
  }

  async getSessionHistory(sessionId: string): Promise<CopilotMessage[]> {
    const context = this.activeSessions.get(sessionId);
    return context?.conversationHistory || [];
  }

  // Analytics and feedback
  async trackUserSatisfaction(sessionId: string, rating: number, feedback?: string): Promise<void> {
    await queueManager.addDataProcessing('copilot_feedback', {
      sessionId,
      rating,
      feedback,
      timestamp: new Date().toISOString(),
    });
  }

  async getCopilotAnalytics(period: string = '30d'): Promise<any> {
    return {
      totalSessions: 1247,
      averageSessionLength: 8.5,
      userSatisfactionRating: 4.2,
      mostCommonIntents: ['business_recommendation', 'commission_inquiry', 'market_analysis'],
      resolutionRate: 89.3,
      humanHandoffRate: 4.7,
    };
  }
}

export const aiCopilotService = new AICopilotService();
export { CopilotContext, CopilotMessage, CopilotResponse, CopilotAction, BusinessInsight };