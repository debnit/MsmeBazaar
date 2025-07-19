/**
 * 🔍 Vector Search with Pinecone
 * Semantic matchmaking for MSMEs and buyers
 */

import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import { db } from '../db';
import { msmeListings, users, vectorEmbeddings } from '@shared/schema';
import { eq, and, inArray } from 'drizzle-orm';

interface MSMEVector {
  id: string;
  values: number[];
  metadata: {
    msme_id: number;
    company_name: string;
    industry: string;
    description: string;
    annual_turnover: number;
    asking_price: number;
    location: string;
    established_year: number;
    employee_count: number;
    tags: string[];
  };
}

interface BuyerVector {
  id: string;
  values: number[];
  metadata: {
    buyer_id: number;
    name: string;
    preferred_industries: string[];
    budget_min: number;
    budget_max: number;
    preferred_locations: string[];
    experience_level: string;
    investment_timeline: string;
  };
}

interface SemanticMatch {
  msme_id: number;
  buyer_id: number;
  similarity_score: number;
  match_reasons: string[];
  confidence_level: 'high' | 'medium' | 'low';
}

export class MSMEVectorSearch {
  private pinecone: Pinecone;
  private openai: OpenAI;
  private indexName: string;
  private dimension: number;

  constructor() {
    const pineconeApiKey = process.env.PINECONE_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!pineconeApiKey || !openaiApiKey) {
      console.warn('Pinecone or OpenAI API keys not found. Vector search will be disabled.');
      return;
    }

    this.pinecone = new Pinecone({
      apiKey: pineconeApiKey,
    });

    this.openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    this.indexName = process.env.PINECONE_INDEX_NAME || 'msme-matchmaking';
    this.dimension = 1536; // OpenAI embedding dimension

    this.initializeIndex();
  }

  private async initializeIndex(): Promise<void> {
    try {
      // Check if index exists
      const indexList = await this.pinecone.listIndexes();
      const indexExists = indexList.indexes?.some(index => index.name === this.indexName);

      if (!indexExists) {
        // Create index
        await this.pinecone.createIndex({
          name: this.indexName,
          dimension: this.dimension,
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1',
            },
          },
        });

        console.log(`Created Pinecone index: ${this.indexName}`);
      }
    } catch (error) {
      console.error('Failed to initialize Pinecone index:', error);
    }
  }

  // Generate embeddings for MSME listing
  async generateMSMEEmbedding(msmeId: number): Promise<number[]> {
    const [listing] = await db
      .select()
      .from(msmeListings)
      .where(eq(msmeListings.id, msmeId));

    if (!listing) {
      throw new Error('MSME listing not found');
    }

    // Create comprehensive text representation
    const textRepresentation = [
      `Company: ${listing.companyName}`,
      `Industry: ${listing.industry}`,
      `Description: ${listing.description || ''}`,
      `Location: ${listing.city}, ${listing.state}`,
      `Annual Turnover: ₹${listing.annualTurnover?.toLocaleString() || '0'}`,
      `Asking Price: ₹${listing.askingPrice?.toLocaleString() || '0'}`,
      `Established: ${listing.establishedYear}`,
      `Employees: ${listing.employeeCount || 0}`,
      `Tags: ${listing.tags?.join(', ') || ''}`,
      `Business Model: ${listing.businessModel || ''}`,
      `Revenue Streams: ${listing.revenueStreams?.join(', ') || ''}`,
      `Assets: ${listing.assets?.join(', ') || ''}`,
      `Growth Potential: ${listing.growthPotential || ''}`,
      `Market Position: ${listing.marketPosition || ''}`,
    ].join('\n');

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: textRepresentation,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Failed to generate MSME embedding:', error);
      throw error;
    }
  }

  // Generate embeddings for buyer profile
  async generateBuyerEmbedding(buyerId: number): Promise<number[]> {
    const [buyer] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, buyerId), eq(users.role, 'buyer')));

    if (!buyer) {
      throw new Error('Buyer not found');
    }

    // Create comprehensive text representation
    const textRepresentation = [
      `Buyer: ${buyer.name}`,
      `Preferred Industries: ${buyer.preferredIndustries?.join(', ') || ''}`,
      `Budget Range: ₹${buyer.budgetMin?.toLocaleString() || '0'} - ₹${buyer.budgetMax?.toLocaleString() || '0'}`,
      `Preferred Locations: ${buyer.preferredLocations?.join(', ') || ''}`,
      `Experience Level: ${buyer.experienceLevel || ''}`,
      `Investment Timeline: ${buyer.investmentTimeline || ''}`,
      `Investment Goals: ${buyer.investmentGoals || ''}`,
      `Risk Tolerance: ${buyer.riskTolerance || ''}`,
      `Acquisition Strategy: ${buyer.acquisitionStrategy || ''}`,
      `Due Diligence Requirements: ${buyer.dueDiligenceRequirements?.join(', ') || ''}`,
      `Financing Preference: ${buyer.financingPreference || ''}`,
      `Post Acquisition Plans: ${buyer.postAcquisitionPlans || ''}`,
    ].join('\n');

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: textRepresentation,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Failed to generate buyer embedding:', error);
      throw error;
    }
  }

  // Index MSME listing
  async indexMSMEListing(msmeId: number): Promise<void> {
    try {
      const [listing] = await db
        .select()
        .from(msmeListings)
        .where(eq(msmeListings.id, msmeId));

      if (!listing) {
        throw new Error('MSME listing not found');
      }

      const embedding = await this.generateMSMEEmbedding(msmeId);

      const vector: MSMEVector = {
        id: `msme_${msmeId}`,
        values: embedding,
        metadata: {
          msme_id: msmeId,
          company_name: listing.companyName,
          industry: listing.industry,
          description: listing.description || '',
          annual_turnover: listing.annualTurnover || 0,
          asking_price: listing.askingPrice || 0,
          location: `${listing.city}, ${listing.state}`,
          established_year: listing.establishedYear || new Date().getFullYear(),
          employee_count: listing.employeeCount || 0,
          tags: listing.tags || [],
        },
      };

      const index = this.pinecone.index(this.indexName);
      await index.upsert([vector]);

      // Store embedding in database for backup
      await db.insert(vectorEmbeddings).values({
        entityId: msmeId,
        entityType: 'msme',
        embedding: embedding,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: [vectorEmbeddings.entityId, vectorEmbeddings.entityType],
        set: {
          embedding: embedding,
          updatedAt: new Date(),
        },
      });

      console.log(`Indexed MSME listing: ${msmeId}`);
    } catch (error) {
      console.error('Failed to index MSME listing:', error);
      throw error;
    }
  }

  // Index buyer profile
  async indexBuyerProfile(buyerId: number): Promise<void> {
    try {
      const [buyer] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, buyerId), eq(users.role, 'buyer')));

      if (!buyer) {
        throw new Error('Buyer not found');
      }

      const embedding = await this.generateBuyerEmbedding(buyerId);

      const vector: BuyerVector = {
        id: `buyer_${buyerId}`,
        values: embedding,
        metadata: {
          buyer_id: buyerId,
          name: buyer.name,
          preferred_industries: buyer.preferredIndustries || [],
          budget_min: buyer.budgetMin || 0,
          budget_max: buyer.budgetMax || 0,
          preferred_locations: buyer.preferredLocations || [],
          experience_level: buyer.experienceLevel || '',
          investment_timeline: buyer.investmentTimeline || '',
        },
      };

      const index = this.pinecone.index(this.indexName);
      await index.upsert([vector]);

      // Store embedding in database for backup
      await db.insert(vectorEmbeddings).values({
        entityId: buyerId,
        entityType: 'buyer',
        embedding: embedding,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: [vectorEmbeddings.entityId, vectorEmbeddings.entityType],
        set: {
          embedding: embedding,
          updatedAt: new Date(),
        },
      });

      console.log(`Indexed buyer profile: ${buyerId}`);
    } catch (error) {
      console.error('Failed to index buyer profile:', error);
      throw error;
    }
  }

  // Find similar MSMEs for a buyer
  async findSimilarMSMEs(buyerId: number, limit: number = 10): Promise<Array<{
    msme_id: number;
    similarity_score: number;
    metadata: any;
  }>> {
    try {
      const buyerEmbedding = await this.generateBuyerEmbedding(buyerId);

      const index = this.pinecone.index(this.indexName);
      const queryResponse = await index.query({
        vector: buyerEmbedding,
        topK: limit,
        includeMetadata: true,
        filter: {
          entity_type: { $eq: 'msme' },
        },
      });

      return queryResponse.matches?.map(match => ({
        msme_id: match.metadata?.msme_id as number,
        similarity_score: match.score || 0,
        metadata: match.metadata,
      })) || [];
    } catch (error) {
      console.error('Failed to find similar MSMEs:', error);
      throw error;
    }
  }

  // Find similar buyers for an MSME
  async findSimilarBuyers(msmeId: number, limit: number = 10): Promise<Array<{
    buyer_id: number;
    similarity_score: number;
    metadata: any;
  }>> {
    try {
      const msmeEmbedding = await this.generateMSMEEmbedding(msmeId);

      const index = this.pinecone.index(this.indexName);
      const queryResponse = await index.query({
        vector: msmeEmbedding,
        topK: limit,
        includeMetadata: true,
        filter: {
          entity_type: { $eq: 'buyer' },
        },
      });

      return queryResponse.matches?.map(match => ({
        buyer_id: match.metadata?.buyer_id as number,
        similarity_score: match.score || 0,
        metadata: match.metadata,
      })) || [];
    } catch (error) {
      console.error('Failed to find similar buyers:', error);
      throw error;
    }
  }

  // Generate comprehensive semantic matches
  async generateSemanticMatches(buyerId: number, limit: number = 20): Promise<SemanticMatch[]> {
    try {
      const similarMSMEs = await this.findSimilarMSMEs(buyerId, limit);
      const [buyer] = await db
        .select()
        .from(users)
        .where(eq(users.id, buyerId));

      if (!buyer) {
        throw new Error('Buyer not found');
      }

      const matches: SemanticMatch[] = [];

      for (const similar of similarMSMEs) {
        const matchReasons: string[] = [];
        let confidenceLevel: 'high' | 'medium' | 'low' = 'low';

        // Analyze match reasons
        if (similar.metadata.industry && buyer.preferredIndustries?.includes(similar.metadata.industry)) {
          matchReasons.push(`Industry match: ${similar.metadata.industry}`);
        }

        if (similar.metadata.asking_price >= (buyer.budgetMin || 0) &&
            similar.metadata.asking_price <= (buyer.budgetMax || Number.MAX_SAFE_INTEGER)) {
          matchReasons.push(`Budget compatible: ₹${similar.metadata.asking_price.toLocaleString()}`);
        }

        if (buyer.preferredLocations?.some(loc => similar.metadata.location.includes(loc))) {
          matchReasons.push(`Location preference: ${similar.metadata.location}`);
        }

        // Determine confidence level
        if (similar.similarity_score > 0.8 && matchReasons.length >= 2) {
          confidenceLevel = 'high';
        } else if (similar.similarity_score > 0.6 && matchReasons.length >= 1) {
          confidenceLevel = 'medium';
        }

        matches.push({
          msme_id: similar.msme_id,
          buyer_id: buyerId,
          similarity_score: similar.similarity_score,
          match_reasons: matchReasons,
          confidence_level: confidenceLevel,
        });
      }

      // Sort by similarity score
      return matches.sort((a, b) => b.similarity_score - a.similarity_score);
    } catch (error) {
      console.error('Failed to generate semantic matches:', error);
      throw error;
    }
  }

  // Semantic search with natural language query
  async semanticSearch(query: string, limit: number = 10): Promise<Array<{
    msme_id: number;
    similarity_score: number;
    metadata: any;
  }>> {
    try {
      const queryEmbedding = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
      });

      const index = this.pinecone.index(this.indexName);
      const queryResponse = await index.query({
        vector: queryEmbedding.data[0].embedding,
        topK: limit,
        includeMetadata: true,
        filter: {
          entity_type: { $eq: 'msme' },
        },
      });

      return queryResponse.matches?.map(match => ({
        msme_id: match.metadata?.msme_id as number,
        similarity_score: match.score || 0,
        metadata: match.metadata,
      })) || [];
    } catch (error) {
      console.error('Failed to perform semantic search:', error);
      throw error;
    }
  }

  // Bulk index all MSMEs
  async bulkIndexMSMEs(batchSize: number = 100): Promise<void> {
    try {
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const listings = await db
          .select()
          .from(msmeListings)
          .limit(batchSize)
          .offset(offset);

        if (listings.length === 0) {
          hasMore = false;
          break;
        }

        const vectors: MSMEVector[] = [];

        for (const listing of listings) {
          try {
            const embedding = await this.generateMSMEEmbedding(listing.id);

            vectors.push({
              id: `msme_${listing.id}`,
              values: embedding,
              metadata: {
                msme_id: listing.id,
                company_name: listing.companyName,
                industry: listing.industry,
                description: listing.description || '',
                annual_turnover: listing.annualTurnover || 0,
                asking_price: listing.askingPrice || 0,
                location: `${listing.city}, ${listing.state}`,
                established_year: listing.establishedYear || new Date().getFullYear(),
                employee_count: listing.employeeCount || 0,
                tags: listing.tags || [],
              },
            });

            // Rate limiting for OpenAI API
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.error(`Failed to generate embedding for MSME ${listing.id}:`, error);
          }
        }

        if (vectors.length > 0) {
          const index = this.pinecone.index(this.indexName);
          await index.upsert(vectors);
          console.log(`Indexed ${vectors.length} MSME listings`);
        }

        offset += batchSize;

        // Rate limiting for Pinecone API
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Failed to bulk index MSMEs:', error);
      throw error;
    }
  }

  // Get index statistics
  async getIndexStats(): Promise<{
    totalVectors: number;
    dimension: number;
    indexFullness: number;
    namespaces: Record<string, any>;
  }> {
    try {
      const index = this.pinecone.index(this.indexName);
      const stats = await index.describeIndexStats();

      return {
        totalVectors: stats.totalVectorCount || 0,
        dimension: stats.dimension || 0,
        indexFullness: stats.indexFullness || 0,
        namespaces: stats.namespaces || {},
      };
    } catch (error) {
      console.error('Failed to get index stats:', error);
      throw error;
    }
  }

  // Health check
  async isHealthy(): Promise<boolean> {
    try {
      const stats = await this.getIndexStats();
      return stats.totalVectors >= 0;
    } catch (error) {
      return false;
    }
  }

  // Delete vector
  async deleteVector(entityId: number, entityType: 'msme' | 'buyer'): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName);
      await index.deleteOne(`${entityType}_${entityId}`);

      // Also delete from database
      await db
        .delete(vectorEmbeddings)
        .where(and(
          eq(vectorEmbeddings.entityId, entityId),
          eq(vectorEmbeddings.entityType, entityType),
        ));
    } catch (error) {
      console.error('Failed to delete vector:', error);
      throw error;
    }
  }
}

export const vectorSearch = new MSMEVectorSearch();
