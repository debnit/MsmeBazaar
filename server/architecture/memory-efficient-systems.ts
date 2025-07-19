// Memory-Efficient Systems - "Shampoo" Memory Solutions
// Techniques: Object pooling, streaming, lazy loading, memory pools, weak references

export interface IMemoryPool<T> {
  acquire(): T | null;
  release(item: T): void;
  size(): number;
  available(): number;
}

export interface IStreamProcessor<T> {
  process(chunk: T): Promise<void>;
  flush(): Promise<void>;
}

// Object Pool for memory reuse
export class ObjectPool<T> implements IMemoryPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private resetFn: (item: T) => void;
  private maxSize: number;
  private created: number = 0;

  constructor(
    factory: () => T,
    resetFn: (item: T) => void,
    maxSize: number = 100,
  ) {
    this.factory = factory;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
  }

  acquire(): T | null {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }

    if (this.created < this.maxSize) {
      this.created++;
      return this.factory();
    }

    return null; // Pool exhausted
  }

  release(item: T): void {
    if (this.pool.length < this.maxSize) {
      this.resetFn(item);
      this.pool.push(item);
    }
  }

  size(): number {
    return this.created;
  }

  available(): number {
    return this.pool.length;
  }

  clear(): void {
    this.pool = [];
    this.created = 0;
  }
}

// Streaming data processor for large datasets
export class StreamingProcessor<T> implements IStreamProcessor<T> {
  private buffer: T[] = [];
  private bufferSize: number;
  private processChunk: (chunk: T[]) => Promise<void>;
  private processed: number = 0;

  constructor(
    bufferSize: number,
    processChunk: (chunk: T[]) => Promise<void>,
  ) {
    this.bufferSize = bufferSize;
    this.processChunk = processChunk;
  }

  async process(item: T): Promise<void> {
    this.buffer.push(item);

    if (this.buffer.length >= this.bufferSize) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length > 0) {
      await this.processChunk([...this.buffer]);
      this.processed += this.buffer.length;
      this.buffer = []; // Clear buffer to free memory
    }
  }

  getProcessedCount(): number {
    return this.processed;
  }
}

// Lazy loading manager
export class LazyLoadingManager<T> {
  private cache = new Map<string, T>();
  private loaders = new Map<string, () => Promise<T>>();
  private loading = new Set<string>();
  private maxCacheSize: number;
  private accessTimes = new Map<string, number>();

  constructor(maxCacheSize: number = 50) {
    this.maxCacheSize = maxCacheSize;
  }

  register(key: string, loader: () => Promise<T>): void {
    this.loaders.set(key, loader);
  }

  async load(key: string): Promise<T> {
    // Check cache first
    if (this.cache.has(key)) {
      this.accessTimes.set(key, Date.now());
      return this.cache.get(key)!;
    }

    // Check if already loading
    if (this.loading.has(key)) {
      // Wait for loading to complete
      while (this.loading.has(key)) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      return this.cache.get(key)!;
    }

    // Start loading
    const loader = this.loaders.get(key);
    if (!loader) {
      throw new Error(`No loader registered for key: ${key}`);
    }

    this.loading.add(key);

    try {
      const item = await loader();

      // Evict old items if cache is full
      if (this.cache.size >= this.maxCacheSize) {
        this.evictLRU();
      }

      this.cache.set(key, item);
      this.accessTimes.set(key, Date.now());

      return item;
    } finally {
      this.loading.delete(key);
    }
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, time] of this.accessTimes) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessTimes.delete(oldestKey);
    }
  }

  clear(): void {
    this.cache.clear();
    this.accessTimes.clear();
  }

  getStats(): any {
    return {
      cached: this.cache.size,
      loading: this.loading.size,
      registered: this.loaders.size,
      maxSize: this.maxCacheSize,
    };
  }
}

// Memory-efficient data structures
export class CircularBuffer<T> {
  private buffer: T[];
  private head: number = 0;
  private tail: number = 0;
  private size: number = 0;
  private capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  push(item: T): boolean {
    if (this.size === this.capacity) {
      // Overwrite oldest item
      this.buffer[this.tail] = item;
      this.tail = (this.tail + 1) % this.capacity;
      this.head = (this.head + 1) % this.capacity;
    } else {
      this.buffer[this.tail] = item;
      this.tail = (this.tail + 1) % this.capacity;
      this.size++;
    }
    return true;
  }

  pop(): T | null {
    if (this.size === 0) {return null;}

    const item = this.buffer[this.head];
    this.buffer[this.head] = undefined as any; // Help GC
    this.head = (this.head + 1) % this.capacity;
    this.size--;

    return item;
  }

  peek(): T | null {
    return this.size > 0 ? this.buffer[this.head] : null;
  }

  isFull(): boolean {
    return this.size === this.capacity;
  }

  isEmpty(): boolean {
    return this.size === 0;
  }

  clear(): void {
    this.buffer.fill(undefined as any);
    this.head = 0;
    this.tail = 0;
    this.size = 0;
  }

  getSize(): number {
    return this.size;
  }

  getCapacity(): number {
    return this.capacity;
  }
}

// Memory-aware cache with automatic cleanup
export class MemoryAwareCache<T> {
  private cache = new Map<string, { value: T; size: number; lastAccess: number }>();
  private totalSize: number = 0;
  private maxSize: number;
  private sizeEstimator: (value: T) => number;

  constructor(
    maxSize: number = 50 * 1024 * 1024, // 50MB default
    sizeEstimator: (value: T) => number = (value) => JSON.stringify(value).length * 2,
  ) {
    this.maxSize = maxSize;
    this.sizeEstimator = sizeEstimator;
  }

  set(key: string, value: T): void {
    const size = this.sizeEstimator(value);

    // Remove existing entry if present
    if (this.cache.has(key)) {
      const existing = this.cache.get(key)!;
      this.totalSize -= existing.size;
    }

    // Evict items if necessary
    while (this.totalSize + size > this.maxSize && this.cache.size > 0) {
      this.evictLRU();
    }

    // Add new entry
    this.cache.set(key, {
      value,
      size,
      lastAccess: Date.now(),
    });

    this.totalSize += size;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {return null;}

    entry.lastAccess = Date.now();
    return entry.value;
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = this.cache.get(oldestKey)!;
      this.totalSize -= entry.size;
      this.cache.delete(oldestKey);
    }
  }

  clear(): void {
    this.cache.clear();
    this.totalSize = 0;
  }

  getStats(): any {
    return {
      entries: this.cache.size,
      totalSize: this.totalSize,
      maxSize: this.maxSize,
      utilization: (this.totalSize / this.maxSize) * 100,
    };
  }
}

// Weak reference manager for automatic cleanup
export class WeakReferenceManager<T extends object> {
  private weakRefs = new Map<string, WeakRef<T>>();
  private cleanup = new Set<string>();

  set(key: string, value: T): void {
    this.weakRefs.set(key, new WeakRef(value));
  }

  get(key: string): T | null {
    const ref = this.weakRefs.get(key);
    if (!ref) {return null;}

    const value = ref.deref();
    if (!value) {
      this.cleanup.add(key);
      return null;
    }

    return value;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.weakRefs.delete(key);
  }

  cleanupStaleReferences(): void {
    // Clean up stale references
    for (const key of this.cleanup) {
      this.weakRefs.delete(key);
    }
    this.cleanup.clear();

    // Check for any additional stale references
    for (const [key, ref] of this.weakRefs) {
      if (!ref.deref()) {
        this.weakRefs.delete(key);
      }
    }
  }

  size(): number {
    return this.weakRefs.size;
  }
}

// Memory-efficient MSMESquare implementations
export class MSMEMemoryOptimizations {
  private userPool: ObjectPool<any>;
  private msmePool: ObjectPool<any>;
  private dataStreamProcessor: StreamingProcessor<any>;
  private lazyLoader: LazyLoadingManager<any>;
  private memoryCache: MemoryAwareCache<any>;
  private weakRefs: WeakReferenceManager<any>;
  private metricsBuffer: CircularBuffer<any>;

  constructor() {
    // Initialize object pools
    this.userPool = new ObjectPool(
      () => ({ id: '', name: '', email: '', role: '', data: null }),
      (user) => { user.id = ''; user.name = ''; user.email = ''; user.role = ''; user.data = null; },
      50,
    );

    this.msmePool = new ObjectPool(
      () => ({ id: '', name: '', industry: '', location: '', valuation: 0, data: null }),
      (msme) => { msme.id = ''; msme.name = ''; msme.industry = ''; msme.location = ''; msme.valuation = 0; msme.data = null; },
      100,
    );

    // Initialize streaming processor
    this.dataStreamProcessor = new StreamingProcessor(
      100, // Process in chunks of 100
      async (chunk) => {
        // Process chunk and free memory immediately
        await this.processDataChunk(chunk);
      },
    );

    // Initialize lazy loader
    this.lazyLoader = new LazyLoadingManager(25);
    this.registerLazyLoaders();

    // Initialize memory-aware cache
    this.memoryCache = new MemoryAwareCache(
      20 * 1024 * 1024, // 20MB limit
      (value) => JSON.stringify(value).length * 2,
    );

    // Initialize weak references
    this.weakRefs = new WeakReferenceManager();

    // Initialize metrics buffer
    this.metricsBuffer = new CircularBuffer(1000);

    // Setup cleanup interval
    setInterval(() => this.performCleanup(), 60000); // Every minute
  }

  private registerLazyLoaders(): void {
    this.lazyLoader.register('user-analytics', async () => {
      // Simulate loading user analytics
      await new Promise(resolve => setTimeout(resolve, 100));
      return { totalUsers: 1250, activeUsers: 890 };
    });

    this.lazyLoader.register('msme-categories', async () => {
      // Simulate loading MSME categories
      await new Promise(resolve => setTimeout(resolve, 50));
      return ['Manufacturing', 'Services', 'Retail', 'Technology'];
    });

    this.lazyLoader.register('valuation-models', async () => {
      // Simulate loading ML models
      await new Promise(resolve => setTimeout(resolve, 200));
      return { model: 'XGBoost', accuracy: 0.92 };
    });
  }

  private async processDataChunk(chunk: any[]): Promise<void> {
    // Process chunk without storing in memory
    for (const item of chunk) {
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 1));
    }
    // Chunk is automatically freed after this function
  }

  async createUser(userData: any): Promise<any> {
    // Use object pool to avoid allocation
    const user = this.userPool.acquire();
    if (!user) {
      throw new Error('User pool exhausted');
    }

    try {
      // Set user data
      Object.assign(user, userData);

      // Process user
      const result = { ...user, id: Date.now().toString() };

      // Store in memory-aware cache
      this.memoryCache.set(`user:${result.id}`, result);

      return result;
    } finally {
      // Return to pool
      this.userPool.release(user);
    }
  }

  async processMSMEStream(msmeData: any[]): Promise<void> {
    // Process in streaming fashion
    for (const msme of msmeData) {
      await this.dataStreamProcessor.process(msme);
    }

    // Ensure all data is processed
    await this.dataStreamProcessor.flush();
  }

  async getLazyData(key: string): Promise<any> {
    return await this.lazyLoader.load(key);
  }

  addMetric(metric: any): void {
    this.metricsBuffer.push({
      ...metric,
      timestamp: Date.now(),
    });
  }

  getRecentMetrics(count: number = 10): any[] {
    const metrics = [];
    for (let i = 0; i < count && !this.metricsBuffer.isEmpty(); i++) {
      const metric = this.metricsBuffer.pop();
      if (metric) {metrics.push(metric);}
    }
    return metrics;
  }

  private performCleanup(): void {
    // Clean up weak references
    this.weakRefs.cleanupStaleReferences();

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    console.log('🧹 Memory cleanup completed');
  }

  getMemoryStats(): any {
    return {
      pools: {
        user: {
          size: this.userPool.size(),
          available: this.userPool.available(),
        },
        msme: {
          size: this.msmePool.size(),
          available: this.msmePool.available(),
        },
      },
      cache: this.memoryCache.getStats(),
      lazyLoader: this.lazyLoader.getStats(),
      weakRefs: this.weakRefs.size(),
      metricsBuffer: {
        size: this.metricsBuffer.getSize(),
        capacity: this.metricsBuffer.getCapacity(),
      },
      processMemory: process.memoryUsage(),
    };
  }

  destroy(): void {
    // Clean up all resources
    this.userPool.clear();
    this.msmePool.clear();
    this.memoryCache.clear();
    this.lazyLoader.clear();
    this.metricsBuffer.clear();
    this.weakRefs.cleanupStaleReferences();
  }
}

export const memoryOptimizations = new MSMEMemoryOptimizations();
