// Shared memory management for microservices
import { performance } from 'perf_hooks';

interface MemoryPage {
  id: string;
  data: any;
  lastAccessed: number;
  accessCount: number;
  size: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

class MicroserviceMemoryManager {
  private pages = new Map<string, MemoryPage>();
  private readonly MAX_MEMORY_MB = 128; // 128MB per microservice
  private readonly PAGE_SIZE_KB = 512; // 512KB page size
  private readonly MAX_PAGES = Math.floor((this.MAX_MEMORY_MB * 1024) / this.PAGE_SIZE_KB);
  
  private totalMemoryUsed = 0;
  private evictionCount = 0;
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  async loadPage(pageId: string, loader: () => Promise<any>, priority: 'critical' | 'high' | 'medium' | 'low' = 'medium'): Promise<any> {
    const existingPage = this.pages.get(pageId);
    
    if (existingPage) {
      existingPage.lastAccessed = Date.now();
      existingPage.accessCount++;
      return existingPage.data;
    }

    const data = await loader();
    const size = this.estimateSize(data);
    
    if (this.pages.size >= this.MAX_PAGES || this.totalMemoryUsed + size > this.MAX_MEMORY_MB * 1024 * 1024) {
      this.evictPages(size);
    }
    
    const page: MemoryPage = {
      id: pageId,
      data,
      lastAccessed: Date.now(),
      accessCount: 1,
      size,
      priority
    };
    
    this.pages.set(pageId, page);
    this.totalMemoryUsed += size;
    
    return data;
  }

  private evictPages(requiredSize: number) {
    const sortedPages = Array.from(this.pages.entries())
      .sort(([, a], [, b]) => {
        const priorityWeight = { critical: 1000, high: 100, medium: 10, low: 1 };
        const scoreA = (a.accessCount * priorityWeight[a.priority]) / (Date.now() - a.lastAccessed);
        const scoreB = (b.accessCount * priorityWeight[b.priority]) / (Date.now() - b.lastAccessed);
        return scoreA - scoreB;
      });

    let freedSize = 0;
    const targetSize = requiredSize + (this.MAX_MEMORY_MB * 1024 * 1024 * 0.1);

    for (const [pageId, page] of sortedPages) {
      if (freedSize >= targetSize) break;
      if (page.priority === 'critical') continue;
      
      this.pages.delete(pageId);
      this.totalMemoryUsed -= page.size;
      this.evictionCount++;
      freedSize += page.size;
    }
  }

  private estimateSize(obj: any): number {
    return JSON.stringify(obj).length * 2;
  }

  getMemoryMetrics() {
    return {
      serviceName: this.serviceName,
      totalMemoryUsed: this.totalMemoryUsed,
      pageCount: this.pages.size,
      evictionCount: this.evictionCount,
      memoryUsagePercent: (this.totalMemoryUsed / (this.MAX_MEMORY_MB * 1024 * 1024)) * 100,
      timestamp: new Date().toISOString()
    };
  }

  forceGarbageCollection() {
    const now = Date.now();
    const expiredPages = Array.from(this.pages.entries())
      .filter(([, page]) => now - page.lastAccessed > 10 * 60 * 1000);
    
    for (const [pageId, page] of expiredPages) {
      if (page.priority !== 'critical') {
        this.pages.delete(pageId);
        this.totalMemoryUsed -= page.size;
      }
    }

    if (global.gc) {
      global.gc();
    }
  }
}

export const serverMemoryManager = new MicroserviceMemoryManager(process.env.SERVICE_NAME || 'unknown');