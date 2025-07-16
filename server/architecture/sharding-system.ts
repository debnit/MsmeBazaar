// Database Sharding Implementation for MSMESquare
// Horizontal partitioning for scalability

export interface IShardingStrategy {
  getShard(key: string): string;
  getAllShards(): string[];
}

export interface IShardManager {
  getConnection(shardKey: string): Promise<any>;
  executeQuery(shardKey: string, query: string, params?: any[]): Promise<any>;
  executeDistributedQuery(query: string, params?: any[]): Promise<any[]>;
}

// Sharding strategies
export class HashBasedSharding implements IShardingStrategy {
  private shards: string[];
  
  constructor(shards: string[]) {
    this.shards = shards;
  }
  
  getShard(key: string): string {
    const hash = this.simpleHash(key);
    const index = hash % this.shards.length;
    return this.shards[index];
  }
  
  getAllShards(): string[] {
    return [...this.shards];
  }
  
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

export class RangeBasedSharding implements IShardingStrategy {
  private ranges: Array<{ min: string; max: string; shard: string }>;
  
  constructor(ranges: Array<{ min: string; max: string; shard: string }>) {
    this.ranges = ranges.sort((a, b) => a.min.localeCompare(b.min));
  }
  
  getShard(key: string): string {
    for (const range of this.ranges) {
      if (key >= range.min && key <= range.max) {
        return range.shard;
      }
    }
    return this.ranges[0].shard; // Default to first shard
  }
  
  getAllShards(): string[] {
    return this.ranges.map(r => r.shard);
  }
}

export class GeographicSharding implements IShardingStrategy {
  private regionShards: Map<string, string>;
  
  constructor(regionShards: Map<string, string>) {
    this.regionShards = regionShards;
  }
  
  getShard(key: string): string {
    // Extract region from key (e.g., "user:odisha:123" -> "odisha")
    const parts = key.split(':');
    const region = parts.length > 1 ? parts[1] : 'default';
    
    return this.regionShards.get(region) || this.regionShards.get('default') || 'shard1';
  }
  
  getAllShards(): string[] {
    return Array.from(this.regionShards.values());
  }
}

// Shard Manager Implementation
export class DatabaseShardManager implements IShardManager {
  private connections = new Map<string, any>();
  private strategy: IShardingStrategy;
  
  constructor(strategy: IShardingStrategy) {
    this.strategy = strategy;
    this.initializeConnections();
  }
  
  private initializeConnections(): void {
    const shards = this.strategy.getAllShards();
    shards.forEach(shard => {
      // In real implementation, these would be actual database connections
      this.connections.set(shard, {
        name: shard,
        query: async (sql: string, params?: any[]) => {
          // Mock database query
          return { shard, sql, params, results: [] };
        }
      });
    });
  }
  
  async getConnection(shardKey: string): Promise<any> {
    const shard = this.strategy.getShard(shardKey);
    return this.connections.get(shard);
  }
  
  async executeQuery(shardKey: string, query: string, params?: any[]): Promise<any> {
    const connection = await this.getConnection(shardKey);
    if (!connection) {
      throw new Error(`No connection found for shard key: ${shardKey}`);
    }
    
    return await connection.query(query, params);
  }
  
  async executeDistributedQuery(query: string, params?: any[]): Promise<any[]> {
    const shards = this.strategy.getAllShards();
    const promises = shards.map(async (shard) => {
      const connection = this.connections.get(shard);
      if (connection) {
        return await connection.query(query, params);
      }
      return null;
    });
    
    const results = await Promise.allSettled(promises);
    return results
      .filter(result => result.status === 'fulfilled' && result.value)
      .map(result => (result as PromiseFulfilledResult<any>).value);
  }
}

// Sharded Repository Pattern
export class ShardedUserRepository {
  private shardManager: IShardManager;
  
  constructor(shardManager: IShardManager) {
    this.shardManager = shardManager;
  }
  
  async createUser(user: any): Promise<any> {
    const shardKey = `user:${user.region}:${user.id}`;
    
    const query = `
      INSERT INTO users (id, email, name, region, created_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const params = [user.id, user.email, user.name, user.region, new Date()];
    
    return await this.shardManager.executeQuery(shardKey, query, params);
  }
  
  async getUserById(id: string, region: string): Promise<any> {
    const shardKey = `user:${region}:${id}`;
    
    const query = `SELECT * FROM users WHERE id = $1`;
    const params = [id];
    
    return await this.shardManager.executeQuery(shardKey, query, params);
  }
  
  async getUsersByRegion(region: string): Promise<any[]> {
    const shardKey = `user:${region}:*`;
    
    const query = `SELECT * FROM users WHERE region = $1`;
    const params = [region];
    
    return await this.shardManager.executeQuery(shardKey, query, params);
  }
  
  async getAllUsers(): Promise<any[]> {
    const query = `SELECT * FROM users`;
    
    const results = await this.shardManager.executeDistributedQuery(query);
    
    // Merge results from all shards
    return results.reduce((acc, result) => {
      if (result && result.results) {
        acc.push(...result.results);
      }
      return acc;
    }, []);
  }
}

// Sharded MSME Repository
export class ShardedMSMERepository {
  private shardManager: IShardManager;
  
  constructor(shardManager: IShardManager) {
    this.shardManager = shardManager;
  }
  
  async createMSME(msme: any): Promise<any> {
    const shardKey = `msme:${msme.location}:${msme.id}`;
    
    const query = `
      INSERT INTO msme_listings (id, name, industry, location, valuation, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const params = [msme.id, msme.name, msme.industry, msme.location, msme.valuation, new Date()];
    
    return await this.shardManager.executeQuery(shardKey, query, params);
  }
  
  async getMSMEsByLocation(location: string): Promise<any[]> {
    const shardKey = `msme:${location}:*`;
    
    const query = `SELECT * FROM msme_listings WHERE location = $1`;
    const params = [location];
    
    return await this.shardManager.executeQuery(shardKey, query, params);
  }
  
  async searchMSMEs(criteria: any): Promise<any[]> {
    const query = `
      SELECT * FROM msme_listings 
      WHERE industry = $1 AND valuation BETWEEN $2 AND $3
    `;
    const params = [criteria.industry, criteria.minValuation, criteria.maxValuation];
    
    const results = await this.shardManager.executeDistributedQuery(query, params);
    
    // Merge and sort results
    const merged = results.reduce((acc, result) => {
      if (result && result.results) {
        acc.push(...result.results);
      }
      return acc;
    }, []);
    
    return merged.sort((a, b) => b.valuation - a.valuation);
  }
}

// Sharding Factory
export class ShardingFactory {
  static createUserSharding(): IShardManager {
    const regions = new Map([
      ['odisha', 'shard_odisha'],
      ['mumbai', 'shard_mumbai'],
      ['delhi', 'shard_delhi'],
      ['bangalore', 'shard_bangalore'],
      ['default', 'shard_default']
    ]);
    
    const strategy = new GeographicSharding(regions);
    return new DatabaseShardManager(strategy);
  }
  
  static createMSMESharding(): IShardManager {
    const shards = ['msme_shard1', 'msme_shard2', 'msme_shard3', 'msme_shard4'];
    const strategy = new HashBasedSharding(shards);
    return new DatabaseShardManager(strategy);
  }
  
  static createTransactionSharding(): IShardManager {
    const ranges = [
      { min: '0', max: '2999', shard: 'tx_small' },
      { min: '3000', max: '9999', shard: 'tx_medium' },
      { min: '10000', max: '99999', shard: 'tx_large' },
      { min: '100000', max: '999999', shard: 'tx_enterprise' }
    ];
    
    const strategy = new RangeBasedSharding(ranges);
    return new DatabaseShardManager(strategy);
  }
}

// Usage example
export const shardingService = {
  userShard: ShardingFactory.createUserSharding(),
  msmeShard: ShardingFactory.createMSMESharding(),
  transactionShard: ShardingFactory.createTransactionSharding()
};