// Mark and sweep memory management for page-based cleanup

import { STATIC_TOAST_STATE, STATIC_APP_STATE } from './static-variables';

// Memory page structure
interface MemoryPage {
  id: string;
  data: any;
  timestamp: number;
  marked: boolean;
  referenced: boolean;
  size: number;
  type: 'toast' | 'app' | 'cache' | 'temp';
}

// Mark and sweep manager
class MarkSweepManager {
  private static instance: MarkSweepManager;
  private pages: Map<string, MemoryPage> = new Map();
  private sweepInterval: NodeJS.Timeout | null = null;
  private markPhaseActive = false;
  private sweepPhaseActive = false;

  // Configuration
  private readonly SWEEP_INTERVAL = 30000; // 30 seconds
  private readonly MAX_PAGE_AGE = 300000; // 5 minutes
  private readonly MAX_PAGES = 100;
  private readonly MAX_PAGE_SIZE = 1024 * 1024; // 1MB per page

  private constructor() {
    this.initialize();
  }

  public static getInstance(): MarkSweepManager {
    if (!MarkSweepManager.instance) {
      MarkSweepManager.instance = new MarkSweepManager();
    }
    return MarkSweepManager.instance;
  }

  // Initialize mark and sweep
  private initialize() {
    console.log('Mark and sweep memory manager initialized');

    // Start sweep cycle
    this.startSweepCycle();

    // Setup cleanup on page unload
    this.setupPageUnloadCleanup();
  }

  // Start sweep cycle
  private startSweepCycle() {
    if (this.sweepInterval) {
      clearInterval(this.sweepInterval);
    }

    this.sweepInterval = setInterval(() => {
      this.performMarkAndSweep();
    }, this.SWEEP_INTERVAL);
  }

  // Allocate memory page
  public allocatePage(type: 'toast' | 'app' | 'cache' | 'temp', data: any): string {
    const pageId = `${type}_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // Calculate data size
    const size = this.calculateSize(data);

    // Check if we need to free space
    if (this.pages.size >= this.MAX_PAGES || size > this.MAX_PAGE_SIZE) {
      this.performEmergencySweep();
    }

    const page: MemoryPage = {
      id: pageId,
      data,
      timestamp: Date.now(),
      marked: false,
      referenced: true,
      size,
      type,
    };

    this.pages.set(pageId, page);
    return pageId;
  }

  // Free memory page
  public freePage(pageId: string): void {
    const page = this.pages.get(pageId);
    if (page) {
      // Clear references
      page.referenced = false;
      page.marked = false;

      // Clear data
      if (page.data && typeof page.data === 'object') {
        if (Array.isArray(page.data)) {
          page.data.length = 0;
        } else {
          Object.keys(page.data).forEach(key => {
            delete page.data[key];
          });
        }
      }

      // Remove from pages
      this.pages.delete(pageId);
    }
  }

  // Mark phase - mark all referenced pages
  private markPhase() {
    if (this.markPhaseActive) {return;}

    this.markPhaseActive = true;

    try {
      // Reset all marks
      this.pages.forEach(page => {
        page.marked = false;
      });

      // Mark toast pages
      this.markToastPages();

      // Mark app pages
      this.markAppPages();

      // Mark cache pages
      this.markCachePages();

      console.log(`Mark phase completed. Marked ${Array.from(this.pages.values()).filter(p => p.marked).length} pages`);
    } catch (error) {
      console.warn('Mark phase failed:', error);
    } finally {
      this.markPhaseActive = false;
    }
  }

  // Mark toast pages
  private markToastPages() {
    try {
      STATIC_TOAST_STATE.toasts.forEach(toast => {
        if (toast && toast.id) {
          const pageId = this.findPageByData(toast);
          if (pageId) {
            const page = this.pages.get(pageId);
            if (page) {
              page.marked = true;
              page.referenced = true;
            }
          }
        }
      });
    } catch (error) {
      console.warn('Toast page marking failed:', error);
    }
  }

  // Mark app pages
  private markAppPages() {
    try {
      // Mark user page
      if (STATIC_APP_STATE.user) {
        const pageId = this.findPageByData(STATIC_APP_STATE.user);
        if (pageId) {
          const page = this.pages.get(pageId);
          if (page) {
            page.marked = true;
            page.referenced = true;
          }
        }
      }

      // Mark notification pages
      STATIC_APP_STATE.notifications.forEach(notification => {
        if (notification && notification.id) {
          const pageId = this.findPageByData(notification);
          if (pageId) {
            const page = this.pages.get(pageId);
            if (page) {
              page.marked = true;
              page.referenced = true;
            }
          }
        }
      });
    } catch (error) {
      console.warn('App page marking failed:', error);
    }
  }

  // Mark cache pages
  private markCachePages() {
    try {
      // Mark recently accessed cache pages
      const recentThreshold = Date.now() - 60000; // 1 minute

      this.pages.forEach((page, pageId) => {
        if (page.type === 'cache' && page.timestamp > recentThreshold) {
          page.marked = true;
          page.referenced = true;
        }
      });
    } catch (error) {
      console.warn('Cache page marking failed:', error);
    }
  }

  // Sweep phase - collect unmarked pages
  private sweepPhase() {
    if (this.sweepPhaseActive) {return;}

    this.sweepPhaseActive = true;

    try {
      const pagesToSweep: string[] = [];
      const now = Date.now();

      // Find pages to sweep
      this.pages.forEach((page, pageId) => {
        const shouldSweep = !page.marked ||
                          !page.referenced ||
                          (now - page.timestamp) > this.MAX_PAGE_AGE;

        if (shouldSweep) {
          pagesToSweep.push(pageId);
        }
      });

      // Sweep pages
      let sweptCount = 0;
      pagesToSweep.forEach(pageId => {
        this.freePage(pageId);
        sweptCount++;
      });

      console.log(`Sweep phase completed. Swept ${sweptCount} pages`);
    } catch (error) {
      console.warn('Sweep phase failed:', error);
    } finally {
      this.sweepPhaseActive = false;
    }
  }

  // Perform complete mark and sweep cycle
  public performMarkAndSweep() {
    try {
      console.log('Starting mark and sweep cycle...');

      // Mark phase
      this.markPhase();

      // Small delay between phases
      setTimeout(() => {
        // Sweep phase
        this.sweepPhase();

        // Force garbage collection if available
        this.triggerGarbageCollection();
      }, 100);

    } catch (error) {
      console.warn('Mark and sweep cycle failed:', error);
    }
  }

  // Emergency sweep when memory is full
  private performEmergencySweep() {
    try {
      console.log('Performing emergency sweep...');

      // Force sweep all temp pages
      const tempPages = Array.from(this.pages.entries()).filter(([_, page]) => page.type === 'temp');
      tempPages.forEach(([pageId, _]) => {
        this.freePage(pageId);
      });

      // Force sweep old cache pages
      const now = Date.now();
      const oldCachePages = Array.from(this.pages.entries()).filter(([_, page]) =>
        page.type === 'cache' && (now - page.timestamp) > 60000,
      );
      oldCachePages.forEach(([pageId, _]) => {
        this.freePage(pageId);
      });

      // If still too many pages, sweep oldest pages
      if (this.pages.size > this.MAX_PAGES) {
        const sortedPages = Array.from(this.pages.entries())
          .sort(([_, a], [__, b]) => a.timestamp - b.timestamp);

        const excessCount = this.pages.size - this.MAX_PAGES;
        for (let i = 0; i < excessCount; i++) {
          this.freePage(sortedPages[i][0]);
        }
      }

    } catch (error) {
      console.warn('Emergency sweep failed:', error);
    }
  }

  // Find page by data reference
  private findPageByData(data: any): string | null {
    for (const [pageId, page] of this.pages) {
      if (page.data === data) {
        return pageId;
      }
    }
    return null;
  }

  // Calculate data size
  private calculateSize(data: any): number {
    try {
      if (data === null || data === undefined) {return 0;}

      if (typeof data === 'string') {
        return data.length * 2; // UTF-16
      }

      if (typeof data === 'number') {
        return 8; // 64-bit number
      }

      if (typeof data === 'boolean') {
        return 1;
      }

      if (Array.isArray(data)) {
        return data.reduce((sum, item) => sum + this.calculateSize(item), 0);
      }

      if (typeof data === 'object') {
        return Object.keys(data).reduce((sum, key) => {
          return sum + this.calculateSize(key) + this.calculateSize(data[key]);
        }, 0);
      }

      return 0;
    } catch (error) {
      console.warn('Size calculation failed:', error);
      return 0;
    }
  }

  // Trigger garbage collection
  private triggerGarbageCollection() {
    try {
      if (typeof window !== 'undefined' && (window as any).gc) {
        (window as any).gc();
      }
    } catch (error) {
      console.warn('Garbage collection trigger failed:', error);
    }
  }

  // Setup page unload cleanup
  private setupPageUnloadCleanup() {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.performCompleteCleanup();
      });
    }
  }

  // Complete cleanup
  public performCompleteCleanup() {
    try {
      // Stop sweep cycle
      if (this.sweepInterval) {
        clearInterval(this.sweepInterval);
        this.sweepInterval = null;
      }

      // Clear all pages
      this.pages.forEach((page, pageId) => {
        this.freePage(pageId);
      });

      this.pages.clear();

      console.log('Complete memory cleanup performed');
    } catch (error) {
      console.warn('Complete cleanup failed:', error);
    }
  }

  // Get memory statistics
  public getMemoryStats() {
    const stats = {
      totalPages: this.pages.size,
      markedPages: Array.from(this.pages.values()).filter(p => p.marked).length,
      referencedPages: Array.from(this.pages.values()).filter(p => p.referenced).length,
      totalSize: Array.from(this.pages.values()).reduce((sum, p) => sum + p.size, 0),
      pageTypes: {} as Record<string, number>,
      oldestPageAge: 0,
      newestPageAge: 0,
    };

    // Calculate page types
    this.pages.forEach(page => {
      stats.pageTypes[page.type] = (stats.pageTypes[page.type] || 0) + 1;
    });

    // Calculate age stats
    if (this.pages.size > 0) {
      const now = Date.now();
      const timestamps = Array.from(this.pages.values()).map(p => p.timestamp);
      stats.oldestPageAge = now - Math.min(...timestamps);
      stats.newestPageAge = now - Math.max(...timestamps);
    }

    return stats;
  }
}

// Export singleton instance
export const markSweepManager = MarkSweepManager.getInstance();

// Auto-initialize
if (typeof window !== 'undefined') {
  console.log('Mark and sweep memory manager auto-initialized');
}

export default markSweepManager;
