// Advanced demand paging system for optimal memory management
interface PageData {
  id: string;
  data: any;
  lastAccessed: number;
  accessCount: number;
  size: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

interface CacheMetrics {
  totalSize: number;
  pageCount: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
}

class DemandPagingSystem {
  private pages = new Map<string, PageData>();
  private readonly MAX_MEMORY_MB = 64; // 64MB memory limit
  private readonly PAGE_SIZE_KB = 256; // 256KB page size
  private readonly MAX_PAGES = Math.floor((this.MAX_MEMORY_MB * 1024) / this.PAGE_SIZE_KB);
  
  private metrics: CacheMetrics = {
    totalSize: 0,
    pageCount: 0,
    hitRate: 0,
    missRate: 0,
    evictionCount: 0
  };

  private hits = 0;
  private misses = 0;

  // Load page on demand with intelligent caching
  async loadPage(pageId: string, loader: () => Promise<any>, priority: 'critical' | 'high' | 'medium' | 'low' = 'medium'): Promise<any> {
    const existingPage = this.pages.get(pageId);
    
    if (existingPage) {
      // Page hit - update access metrics
      existingPage.lastAccessed = Date.now();
      existingPage.accessCount++;
      this.hits++;
      this.updateMetrics();
      return existingPage.data;
    }

    // Page miss - load data
    this.misses++;
    const data = await loader();
    const size = this.estimateSize(data);
    
    // Check if we need to evict pages
    if (this.pages.size >= this.MAX_PAGES || this.metrics.totalSize + size > this.MAX_MEMORY_MB * 1024 * 1024) {
      this.evictPages(size);
    }
    
    // Create new page
    const page: PageData = {
      id: pageId,
      data,
      lastAccessed: Date.now(),
      accessCount: 1,
      size,
      priority
    };
    
    this.pages.set(pageId, page);
    this.metrics.totalSize += size;
    this.metrics.pageCount++;
    this.updateMetrics();
    
    return data;
  }

  // Intelligent page eviction based on LRU + priority
  private evictPages(requiredSize: number) {
    const sortedPages = Array.from(this.pages.entries())
      .sort(([, a], [, b]) => {
        // Priority weight (critical = 1000, high = 100, medium = 10, low = 1)
        const priorityWeight = {
          critical: 1000,
          high: 100,
          medium: 10,
          low: 1
        };
        
        // Calculate eviction score (lower = more likely to evict)
        const scoreA = (a.accessCount * priorityWeight[a.priority]) / (Date.now() - a.lastAccessed);
        const scoreB = (b.accessCount * priorityWeight[b.priority]) / (Date.now() - b.lastAccessed);
        
        return scoreA - scoreB;
      });

    let freedSize = 0;
    let targetSize = requiredSize + (this.MAX_MEMORY_MB * 1024 * 1024 * 0.1); // Free 10% extra

    for (const [pageId, page] of sortedPages) {
      if (freedSize >= targetSize) break;
      if (page.priority === 'critical') continue; // Never evict critical pages
      
      this.pages.delete(pageId);
      this.metrics.totalSize -= page.size;
      this.metrics.pageCount--;
      this.metrics.evictionCount++;
      freedSize += page.size;
    }
  }

  // Estimate object size in bytes
  private estimateSize(obj: any): number {
    const jsonString = JSON.stringify(obj);
    return new Blob([jsonString]).size;
  }

  // Update cache metrics
  private updateMetrics() {
    const total = this.hits + this.misses;
    this.metrics.hitRate = total > 0 ? (this.hits / total) * 100 : 0;
    this.metrics.missRate = total > 0 ? (this.misses / total) * 100 : 0;
  }

  // Preload critical pages
  async preloadCriticalPages() {
    const criticalPages = [
      {
        id: 'user-profile',
        loader: () => fetch('/api/auth/me').then(r => r.json()).catch(() => null),
        priority: 'critical' as const
      },
      {
        id: 'dashboard-stats',
        loader: () => fetch('/api/dashboard-stats').then(r => r.json()).catch(() => ({})),
        priority: 'high' as const
      },
      {
        id: 'navigation-menu',
        loader: () => Promise.resolve({ menu: 'cached' }),
        priority: 'high' as const
      }
    ];

    await Promise.all(
      criticalPages.map(page => 
        this.loadPage(page.id, page.loader, page.priority)
      )
    );
  }

  // Get cache metrics
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  // Clear low-priority pages
  clearLowPriorityPages() {
    for (const [pageId, page] of this.pages.entries()) {
      if (page.priority === 'low') {
        this.pages.delete(pageId);
        this.metrics.totalSize -= page.size;
        this.metrics.pageCount--;
      }
    }
  }

  // Force garbage collection
  forceGarbageCollection() {
    // Clear expired pages (older than 5 minutes)
    const now = Date.now();
    const expiredPages = Array.from(this.pages.entries())
      .filter(([, page]) => now - page.lastAccessed > 5 * 60 * 1000);
    
    for (const [pageId, page] of expiredPages) {
      if (page.priority !== 'critical') {
        this.pages.delete(pageId);
        this.metrics.totalSize -= page.size;
        this.metrics.pageCount--;
      }
    }

    // Force browser garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }
  }
}

export const demandPagingSystem = new DemandPagingSystem();

// Enhanced component loader with demand paging
export const loadComponentWithPaging = async (componentPath: string, priority: 'critical' | 'high' | 'medium' | 'low' = 'medium') => {
  return demandPagingSystem.loadPage(
    `component-${componentPath}`,
    () => import(/* @vite-ignore */ componentPath),
    priority
  );
};

// Initialize demand paging system
export const initializeDemandPaging = async () => {
  await demandPagingSystem.preloadCriticalPages();
  
  // Set up periodic garbage collection
  setInterval(() => {
    demandPagingSystem.forceGarbageCollection();
  }, 60000); // Every minute
  
  // Monitor memory usage
  setInterval(() => {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      const usedMB = memInfo.usedJSHeapSize / 1024 / 1024;
      
      if (usedMB > 50) { // If using more than 50MB
        demandPagingSystem.clearLowPriorityPages();
      }
    }
  }, 30000); // Every 30 seconds
  
  console.log('Demand paging system initialized with 64MB memory limit');
};