import { z } from 'zod';
import axios from 'axios';

// Search and ML types
export interface SearchFilters {
  query?: string;
  industry?: string[];
  location?: string;
  priceRange?: {
    min: number;
    max: number;
  };
  revenue?: {
    min: number;
    max: number;
  };
  employeeCount?: {
    min: number;
    max: number;
  };
  establishedYear?: {
    min: number;
    max: number;
  };
  businessType?: string[];
  tags?: string[];
  sortBy?: 'relevance' | 'price' | 'revenue' | 'established' | 'distance';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface SearchResult {
  id: number;
  businessName: string;
  description: string;
  industry: string;
  location: string;
  askingPrice: number;
  revenue: number;
  employeeCount: number;
  establishedYear: number;
  tags: string[];
  score: number;
  distance?: number;
  matchReasons: string[];
  highlights: string[];
  seller: {
    name: string;
    rating: number;
    responseTime: string;
  };
  financials: {
    netProfit: number;
    assets: number;
    liabilities: number;
    ebitda: number;
  };
  images: string[];
  documents: string[];
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  took: number;
  aggregations?: {
    industries: { [key: string]: number };
    locations: { [key: string]: number };
    priceRanges: { [key: string]: number };
  };
}

export interface MLMatchingPreferences {
  userId: number;
  role: 'buyer' | 'seller';
  preferences: {
    industries: string[];
    locations: string[];
    budgetRange: {
      min: number;
      max: number;
    };
    businessSize: 'micro' | 'small' | 'medium' | 'large';
    growthStage: 'startup' | 'growing' | 'mature' | 'declining';
    riskTolerance: 'low' | 'medium' | 'high';
    timeframe: 'immediate' | 'short' | 'medium' | 'long';
    exitStrategy?: 'ipo' | 'acquisition' | 'management_buyout' | 'liquidation';
  };
  behaviorData: {
    viewedListings: number[];
    savedListings: number[];
    inquiredListings: number[];
    searchHistory: string[];
    clickPatterns: any[];
  };
}

export interface MLRecommendation {
  listingId: number;
  score: number;
  confidence: number;
  reasons: string[];
  category: 'perfect_match' | 'good_match' | 'potential_match' | 'exit_opportunity';
  matchFactors: {
    industry: number;
    location: number;
    price: number;
    size: number;
    growth: number;
    risk: number;
    behavioral: number;
  };
}

// ElasticSearch configuration
interface ElasticSearchConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  apiKey?: string;
}

// Geographic distance calculation
interface Coordinates {
  latitude: number;
  longitude: number;
}

// Validation schemas
const searchFiltersSchema = z.object({
  query: z.string().optional(),
  industry: z.array(z.string()).optional(),
  location: z.string().optional(),
  priceRange: z.object({
    min: z.number(),
    max: z.number()
  }).optional(),
  revenue: z.object({
    min: z.number(),
    max: z.number()
  }).optional(),
  employeeCount: z.object({
    min: z.number(),
    max: z.number()
  }).optional(),
  establishedYear: z.object({
    min: z.number(),
    max: z.number()
  }).optional(),
  businessType: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  sortBy: z.enum(['relevance', 'price', 'revenue', 'established', 'distance']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional()
});

class SearchAndMatchmakingService {
  private elasticConfig: ElasticSearchConfig;
  private mlModelEndpoint: string;
  private userPreferences: Map<number, MLMatchingPreferences> = new Map();

  constructor() {
    this.elasticConfig = {
      host: process.env.ELASTICSEARCH_HOST || 'localhost',
      port: parseInt(process.env.ELASTICSEARCH_PORT || '9200'),
      username: process.env.ELASTICSEARCH_USERNAME,
      password: process.env.ELASTICSEARCH_PASSWORD,
      apiKey: process.env.ELASTICSEARCH_API_KEY
    };
    
    this.mlModelEndpoint = process.env.ML_MODEL_ENDPOINT || 'http://localhost:8000';
  }

  // ElasticSearch query builder
  private buildElasticQuery(filters: SearchFilters): any {
    const query: any = {
      bool: {
        must: [],
        should: [],
        filter: []
      }
    };

    // Text search
    if (filters.query) {
      query.bool.must.push({
        multi_match: {
          query: filters.query,
          fields: [
            'businessName^3',
            'description^2',
            'industry^2',
            'tags^1.5',
            'location'
          ],
          type: 'best_fields',
          fuzziness: 'AUTO'
        }
      });
    }

    // Industry filter
    if (filters.industry && filters.industry.length > 0) {
      query.bool.filter.push({
        terms: { industry: filters.industry }
      });
    }

    // Location filter
    if (filters.location) {
      query.bool.should.push({
        match: { location: filters.location }
      });
    }

    // Price range filter
    if (filters.priceRange) {
      query.bool.filter.push({
        range: {
          askingPrice: {
            gte: filters.priceRange.min,
            lte: filters.priceRange.max
          }
        }
      });
    }

    // Revenue filter
    if (filters.revenue) {
      query.bool.filter.push({
        range: {
          revenue: {
            gte: filters.revenue.min,
            lte: filters.revenue.max
          }
        }
      });
    }

    // Employee count filter
    if (filters.employeeCount) {
      query.bool.filter.push({
        range: {
          employeeCount: {
            gte: filters.employeeCount.min,
            lte: filters.employeeCount.max
          }
        }
      });
    }

    // Established year filter
    if (filters.establishedYear) {
      query.bool.filter.push({
        range: {
          establishedYear: {
            gte: filters.establishedYear.min,
            lte: filters.establishedYear.max
          }
        }
      });
    }

    // Business type filter
    if (filters.businessType && filters.businessType.length > 0) {
      query.bool.filter.push({
        terms: { businessType: filters.businessType }
      });
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      query.bool.should.push({
        terms: { tags: filters.tags }
      });
    }

    return query;
  }

  // Geographic distance calculation using Haversine formula
  private calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(coord2.latitude - coord1.latitude);
    const dLon = this.toRadians(coord2.longitude - coord1.longitude);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(coord1.latitude)) * Math.cos(this.toRadians(coord2.latitude)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Mock ElasticSearch call (replace with actual ES client)
  private async searchElasticSearch(query: any, filters: SearchFilters): Promise<any> {
    // Mock implementation - in production, use @elastic/elasticsearch client
    console.log('ElasticSearch Query:', JSON.stringify(query, null, 2));
    
    // Mock results based on filters
    const mockResults = [
      {
        id: 1,
        businessName: 'TechCorp Solutions',
        description: 'Leading software development company specializing in enterprise solutions',
        industry: 'Technology',
        location: 'Bhubaneswar, Odisha',
        askingPrice: 5000000,
        revenue: 12000000,
        employeeCount: 25,
        establishedYear: 2015,
        tags: ['software', 'enterprise', 'saas'],
        seller: {
          name: 'Rajesh Kumar',
          rating: 4.5,
          responseTime: '2 hours'
        },
        financials: {
          netProfit: 2500000,
          assets: 8000000,
          liabilities: 3000000,
          ebitda: 3200000
        },
        images: ['tech1.jpg', 'tech2.jpg'],
        documents: ['financials.pdf', 'legal.pdf'],
        coordinates: {
          latitude: 20.2961,
          longitude: 85.8245
        }
      },
      {
        id: 2,
        businessName: 'Green Foods Processing',
        description: 'Organic food processing unit with state-of-the-art machinery',
        industry: 'Food Processing',
        location: 'Cuttack, Odisha',
        askingPrice: 3500000,
        revenue: 8000000,
        employeeCount: 18,
        establishedYear: 2018,
        tags: ['organic', 'food', 'processing'],
        seller: {
          name: 'Priya Sharma',
          rating: 4.2,
          responseTime: '1 hour'
        },
        financials: {
          netProfit: 1800000,
          assets: 5500000,
          liabilities: 2000000,
          ebitda: 2200000
        },
        images: ['food1.jpg', 'food2.jpg'],
        documents: ['licenses.pdf', 'audit.pdf'],
        coordinates: {
          latitude: 20.4625,
          longitude: 85.8828
        }
      }
    ];

    return {
      hits: {
        total: { value: mockResults.length },
        hits: mockResults.map(result => ({
          _id: result.id,
          _source: result,
          _score: Math.random() * 10
        }))
      },
      took: 45,
      aggregations: {
        industries: {
          buckets: [
            { key: 'Technology', doc_count: 15 },
            { key: 'Food Processing', doc_count: 12 },
            { key: 'Manufacturing', doc_count: 10 }
          ]
        },
        locations: {
          buckets: [
            { key: 'Bhubaneswar', doc_count: 20 },
            { key: 'Cuttack', doc_count: 15 },
            { key: 'Rourkela', doc_count: 8 }
          ]
        }
      }
    };
  }

  // Main search method
  async search(filters: SearchFilters, userLocation?: Coordinates): Promise<SearchResponse> {
    const validatedFilters = searchFiltersSchema.parse(filters);
    
    const query = this.buildElasticQuery(validatedFilters);
    const esResponse = await this.searchElasticSearch(query, validatedFilters);
    
    const results: SearchResult[] = esResponse.hits.hits.map((hit: any) => {
      const source = hit._source;
      const result: SearchResult = {
        ...source,
        score: hit._score,
        matchReasons: this.generateMatchReasons(source, validatedFilters),
        highlights: this.generateHighlights(source, validatedFilters)
      };

      // Calculate distance if user location is provided
      if (userLocation && source.coordinates) {
        result.distance = this.calculateDistance(userLocation, source.coordinates);
      }

      return result;
    });

    // Sort results if distance sorting is requested
    if (validatedFilters.sortBy === 'distance' && userLocation) {
      results.sort((a, b) => {
        const distA = a.distance || Infinity;
        const distB = b.distance || Infinity;
        return validatedFilters.sortOrder === 'desc' ? distB - distA : distA - distB;
      });
    }

    return {
      results,
      total: esResponse.hits.total.value,
      page: validatedFilters.page || 1,
      limit: validatedFilters.limit || 20,
      took: esResponse.took,
      aggregations: this.processAggregations(esResponse.aggregations)
    };
  }

  // Generate match reasons
  private generateMatchReasons(listing: any, filters: SearchFilters): string[] {
    const reasons: string[] = [];
    
    if (filters.industry && filters.industry.includes(listing.industry)) {
      reasons.push(`Matches your preferred industry: ${listing.industry}`);
    }
    
    if (filters.priceRange && listing.askingPrice >= filters.priceRange.min && listing.askingPrice <= filters.priceRange.max) {
      reasons.push('Within your budget range');
    }
    
    if (filters.location && listing.location.includes(filters.location)) {
      reasons.push(`Located in your preferred area: ${listing.location}`);
    }
    
    if (listing.financials?.netProfit > 0) {
      reasons.push('Profitable business with positive cash flow');
    }
    
    if (listing.seller.rating > 4.0) {
      reasons.push('Highly rated seller');
    }
    
    return reasons;
  }

  // Generate search highlights
  private generateHighlights(listing: any, filters: SearchFilters): string[] {
    const highlights: string[] = [];
    
    if (filters.query) {
      const queryLower = filters.query.toLowerCase();
      if (listing.businessName.toLowerCase().includes(queryLower)) {
        highlights.push(`Business name matches: "${filters.query}"`);
      }
      if (listing.description.toLowerCase().includes(queryLower)) {
        highlights.push(`Description contains: "${filters.query}"`);
      }
    }
    
    return highlights;
  }

  // Process ElasticSearch aggregations
  private processAggregations(aggregations: any): any {
    if (!aggregations) return {};
    
    const processed: any = {};
    
    Object.keys(aggregations).forEach(key => {
      const agg = aggregations[key];
      if (agg.buckets) {
        processed[key] = {};
        agg.buckets.forEach((bucket: any) => {
          processed[key][bucket.key] = bucket.doc_count;
        });
      }
    });
    
    return processed;
  }

  // ML-based recommendations
  async getMLRecommendations(userId: number, limit: number = 10): Promise<MLRecommendation[]> {
    const userPrefs = this.userPreferences.get(userId);
    if (!userPrefs) {
      throw new Error('User preferences not found');
    }

    try {
      // Mock ML API call - in production, call actual ML service
      const mlResponse = await this.callMLService({
        userId,
        preferences: userPrefs.preferences,
        behaviorData: userPrefs.behaviorData,
        requestType: 'recommendations',
        limit
      });

      return mlResponse.recommendations || [];
    } catch (error) {
      console.error('ML service error:', error);
      return this.generateFallbackRecommendations(userPrefs, limit);
    }
  }

  // Mock ML service call
  private async callMLService(payload: any): Promise<any> {
    // Mock implementation - in production, use actual ML service
    console.log('ML Service Request:', JSON.stringify(payload, null, 2));
    
    // Generate mock recommendations
    const mockRecommendations: MLRecommendation[] = [
      {
        listingId: 1,
        score: 0.92,
        confidence: 0.85,
        reasons: ['Industry match', 'Price range', 'Location preference'],
        category: 'perfect_match',
        matchFactors: {
          industry: 0.95,
          location: 0.88,
          price: 0.92,
          size: 0.85,
          growth: 0.78,
          risk: 0.82,
          behavioral: 0.90
        }
      },
      {
        listingId: 2,
        score: 0.78,
        confidence: 0.72,
        reasons: ['Similar business model', 'Good financials'],
        category: 'good_match',
        matchFactors: {
          industry: 0.75,
          location: 0.65,
          price: 0.85,
          size: 0.80,
          growth: 0.88,
          risk: 0.70,
          behavioral: 0.75
        }
      }
    ];

    return {
      recommendations: mockRecommendations,
      model_version: '1.0.0',
      processing_time: 234
    };
  }

  // Fallback recommendations when ML service is unavailable
  private generateFallbackRecommendations(userPrefs: MLMatchingPreferences, limit: number): MLRecommendation[] {
    // Simple rule-based fallback
    const fallbackRecommendations: MLRecommendation[] = [
      {
        listingId: 1,
        score: 0.75,
        confidence: 0.60,
        reasons: ['Industry preference match'],
        category: 'good_match',
        matchFactors: {
          industry: 0.80,
          location: 0.70,
          price: 0.75,
          size: 0.65,
          growth: 0.60,
          risk: 0.70,
          behavioral: 0.50
        }
      }
    ];

    return fallbackRecommendations.slice(0, limit);
  }

  // Update user preferences and behavior
  async updateUserPreferences(userId: number, preferences: Partial<MLMatchingPreferences>): Promise<void> {
    const existing = this.userPreferences.get(userId);
    if (existing) {
      const updated = { ...existing, ...preferences };
      this.userPreferences.set(userId, updated);
    } else {
      // Create new preferences with defaults
      const newPrefs: MLMatchingPreferences = {
        userId,
        role: 'buyer',
        preferences: {
          industries: [],
          locations: [],
          budgetRange: { min: 0, max: 10000000 },
          businessSize: 'small',
          growthStage: 'growing',
          riskTolerance: 'medium',
          timeframe: 'medium'
        },
        behaviorData: {
          viewedListings: [],
          savedListings: [],
          inquiredListings: [],
          searchHistory: [],
          clickPatterns: []
        },
        ...preferences
      };
      this.userPreferences.set(userId, newPrefs);
    }
  }

  // Track user behavior
  async trackUserBehavior(userId: number, action: string, data: any): Promise<void> {
    const userPrefs = this.userPreferences.get(userId);
    if (!userPrefs) return;

    switch (action) {
      case 'view_listing':
        userPrefs.behaviorData.viewedListings.push(data.listingId);
        break;
      case 'save_listing':
        userPrefs.behaviorData.savedListings.push(data.listingId);
        break;
      case 'inquire_listing':
        userPrefs.behaviorData.inquiredListings.push(data.listingId);
        break;
      case 'search':
        userPrefs.behaviorData.searchHistory.push(data.query);
        break;
      case 'click':
        userPrefs.behaviorData.clickPatterns.push({
          timestamp: new Date(),
          element: data.element,
          page: data.page,
          context: data.context
        });
        break;
    }

    this.userPreferences.set(userId, userPrefs);
  }

  // Get similar listings
  async getSimilarListings(listingId: number, limit: number = 5): Promise<SearchResult[]> {
    // Mock implementation - in production, use ES More Like This query
    const mockSimilar = await this.search({
      query: 'technology software',
      limit
    });

    return mockSimilar.results.filter(r => r.id !== listingId);
  }

  // Exit opportunity detection for EaaS
  async detectExitOpportunities(userId: number): Promise<MLRecommendation[]> {
    const userPrefs = this.userPreferences.get(userId);
    if (!userPrefs) return [];

    // Look for distressed businesses or exit opportunities
    const exitOpportunities = await this.search({
      tags: ['distressed', 'quick_sale', 'exit_opportunity'],
      sortBy: 'price',
      sortOrder: 'asc',
      limit: 10
    });

    return exitOpportunities.results.map(listing => ({
      listingId: listing.id,
      score: 0.8,
      confidence: 0.7,
      reasons: ['Exit opportunity detected', 'Below market price', 'Quick sale potential'],
      category: 'exit_opportunity' as const,
      matchFactors: {
        industry: 0.7,
        location: 0.6,
        price: 0.9,
        size: 0.8,
        growth: 0.3,
        risk: 0.9,
        behavioral: 0.6
      }
    }));
  }

  // Analytics and insights
  async getSearchAnalytics(userId: number): Promise<any> {
    const userPrefs = this.userPreferences.get(userId);
    if (!userPrefs) return null;

    return {
      searchCount: userPrefs.behaviorData.searchHistory.length,
      viewedListings: userPrefs.behaviorData.viewedListings.length,
      savedListings: userPrefs.behaviorData.savedListings.length,
      inquiredListings: userPrefs.behaviorData.inquiredListings.length,
      topIndustries: this.getTopItems(userPrefs.behaviorData.searchHistory, 'industry'),
      topLocations: this.getTopItems(userPrefs.behaviorData.searchHistory, 'location'),
      conversionRate: userPrefs.behaviorData.inquiredListings.length / Math.max(userPrefs.behaviorData.viewedListings.length, 1)
    };
  }

  private getTopItems(searchHistory: string[], type: string): string[] {
    // Mock implementation - extract top items from search history
    return ['Technology', 'Food Processing', 'Manufacturing'];
  }
}

export const searchAndMatchmakingService = new SearchAndMatchmakingService();