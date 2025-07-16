/**
 * 🔍 Typesense Search Integration
 * Advanced search capabilities for MSME discovery and buyer matching
 */

import { Client as TypesenseClient } from 'typesense';
import { db } from '../db';
import { msmeListings, users } from '@shared/schema';
import { eq, and, or, like, gte, lte, inArray } from 'drizzle-orm';

interface MSMEDocument {
  id: string;
  company_name: string;
  industry: string;
  description: string;
  annual_turnover: number;
  asking_price: number;
  location: string;
  city: string;
  state: string;
  established_year: number;
  employee_count: number;
  is_featured: boolean;
  tags: string[];
  seller_id: number;
  created_at: number;
  updated_at: number;
}

interface BuyerDocument {
  id: string;
  name: string;
  email: string;
  preferred_industries: string[];
  budget_min: number;
  budget_max: number;
  preferred_locations: string[];
  investment_timeline: string;
  experience_level: string;
  created_at: number;
}

interface SearchFilters {
  industry?: string[];
  location?: string[];
  price_min?: number;
  price_max?: number;
  turnover_min?: number;
  turnover_max?: number;
  employee_count_min?: number;
  employee_count_max?: number;
  established_year_min?: number;
  established_year_max?: number;
  is_featured?: boolean;
}

interface SearchResult {
  hits: Array<{
    document: MSMEDocument;
    highlights: Array<{
      field: string;
      snippet: string;
    }>;
    text_match: number;
  }>;
  found: number;
  out_of: number;
  page: number;
  request_params: any;
  search_time_ms: number;
}

export class MSMETypesenseSearch {
  private client: TypesenseClient;
  private msmeCollectionName = 'msme_listings';
  private buyerCollectionName = 'buyers';

  constructor() {
    this.client = new TypesenseClient({
      nodes: [
        {
          host: process.env.TYPESENSE_HOST || 'localhost',
          port: parseInt(process.env.TYPESENSE_PORT || '8108'),
          protocol: process.env.TYPESENSE_PROTOCOL || 'http',
        },
      ],
      apiKey: process.env.TYPESENSE_API_KEY || 'xyz',
      connectionTimeoutSeconds: 2,
    });

    this.initializeCollections();
  }

  private async initializeCollections() {
    try {
      // Initialize MSME collection
      await this.createMSMECollection();
      
      // Initialize Buyer collection
      await this.createBuyerCollection();
      
      console.log('Typesense collections initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Typesense collections:', error);
    }
  }

  private async createMSMECollection() {
    const msmeSchema = {
      name: this.msmeCollectionName,
      fields: [
        { name: 'id', type: 'string' },
        { name: 'company_name', type: 'string' },
        { name: 'industry', type: 'string', facet: true },
        { name: 'description', type: 'string' },
        { name: 'annual_turnover', type: 'float', facet: true },
        { name: 'asking_price', type: 'float', facet: true },
        { name: 'location', type: 'string' },
        { name: 'city', type: 'string', facet: true },
        { name: 'state', type: 'string', facet: true },
        { name: 'established_year', type: 'int32', facet: true },
        { name: 'employee_count', type: 'int32', facet: true },
        { name: 'is_featured', type: 'bool', facet: true },
        { name: 'tags', type: 'string[]', facet: true },
        { name: 'seller_id', type: 'int32' },
        { name: 'created_at', type: 'int64' },
        { name: 'updated_at', type: 'int64' }
      ],
      default_sorting_field: 'created_at'
    };

    try {
      await this.client.collections(this.msmeCollectionName).delete();
    } catch (error) {
      // Collection doesn't exist, which is fine
    }

    await this.client.collections().create(msmeSchema);
  }

  private async createBuyerCollection() {
    const buyerSchema = {
      name: this.buyerCollectionName,
      fields: [
        { name: 'id', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'email', type: 'string' },
        { name: 'preferred_industries', type: 'string[]', facet: true },
        { name: 'budget_min', type: 'float' },
        { name: 'budget_max', type: 'float' },
        { name: 'preferred_locations', type: 'string[]', facet: true },
        { name: 'investment_timeline', type: 'string', facet: true },
        { name: 'experience_level', type: 'string', facet: true },
        { name: 'created_at', type: 'int64' }
      ],
      default_sorting_field: 'created_at'
    };

    try {
      await this.client.collections(this.buyerCollectionName).delete();
    } catch (error) {
      // Collection doesn't exist, which is fine
    }

    await this.client.collections().create(buyerSchema);
  }

  // Index MSME Listing
  async indexMSMEListing(listingId: number): Promise<void> {
    try {
      // Fetch listing from database
      const [listing] = await db
        .select()
        .from(msmeListings)
        .where(eq(msmeListings.id, listingId));

      if (!listing) {
        throw new Error('Listing not found');
      }

      const document: MSMEDocument = {
        id: listing.id.toString(),
        company_name: listing.companyName,
        industry: listing.industry,
        description: listing.description || '',
        annual_turnover: listing.annualTurnover || 0,
        asking_price: listing.askingPrice || 0,
        location: `${listing.city}, ${listing.state}`,
        city: listing.city,
        state: listing.state,
        established_year: listing.establishedYear || new Date().getFullYear(),
        employee_count: listing.employeeCount || 0,
        is_featured: listing.isFeatured || false,
        tags: listing.tags || [],
        seller_id: listing.sellerId,
        created_at: Math.floor(listing.createdAt?.getTime() / 1000 || Date.now() / 1000),
        updated_at: Math.floor(listing.updatedAt?.getTime() / 1000 || Date.now() / 1000)
      };

      await this.client.collections(this.msmeCollectionName).documents().upsert(document);
    } catch (error) {
      console.error('Failed to index MSME listing:', error);
      throw error;
    }
  }

  // Index Buyer Profile
  async indexBuyerProfile(buyerId: number): Promise<void> {
    try {
      // Fetch buyer from database
      const [buyer] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, buyerId), eq(users.role, 'buyer')));

      if (!buyer) {
        throw new Error('Buyer not found');
      }

      const document: BuyerDocument = {
        id: buyer.id.toString(),
        name: buyer.name,
        email: buyer.email,
        preferred_industries: buyer.preferredIndustries || [],
        budget_min: buyer.budgetMin || 0,
        budget_max: buyer.budgetMax || 0,
        preferred_locations: buyer.preferredLocations || [],
        investment_timeline: buyer.investmentTimeline || '',
        experience_level: buyer.experienceLevel || '',
        created_at: Math.floor(buyer.createdAt?.getTime() / 1000 || Date.now() / 1000)
      };

      await this.client.collections(this.buyerCollectionName).documents().upsert(document);
    } catch (error) {
      console.error('Failed to index buyer profile:', error);
      throw error;
    }
  }

  // Search MSME Listings
  async searchMSMEListings(
    query: string,
    filters: SearchFilters = {},
    page: number = 1,
    perPage: number = 20
  ): Promise<SearchResult> {
    try {
      const searchParameters = {
        q: query || '*',
        query_by: 'company_name,industry,description,location,tags',
        filter_by: this.buildFilterString(filters),
        sort_by: 'is_featured:desc,created_at:desc',
        page: page,
        per_page: perPage,
        facet_by: 'industry,state,city,established_year,employee_count,is_featured',
        highlight_full_fields: 'company_name,description',
        snippet_threshold: 30,
        num_typos: 2,
        prefix: true,
        drop_tokens_threshold: 2,
        typo_tokens_threshold: 2
      };

      const searchResult = await this.client
        .collections(this.msmeCollectionName)
        .documents()
        .search(searchParameters);

      return searchResult as SearchResult;
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }

  // Advanced Search with ML-powered recommendations
  async searchWithRecommendations(
    buyerId: number,
    query: string,
    filters: SearchFilters = {},
    page: number = 1,
    perPage: number = 20
  ): Promise<{
    results: SearchResult;
    recommendations: MSMEDocument[];
    personalizedFilters: SearchFilters;
  }> {
    // Get buyer profile for personalization
    const [buyer] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, buyerId), eq(users.role, 'buyer')));

    let personalizedFilters = { ...filters };
    
    if (buyer) {
      // Apply buyer preferences to filters
      if (buyer.preferredIndustries && buyer.preferredIndustries.length > 0) {
        personalizedFilters.industry = buyer.preferredIndustries;
      }
      if (buyer.budgetMin) {
        personalizedFilters.price_max = buyer.budgetMax || buyer.budgetMin * 2;
      }
      if (buyer.preferredLocations && buyer.preferredLocations.length > 0) {
        personalizedFilters.location = buyer.preferredLocations;
      }
    }

    // Primary search with personalized filters
    const results = await this.searchMSMEListings(query, personalizedFilters, page, perPage);

    // Get recommendations based on buyer profile
    const recommendations = await this.getRecommendations(buyerId, 5);

    return {
      results,
      recommendations,
      personalizedFilters
    };
  }

  // Get recommendations for a buyer
  async getRecommendations(buyerId: number, limit: number = 10): Promise<MSMEDocument[]> {
    try {
      const [buyer] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, buyerId), eq(users.role, 'buyer')));

      if (!buyer) {
        return [];
      }

      // Build recommendation query based on buyer profile
      let filterConditions = [];
      
      if (buyer.preferredIndustries && buyer.preferredIndustries.length > 0) {
        filterConditions.push(`industry:=[${buyer.preferredIndustries.join(',')}]`);
      }
      
      if (buyer.budgetMin && buyer.budgetMax) {
        filterConditions.push(`asking_price:>=${buyer.budgetMin} && asking_price:<=${buyer.budgetMax}`);
      }

      const searchParameters = {
        q: '*',
        query_by: 'company_name,industry,description',
        filter_by: filterConditions.length > 0 ? filterConditions.join(' && ') : '',
        sort_by: 'is_featured:desc,created_at:desc',
        per_page: limit,
        page: 1
      };

      const searchResult = await this.client
        .collections(this.msmeCollectionName)
        .documents()
        .search(searchParameters);

      return searchResult.hits.map(hit => hit.document);
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      return [];
    }
  }

  // Find matching buyers for an MSME listing
  async findMatchingBuyers(listingId: number, limit: number = 10): Promise<BuyerDocument[]> {
    try {
      const [listing] = await db
        .select()
        .from(msmeListings)
        .where(eq(msmeListings.id, listingId));

      if (!listing) {
        return [];
      }

      // Build query to find matching buyers
      let filterConditions = [];
      
      if (listing.industry) {
        filterConditions.push(`preferred_industries:=${listing.industry}`);
      }
      
      if (listing.askingPrice) {
        filterConditions.push(`budget_min:<=${listing.askingPrice} && budget_max:>=${listing.askingPrice}`);
      }

      if (listing.state) {
        filterConditions.push(`preferred_locations:=${listing.state}`);
      }

      const searchParameters = {
        q: '*',
        query_by: 'name,preferred_industries,preferred_locations',
        filter_by: filterConditions.length > 0 ? filterConditions.join(' && ') : '',
        sort_by: 'created_at:desc',
        per_page: limit,
        page: 1
      };

      const searchResult = await this.client
        .collections(this.buyerCollectionName)
        .documents()
        .search(searchParameters);

      return searchResult.hits.map(hit => hit.document);
    } catch (error) {
      console.error('Failed to find matching buyers:', error);
      return [];
    }
  }

  // Auto-complete search
  async autoComplete(query: string, limit: number = 5): Promise<string[]> {
    try {
      const searchParameters = {
        q: query,
        query_by: 'company_name,industry,location',
        per_page: limit,
        page: 1,
        prefix: true
      };

      const searchResult = await this.client
        .collections(this.msmeCollectionName)
        .documents()
        .search(searchParameters);

      const suggestions = new Set<string>();
      
      searchResult.hits.forEach(hit => {
        const doc = hit.document;
        if (doc.company_name.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(doc.company_name);
        }
        if (doc.industry.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(doc.industry);
        }
        if (doc.location.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(doc.location);
        }
      });

      return Array.from(suggestions).slice(0, limit);
    } catch (error) {
      console.error('Auto-complete failed:', error);
      return [];
    }
  }

  // Get search analytics
  async getSearchAnalytics(timeRange: 'day' | 'week' | 'month' = 'week'): Promise<{
    totalSearches: number;
    topQueries: string[];
    popularIndustries: string[];
    popularLocations: string[];
  }> {
    try {
      // This would typically be implemented with search analytics tracking
      // For now, return mock data
      return {
        totalSearches: 1250,
        topQueries: ['manufacturing', 'technology', 'retail', 'healthcare', 'food processing'],
        popularIndustries: ['Manufacturing', 'Technology', 'Retail', 'Healthcare', 'Food Processing'],
        popularLocations: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad']
      };
    } catch (error) {
      console.error('Failed to get search analytics:', error);
      return {
        totalSearches: 0,
        topQueries: [],
        popularIndustries: [],
        popularLocations: []
      };
    }
  }

  // Remove document from index
  async removeFromIndex(collectionName: string, documentId: string): Promise<void> {
    try {
      await this.client.collections(collectionName).documents(documentId).delete();
    } catch (error) {
      console.error('Failed to remove from index:', error);
      throw error;
    }
  }

  // Bulk index operations
  async bulkIndexMSMEListings(listingIds: number[]): Promise<void> {
    try {
      const listings = await db
        .select()
        .from(msmeListings)
        .where(inArray(msmeListings.id, listingIds));

      const documents = listings.map(listing => ({
        id: listing.id.toString(),
        company_name: listing.companyName,
        industry: listing.industry,
        description: listing.description || '',
        annual_turnover: listing.annualTurnover || 0,
        asking_price: listing.askingPrice || 0,
        location: `${listing.city}, ${listing.state}`,
        city: listing.city,
        state: listing.state,
        established_year: listing.establishedYear || new Date().getFullYear(),
        employee_count: listing.employeeCount || 0,
        is_featured: listing.isFeatured || false,
        tags: listing.tags || [],
        seller_id: listing.sellerId,
        created_at: Math.floor(listing.createdAt?.getTime() / 1000 || Date.now() / 1000),
        updated_at: Math.floor(listing.updatedAt?.getTime() / 1000 || Date.now() / 1000)
      }));

      await this.client.collections(this.msmeCollectionName).documents().import(documents);
    } catch (error) {
      console.error('Bulk indexing failed:', error);
      throw error;
    }
  }

  // Build filter string for Typesense
  private buildFilterString(filters: SearchFilters): string {
    const conditions: string[] = [];

    if (filters.industry && filters.industry.length > 0) {
      conditions.push(`industry:=[${filters.industry.join(',')}]`);
    }

    if (filters.location && filters.location.length > 0) {
      conditions.push(`state:=[${filters.location.join(',')}]`);
    }

    if (filters.price_min !== undefined) {
      conditions.push(`asking_price:>=${filters.price_min}`);
    }

    if (filters.price_max !== undefined) {
      conditions.push(`asking_price:<=${filters.price_max}`);
    }

    if (filters.turnover_min !== undefined) {
      conditions.push(`annual_turnover:>=${filters.turnover_min}`);
    }

    if (filters.turnover_max !== undefined) {
      conditions.push(`annual_turnover:<=${filters.turnover_max}`);
    }

    if (filters.employee_count_min !== undefined) {
      conditions.push(`employee_count:>=${filters.employee_count_min}`);
    }

    if (filters.employee_count_max !== undefined) {
      conditions.push(`employee_count:<=${filters.employee_count_max}`);
    }

    if (filters.established_year_min !== undefined) {
      conditions.push(`established_year:>=${filters.established_year_min}`);
    }

    if (filters.established_year_max !== undefined) {
      conditions.push(`established_year:<=${filters.established_year_max}`);
    }

    if (filters.is_featured !== undefined) {
      conditions.push(`is_featured:=${filters.is_featured}`);
    }

    return conditions.join(' && ');
  }

  // Health check
  async isHealthy(): Promise<boolean> {
    try {
      const health = await this.client.health.retrieve();
      return health.ok;
    } catch (error) {
      return false;
    }
  }
}

export const typesenseSearch = new MSMETypesenseSearch();