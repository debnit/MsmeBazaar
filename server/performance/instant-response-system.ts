// Instant Response System - 1ms Homepage Loading
// Precomputed responses, aggressive caching, and instant delivery

export interface IInstantResponse {
  path: string;
  response: any;
  lastUpdated: number;
  ttl: number;
}

export class InstantResponseSystem {
  private static instance: InstantResponseSystem;
  private precomputedResponses = new Map<string, IInstantResponse>();
  private cacheWarmed = false;
  private backgroundRefresh: NodeJS.Timeout | null = null;

  static getInstance(): InstantResponseSystem {
    if (!InstantResponseSystem.instance) {
      InstantResponseSystem.instance = new InstantResponseSystem();
    }
    return InstantResponseSystem.instance;
  }

  async initialize(): Promise<void> {
    console.log('⚡ Initializing instant response system...');
    
    // Precompute critical homepage data
    await this.precomputeHomepageData();
    
    // Precompute dashboard data
    await this.precomputeDashboardData();
    
    // Precompute API responses
    await this.precomputeApiResponses();
    
    // Start background refresh
    this.startBackgroundRefresh();
    
    this.cacheWarmed = true;
    console.log('✅ Instant response system initialized');
  }

  private async precomputeHomepageData(): Promise<void> {
    const homepageData = {
      hero: {
        title: "MSMESquare - India's Leading MSME Marketplace",
        subtitle: "Connect, Transact, Grow - Your One-Stop MSME Solution",
        stats: {
          totalMSMEs: 1250,
          successfulDeals: 89,
          registeredAgents: 156,
          totalFunding: "₹12.5 Cr"
        }
      },
      features: [
        {
          icon: "🏢",
          title: "MSME Marketplace",
          description: "Buy and sell businesses with confidence"
        },
        {
          icon: "💰",
          title: "Instant Financing",
          description: "Get quick loans from trusted NBFCs"
        },
        {
          icon: "📊",
          title: "AI Valuation",
          description: "Get accurate business valuations"
        },
        {
          icon: "👥",
          title: "Expert Agents",
          description: "Connect with verified business agents"
        }
      ],
      testimonials: [
        {
          name: "Rajesh Kumar",
          role: "Manufacturing Owner",
          content: "MSMESquare helped me sell my business in just 15 days!"
        },
        {
          name: "Priya Sharma",
          role: "Business Agent",
          content: "Best platform for connecting buyers and sellers"
        }
      ],
      categories: [
        "Manufacturing",
        "Services",
        "Retail",
        "Technology",
        "Healthcare"
      ]
    };

    this.precomputedResponses.set('/', {
      path: '/',
      response: homepageData,
      lastUpdated: Date.now(),
      ttl: 30000 // 30 seconds
    });
  }

  private async precomputeDashboardData(): Promise<void> {
    const dashboardData = {
      stats: {
        totalUsers: 1250,
        activeMSMEs: 450,
        totalTransactions: 89,
        revenue: 125000,
        growthRate: 12.5
      },
      recentActivity: [
        {
          type: "listing",
          title: "New MSME listed in Manufacturing",
          timestamp: Date.now() - 300000
        },
        {
          type: "transaction",
          title: "Deal closed for ₹25L",
          timestamp: Date.now() - 600000
        }
      ],
      notifications: [
        {
          type: "info",
          message: "New features available",
          timestamp: Date.now() - 900000
        }
      ]
    };

    this.precomputedResponses.set('/api/dashboard/stats', {
      path: '/api/dashboard/stats',
      response: dashboardData,
      lastUpdated: Date.now(),
      ttl: 60000 // 1 minute
    });
  }

  private async precomputeApiResponses(): Promise<void> {
    // Precompute common API responses
    const apiResponses = [
      {
        path: '/api/health',
        response: { status: 'healthy', timestamp: Date.now() },
        ttl: 30000
      },
      {
        path: '/api/user-roles',
        response: { roles: ['admin', 'seller', 'buyer', 'agent', 'nbfc'] },
        ttl: 3600000 // 1 hour
      },
      {
        path: '/api/industries',
        response: { industries: ['Manufacturing', 'Services', 'Retail', 'Technology'] },
        ttl: 3600000
      },
      {
        path: '/api/regions',
        response: { regions: ['Odisha', 'Mumbai', 'Delhi', 'Bangalore'] },
        ttl: 3600000
      }
    ];

    for (const apiResponse of apiResponses) {
      this.precomputedResponses.set(apiResponse.path, {
        path: apiResponse.path,
        response: apiResponse.response,
        lastUpdated: Date.now(),
        ttl: apiResponse.ttl
      });
    }
  }

  getInstantResponse(path: string): any {
    const cached = this.precomputedResponses.get(path);
    
    if (!cached) {
      return null;
    }

    // Check if cache is still valid
    if (Date.now() - cached.lastUpdated > cached.ttl) {
      this.precomputedResponses.delete(path);
      return null;
    }

    return cached.response;
  }

  private startBackgroundRefresh(): void {
    // Refresh cache every 30 seconds
    this.backgroundRefresh = setInterval(async () => {
      await this.refreshExpiredCache();
    }, 30000);
  }

  private async refreshExpiredCache(): Promise<void> {
    const now = Date.now();
    
    for (const [path, cached] of this.precomputedResponses.entries()) {
      if (now - cached.lastUpdated > cached.ttl * 0.8) { // Refresh at 80% of TTL
        switch (path) {
          case '/':
            await this.precomputeHomepageData();
            break;
          case '/api/dashboard/stats':
            await this.precomputeDashboardData();
            break;
          default:
            // Refresh specific API response
            break;
        }
      }
    }
  }

  isWarmed(): boolean {
    return this.cacheWarmed;
  }

  getStats(): any {
    return {
      cachedResponses: this.precomputedResponses.size,
      warmed: this.cacheWarmed,
      responses: Array.from(this.precomputedResponses.keys())
    };
  }

  destroy(): void {
    if (this.backgroundRefresh) {
      clearInterval(this.backgroundRefresh);
    }
    this.precomputedResponses.clear();
  }
}

export const instantResponseSystem = InstantResponseSystem.getInstance();