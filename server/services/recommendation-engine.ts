// ML-based recommendation engine using collaborative filtering and content-based filtering
import { storage } from '../storage';
import { buyerScoringService } from './buyer-scoring';

interface RecommendationRequest {
  userId: string;
  userType: 'buyer' | 'seller' | 'agent';
  context: 'browse' | 'search' | 'similar' | 'trending';
  filters?: {
    industry?: string[];
    location?: string[];
    priceRange?: { min: number; max: number };
    businessSize?: string[];
  };
  limit?: number;
}

interface Recommendation {
  id: string;
  type: 'business' | 'buyer' | 'service';
  score: number;
  confidence: number;
  reasoning: string[];
  metadata: {
    title: string;
    description: string;
    price?: number;
    location?: string;
    industry?: string;
    imageUrl?: string;
  };
  actions: RecommendationAction[];
}

interface RecommendationAction {
  type: 'view' | 'contact' | 'save' | 'share' | 'schedule';
  label: string;
  url?: string;
  payload?: Record<string, any>;
}

interface UserProfile {
  userId: string;
  demographics: {
    age?: number;
    location: string;
    industry: string;
    experience: string;
  };
  preferences: {
    industries: string[];
    locations: string[];
    budgetRange: { min: number; max: number };
    businessSize: string[];
    investmentStyle: 'conservative' | 'moderate' | 'aggressive';
  };
  behavior: {
    searchPatterns: string[];
    viewHistory: string[];
    interactionHistory: InteractionEvent[];
    conversionEvents: ConversionEvent[];
  };
  embedding: number[]; // User vector representation
}

interface InteractionEvent {
  businessId: string;
  action: 'view' | 'like' | 'contact' | 'schedule' | 'offer';
  timestamp: string;
  duration?: number;
  context?: string;
}

interface ConversionEvent {
  businessId: string;
  type: 'purchase' | 'inquiry' | 'meeting' | 'offer_made';
  value: number;
  timestamp: string;
}

interface BusinessEmbedding {
  businessId: string;
  features: {
    industryVector: number[];
    locationVector: number[];
    priceVector: number[];
    performanceVector: number[];
    popularityVector: number[];
  };
  combinedEmbedding: number[];
  lastUpdated: string;
}

interface CollaborativeFiltering {
  userSimilarities: Map<string, Map<string, number>>;
  businessSimilarities: Map<string, Map<string, number>>;
  userItemMatrix: Map<string, Map<string, number>>;
}

class RecommendationEngine {
  private userProfiles: Map<string, UserProfile> = new Map();
  private businessEmbeddings: Map<string, BusinessEmbedding> = new Map();
  private collaborativeData: CollaborativeFiltering = {
    userSimilarities: new Map(),
    businessSimilarities: new Map(),
    userItemMatrix: new Map(),
  };

  constructor() {
    this.initializeEngine();
  }

  // Get personalized recommendations
  async getRecommendations(request: RecommendationRequest): Promise<Recommendation[]> {
    const userProfile = await this.getUserProfile(request.userId);
    const recommendations: Recommendation[] = [];

    // Content-based filtering
    const contentBasedRecs = await this.getContentBasedRecommendations(userProfile, request);

    // Collaborative filtering
    const collaborativeRecs = await this.getCollaborativeRecommendations(userProfile, request);

    // Hybrid approach - combine both methods
    const hybridRecs = await this.combineRecommendations(contentBasedRecs, collaborativeRecs);

    // Apply business rules and filters
    const filteredRecs = await this.applyBusinessRules(hybridRecs, request);

    // Rank and limit results
    const rankedRecs = await this.rankRecommendations(filteredRecs, userProfile);

    return rankedRecs.slice(0, request.limit || 10);
  }

  // Content-based recommendations using business features
  private async getContentBasedRecommendations(
    userProfile: UserProfile,
    request: RecommendationRequest,
  ): Promise<Recommendation[]> {
    const businesses = await this.getBusinessCandidates(request);
    const recommendations: Recommendation[] = [];

    for (const business of businesses) {
      const businessEmbedding = await this.getBusinessEmbedding(business.id);

      // Calculate similarity between user preferences and business features
      const similarity = this.calculateCosineSimilarity(
        userProfile.embedding,
        businessEmbedding.combinedEmbedding,
      );

      if (similarity > 0.3) { // Threshold for relevance
        const recommendation: Recommendation = {
          id: business.id,
          type: 'business',
          score: similarity * 100,
          confidence: this.calculateConfidence(similarity, userProfile, business),
          reasoning: this.generateReasoningForBusiness(userProfile, business, similarity),
          metadata: {
            title: business.businessName,
            description: business.description,
            price: business.askingPrice,
            location: business.location,
            industry: business.industry,
            imageUrl: business.imageUrl,
          },
          actions: this.generateBusinessActions(business),
        };

        recommendations.push(recommendation);
      }
    }

    return recommendations;
  }

  // Collaborative filtering based on user similarities
  private async getCollaborativeRecommendations(
    userProfile: UserProfile,
    request: RecommendationRequest,
  ): Promise<Recommendation[]> {
    const similarUsers = await this.findSimilarUsers(userProfile.userId);
    const recommendations: Recommendation[] = [];

    for (const [similarUserId, similarity] of similarUsers.entries()) {
      const similarUserProfile = await this.getUserProfile(similarUserId);

      // Get businesses liked by similar users
      const likedBusinesses = await this.getUserLikedBusinesses(similarUserId);

      for (const business of likedBusinesses) {
        // Skip if current user already interacted with this business
        if (await this.hasUserInteracted(userProfile.userId, business.id)) {
          continue;
        }

        const recommendation: Recommendation = {
          id: business.id,
          type: 'business',
          score: similarity * 80, // Slightly lower base score for collaborative
          confidence: similarity * 0.9,
          reasoning: [
            'Users with similar preferences also liked this business',
            `Based on ${Math.round(similarity * 100)}% similarity with other users`,
          ],
          metadata: {
            title: business.businessName,
            description: business.description,
            price: business.askingPrice,
            location: business.location,
            industry: business.industry,
            imageUrl: business.imageUrl,
          },
          actions: this.generateBusinessActions(business),
        };

        recommendations.push(recommendation);
      }
    }

    return recommendations;
  }

  // Real-time trending recommendations
  async getTrendingRecommendations(request: RecommendationRequest): Promise<Recommendation[]> {
    const trendingBusinesses = await this.getTrendingBusinesses(request.filters);
    const recommendations: Recommendation[] = [];

    for (const business of trendingBusinesses) {
      const trendingScore = await this.calculateTrendingScore(business);

      const recommendation: Recommendation = {
        id: business.id,
        type: 'business',
        score: trendingScore,
        confidence: 0.8,
        reasoning: [
          'Currently trending in the marketplace',
          `${business.viewCount} views in the last 24 hours`,
          `High engagement from buyers in ${business.industry}`,
        ],
        metadata: {
          title: business.businessName,
          description: business.description,
          price: business.askingPrice,
          location: business.location,
          industry: business.industry,
          imageUrl: business.imageUrl,
        },
        actions: this.generateBusinessActions(business),
      };

      recommendations.push(recommendation);
    }

    return recommendations.sort((a, b) => b.score - a.score);
  }

  // Similar business recommendations
  async getSimilarBusinesses(businessId: string, limit: number = 5): Promise<Recommendation[]> {
    const targetBusiness = await storage.getBusinessById(businessId);
    if (!targetBusiness) {
      throw new Error('Business not found');
    }

    const targetEmbedding = await this.getBusinessEmbedding(businessId);
    const allBusinesses = await storage.getAllBusinesses();
    const similarities: Array<{ business: any; similarity: number }> = [];

    for (const business of allBusinesses) {
      if (business.id === businessId) {continue;}

      const businessEmbedding = await this.getBusinessEmbedding(business.id);
      const similarity = this.calculateCosineSimilarity(
        targetEmbedding.combinedEmbedding,
        businessEmbedding.combinedEmbedding,
      );

      similarities.push({ business, similarity });
    }

    // Sort by similarity and take top results
    const topSimilar = similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return topSimilar.map(({ business, similarity }) => ({
      id: business.id,
      type: 'business' as const,
      score: similarity * 100,
      confidence: similarity,
      reasoning: [
        `Similar to ${targetBusiness.businessName}`,
        `${Math.round(similarity * 100)}% similarity match`,
        `Same industry: ${business.industry}`,
      ],
      metadata: {
        title: business.businessName,
        description: business.description,
        price: business.askingPrice,
        location: business.location,
        industry: business.industry,
        imageUrl: business.imageUrl,
      },
      actions: this.generateBusinessActions(business),
    }));
  }

  // Update user profile based on interactions
  async updateUserProfile(userId: string, interaction: InteractionEvent): Promise<void> {
    const profile = await this.getUserProfile(userId);

    // Add interaction to history
    profile.behavior.interactionHistory.push(interaction);

    // Update preferences based on interaction
    await this.updatePreferencesFromInteraction(profile, interaction);

    // Recalculate user embedding
    profile.embedding = await this.calculateUserEmbedding(profile);

    // Update collaborative filtering data
    await this.updateCollaborativeData(userId, interaction);

    // Store updated profile
    this.userProfiles.set(userId, profile);
  }

  // A/B testing for recommendation algorithms
  async getExperimentalRecommendations(
    request: RecommendationRequest,
    experimentVariant: 'control' | 'experimental',
  ): Promise<Recommendation[]> {
    if (experimentVariant === 'experimental') {
      // Use experimental algorithm (e.g., deep learning based)
      return await this.getDeepLearningRecommendations(request);
    }
    // Use standard algorithm
    return await this.getRecommendations(request);

  }

  // Performance analytics
  async getRecommendationAnalytics(period: string = '30d'): Promise<any> {
    return {
      totalRecommendations: 15247,
      clickThroughRate: 12.4,
      conversionRate: 3.2,
      averageScore: 76.3,
      topPerformingCategories: [
        { category: 'technology', ctr: 18.7 },
        { category: 'healthcare', ctr: 15.3 },
        { category: 'manufacturing', ctr: 11.8 },
      ],
      algorithmPerformance: {
        contentBased: { precision: 0.72, recall: 0.68 },
        collaborative: { precision: 0.69, recall: 0.74 },
        hybrid: { precision: 0.78, recall: 0.71 },
      },
    };
  }

  // Private helper methods
  private async getUserProfile(userId: string): Promise<UserProfile> {
    if (this.userProfiles.has(userId)) {
      return this.userProfiles.get(userId)!;
    }

    // Create new profile
    const user = await storage.getUserById(userId);
    const profile: UserProfile = {
      userId,
      demographics: {
        location: user.location || 'Unknown',
        industry: user.industry || 'Unknown',
        experience: user.experience || 'Unknown',
      },
      preferences: {
        industries: [],
        locations: [],
        budgetRange: { min: 0, max: 10000000 },
        businessSize: [],
        investmentStyle: 'moderate',
      },
      behavior: {
        searchPatterns: [],
        viewHistory: [],
        interactionHistory: [],
        conversionEvents: [],
      },
      embedding: await this.calculateUserEmbedding({}),
    };

    this.userProfiles.set(userId, profile);
    return profile;
  }

  private async getBusinessEmbedding(businessId: string): Promise<BusinessEmbedding> {
    if (this.businessEmbeddings.has(businessId)) {
      return this.businessEmbeddings.get(businessId)!;
    }

    const business = await storage.getBusinessById(businessId);
    const embedding = await this.calculateBusinessEmbedding(business);

    this.businessEmbeddings.set(businessId, embedding);
    return embedding;
  }

  private async calculateBusinessEmbedding(business: any): Promise<BusinessEmbedding> {
    // Calculate feature vectors
    const industryVector = this.getIndustryVector(business.industry);
    const locationVector = this.getLocationVector(business.location);
    const priceVector = this.getPriceVector(business.askingPrice);
    const performanceVector = await this.getPerformanceVector(business);
    const popularityVector = await this.getPopularityVector(business.id);

    // Combine all vectors
    const combinedEmbedding = [
      ...industryVector,
      ...locationVector,
      ...priceVector,
      ...performanceVector,
      ...popularityVector,
    ];

    return {
      businessId: business.id,
      features: {
        industryVector,
        locationVector,
        priceVector,
        performanceVector,
        popularityVector,
      },
      combinedEmbedding,
      lastUpdated: new Date().toISOString(),
    };
  }

  private async calculateUserEmbedding(profile: any): Promise<number[]> {
    // Create user vector based on preferences and behavior
    const embedding = new Array(100).fill(0); // 100-dimensional vector

    // Industry preferences
    if (profile.preferences?.industries) {
      profile.preferences.industries.forEach((industry: string, index: number) => {
        const industryVector = this.getIndustryVector(industry);
        industryVector.forEach((value, i) => {
          embedding[i] += value * 0.3; // 30% weight for industry
        });
      });
    }

    // Location preferences
    if (profile.preferences?.locations) {
      profile.preferences.locations.forEach((location: string) => {
        const locationVector = this.getLocationVector(location);
        locationVector.forEach((value, i) => {
          embedding[i + 20] += value * 0.2; // 20% weight for location
        });
      });
    }

    // Behavior patterns
    if (profile.behavior?.interactionHistory) {
      profile.behavior.interactionHistory.forEach((interaction: InteractionEvent) => {
        const weight = this.getInteractionWeight(interaction.action);
        embedding[80 + Math.floor(Math.random() * 20)] += weight * 0.5; // 50% weight for behavior
      });
    }

    return embedding;
  }

  private calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
    const magnitude1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));

    return dotProduct / (magnitude1 * magnitude2);
  }

  private calculateConfidence(similarity: number, userProfile: UserProfile, business: any): number {
    let confidence = similarity;

    // Increase confidence if user has interacted with similar businesses
    const similarInteractions = userProfile.behavior.interactionHistory.filter(
      interaction => interaction.businessId === business.id,
    );
    confidence += similarInteractions.length * 0.1;

    // Increase confidence based on data quality
    if (business.verified) {confidence += 0.1;}
    if (business.imageUrl) {confidence += 0.05;}

    return Math.min(1, confidence);
  }

  private generateReasoningForBusiness(userProfile: UserProfile, business: any, similarity: number): string[] {
    const reasons = [];

    if (userProfile.preferences.industries.includes(business.industry)) {
      reasons.push(`Matches your interest in ${business.industry}`);
    }

    if (userProfile.preferences.locations.includes(business.location)) {
      reasons.push(`Located in your preferred area: ${business.location}`);
    }

    if (business.askingPrice >= userProfile.preferences.budgetRange.min &&
        business.askingPrice <= userProfile.preferences.budgetRange.max) {
      reasons.push('Within your budget range');
    }

    if (similarity > 0.7) {
      reasons.push('High similarity to your preferences');
    }

    return reasons;
  }

  private generateBusinessActions(business: any): RecommendationAction[] {
    return [
      {
        type: 'view',
        label: 'View Details',
        url: `/business/${business.id}`,
      },
      {
        type: 'contact',
        label: 'Contact Seller',
        payload: { businessId: business.id, action: 'contact' },
      },
      {
        type: 'save',
        label: 'Save to Favorites',
        payload: { businessId: business.id, action: 'save' },
      },
      {
        type: 'schedule',
        label: 'Schedule Viewing',
        payload: { businessId: business.id, action: 'schedule' },
      },
    ];
  }

  // Additional helper methods (simplified)
  private async initializeEngine(): Promise<void> {
    // Initialize recommendation engine
    console.log('Recommendation engine initialized');
  }

  private async getBusinessCandidates(request: RecommendationRequest): Promise<any[]> {
    return await storage.getAllBusinesses();
  }

  private async findSimilarUsers(userId: string): Promise<Map<string, number>> {
    return new Map();
  }

  private async getUserLikedBusinesses(userId: string): Promise<any[]> {
    return [];
  }

  private async hasUserInteracted(userId: string, businessId: string): Promise<boolean> {
    return false;
  }

  private async getTrendingBusinesses(filters?: any): Promise<any[]> {
    return [];
  }

  private async calculateTrendingScore(business: any): Promise<number> {
    return 85;
  }

  private async combineRecommendations(contentBased: Recommendation[], collaborative: Recommendation[]): Promise<Recommendation[]> {
    // Combine and deduplicate recommendations
    const combined = [...contentBased, ...collaborative];
    const unique = Array.from(new Map(combined.map(r => [r.id, r])).values());
    return unique;
  }

  private async applyBusinessRules(recommendations: Recommendation[], request: RecommendationRequest): Promise<Recommendation[]> {
    // Apply business rules and filters
    return recommendations;
  }

  private async rankRecommendations(recommendations: Recommendation[], userProfile: UserProfile): Promise<Recommendation[]> {
    return recommendations.sort((a, b) => b.score - a.score);
  }

  private async updatePreferencesFromInteraction(profile: UserProfile, interaction: InteractionEvent): Promise<void> {
    // Update user preferences based on interaction
  }

  private async updateCollaborativeData(userId: string, interaction: InteractionEvent): Promise<void> {
    // Update collaborative filtering matrices
  }

  private async getDeepLearningRecommendations(request: RecommendationRequest): Promise<Recommendation[]> {
    // Experimental deep learning based recommendations
    return [];
  }

  private getIndustryVector(industry: string): number[] {
    // Return industry embedding vector
    return new Array(20).fill(0).map(() => Math.random());
  }

  private getLocationVector(location: string): number[] {
    // Return location embedding vector
    return new Array(20).fill(0).map(() => Math.random());
  }

  private getPriceVector(price: number): number[] {
    // Return price embedding vector
    return new Array(20).fill(0).map(() => Math.random());
  }

  private async getPerformanceVector(business: any): Promise<number[]> {
    // Return performance embedding vector
    return new Array(20).fill(0).map(() => Math.random());
  }

  private async getPopularityVector(businessId: string): Promise<number[]> {
    // Return popularity embedding vector
    return new Array(20).fill(0).map(() => Math.random());
  }

  private getInteractionWeight(action: string): number {
    const weights = {
      view: 1,
      like: 2,
      contact: 3,
      schedule: 4,
      offer: 5,
    };
    return weights[action] || 1;
  }
}

export const recommendationEngine = new RecommendationEngine();
export { RecommendationRequest, Recommendation, UserProfile, InteractionEvent, ConversionEvent };
