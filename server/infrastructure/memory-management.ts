// Server-side memory management with demand paging
import { performance } from 'perf_hooks';

interface MemoryPage {
  id: string;
  data: any;
  lastAccessed: number;
  accessCount: number;
  size: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

class ServerMemoryManager {
  private pages = new Map<string, MemoryPage>();
  private readonly MAX_MEMORY_MB = 256; // 256MB server memory limit
  private readonly PAGE_SIZE_KB = 1024; // 1MB page size
  private readonly MAX_PAGES = Math.floor((this.MAX_MEMORY_MB * 1024) / this.PAGE_SIZE_KB);

  private totalMemoryUsed = 0;
  private evictionCount = 0;

  // Load data with intelligent caching
  async loadPage(pageId: string, loader: () => Promise<any>, priority: 'critical' | 'high' | 'medium' | 'low' = 'medium'): Promise<any> {
    const existingPage = this.pages.get(pageId);

    if (existingPage) {
      existingPage.lastAccessed = Date.now();
      existingPage.accessCount++;
      return existingPage.data;
    }

    // Load new data
    const data = await loader();
    const size = this.estimateSize(data);

    // Check memory limits
    if (this.pages.size >= this.MAX_PAGES || this.totalMemoryUsed + size > this.MAX_MEMORY_MB * 1024 * 1024) {
      this.evictPages(size);
    }

    // Create new page
    const page: MemoryPage = {
      id: pageId,
      data,
      lastAccessed: Date.now(),
      accessCount: 1,
      size,
      priority,
    };

    this.pages.set(pageId, page);
    this.totalMemoryUsed += size;

    return data;
  }

  // Intelligent page eviction
  private evictPages(requiredSize: number) {
    const sortedPages = Array.from(this.pages.entries())
      .sort(([, a], [, b]) => {
        const priorityWeight = { critical: 1000, high: 100, medium: 10, low: 1 };
        const scoreA = (a.accessCount * priorityWeight[a.priority]) / (Date.now() - a.lastAccessed);
        const scoreB = (b.accessCount * priorityWeight[b.priority]) / (Date.now() - b.lastAccessed);
        return scoreA - scoreB;
      });

    let freedSize = 0;
    const targetSize = requiredSize + (this.MAX_MEMORY_MB * 1024 * 1024 * 0.15); // Free 15% extra

    for (const [pageId, page] of sortedPages) {
      if (freedSize >= targetSize) {break;}
      if (page.priority === 'critical') {continue;}

      this.pages.delete(pageId);
      this.totalMemoryUsed -= page.size;
      this.evictionCount++;
      freedSize += page.size;
    }
  }

  // Estimate object size
  private estimateSize(obj: any): number {
    return JSON.stringify(obj).length * 2; // Rough estimate
  }

  // Preload critical server data
  async preloadCriticalData() {
    const criticalData = [
      {
        id: 'health-check',
        loader: () => Promise.resolve({
          status: 'ok',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          version: '1.0.0',
        }),
        priority: 'critical' as const,
      },
      {
        id: 'system-stats',
        loader: () => Promise.resolve({
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          uptime: process.uptime(),
        }),
        priority: 'high' as const,
      },
    ];

    await Promise.all(
      criticalData.map(data =>
        this.loadPage(data.id, data.loader, data.priority),
      ),
    );
  }

  // Get memory metrics
  getMemoryMetrics() {
    return {
      totalMemoryUsed: this.totalMemoryUsed,
      pageCount: this.pages.size,
      evictionCount: this.evictionCount,
      memoryUsagePercent: (this.totalMemoryUsed / (this.MAX_MEMORY_MB * 1024 * 1024)) * 100,
    };
  }

  // Force garbage collection
  forceGarbageCollection() {
    // Clear expired pages (older than 10 minutes)
    const now = Date.now();
    const expiredPages = Array.from(this.pages.entries())
      .filter(([, page]) => now - page.lastAccessed > 10 * 60 * 1000);

    for (const [pageId, page] of expiredPages) {
      if (page.priority !== 'critical') {
        this.pages.delete(pageId);
        this.totalMemoryUsed -= page.size;
      }
    }

    // Force Node.js garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }
}

export const serverMemoryManager = new ServerMemoryManager();

// Initialize server memory management
export const initializeServerMemoryManagement = async () => {
  await serverMemoryManager.preloadCriticalData();

  // Set up periodic garbage collection
  setInterval(() => {
    serverMemoryManager.forceGarbageCollection();
  }, 5 * 60 * 1000); // Every 5 minutes

  // Monitor memory usage
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;

    if (heapUsedMB > 200) { // If using more than 200MB
      serverMemoryManager.forceGarbageCollection();
    }
  }, 60000); // Every minute

  console.log('✅ Server memory management initialized with demand paging');
};
