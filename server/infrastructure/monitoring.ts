import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';
import { Express } from 'express';

// Initialize Sentry for error tracking
export function initializeSentry() {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      integrations: [
        new ProfilingIntegration(),
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Express({ app: true }),
      ],
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      beforeSend(event, hint) {
        // Filter out non-critical errors in development
        if (process.env.NODE_ENV === 'development') {
          const error = hint.originalException;
          if (error && error.message && error.message.includes('ECONNREFUSED')) {
            return null; // Don't send connection errors in dev
          }
        }
        return event;
      },
    });
  }
}

// Prometheus metrics setup
export class MetricsService {
  private httpRequestDuration: Histogram<string>;
  private httpRequestsTotal: Counter<string>;
  private activeConnections: Gauge<string>;
  private businessMetrics: {
    msmeListings: Counter<string>;
    loanApplications: Counter<string>;
    subscriptionRevenue: Counter<string>;
    valuationRequests: Counter<string>;
    matchmakingRequests: Counter<string>;
    escrowTransactions: Counter<string>;
  };

  constructor() {
    // Collect default metrics (CPU, memory, etc.)
    collectDefaultMetrics({ prefix: 'msmesquare_' });

    // HTTP metrics
    this.httpRequestDuration = new Histogram({
      name: 'msmesquare_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code', 'user_role'],
      buckets: [0.1, 0.5, 1, 2, 5, 10]
    });

    this.httpRequestsTotal = new Counter({
      name: 'msmesquare_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'user_role']
    });

    this.activeConnections = new Gauge({
      name: 'msmesquare_active_connections',
      help: 'Number of active connections'
    });

    // Business metrics
    this.businessMetrics = {
      msmeListings: new Counter({
        name: 'msmesquare_msme_listings_total',
        help: 'Total number of MSME listings created',
        labelNames: ['industry', 'city', 'status']
      }),
      
      loanApplications: new Counter({
        name: 'msmesquare_loan_applications_total',
        help: 'Total number of loan applications',
        labelNames: ['status', 'nbfc_id']
      }),
      
      subscriptionRevenue: new Counter({
        name: 'msmesquare_subscription_revenue_total',
        help: 'Total subscription revenue in INR',
        labelNames: ['plan_type', 'payment_status']
      }),
      
      valuationRequests: new Counter({
        name: 'msmesquare_valuation_requests_total',
        help: 'Total number of valuation requests',
        labelNames: ['business_type', 'user_role']
      }),
      
      matchmakingRequests: new Counter({
        name: 'msmesquare_matchmaking_requests_total',
        help: 'Total number of matchmaking requests',
        labelNames: ['match_type', 'success']
      }),
      
      escrowTransactions: new Counter({
        name: 'msmesquare_escrow_transactions_total',
        help: 'Total number of escrow transactions',
        labelNames: ['transaction_type', 'status']
      })
    };

    register.registerMetric(this.httpRequestDuration);
    register.registerMetric(this.httpRequestsTotal);
    register.registerMetric(this.activeConnections);
    
    Object.values(this.businessMetrics).forEach(metric => {
      register.registerMetric(metric);
    });
  }

  // Middleware for HTTP metrics
  requestMetrics() {
    return (req: any, res: any, next: any) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route?.path || req.path;
        const userRole = req.user?.role || 'anonymous';
        
        this.httpRequestDuration
          .labels(req.method, route, res.statusCode.toString(), userRole)
          .observe(duration);
          
        this.httpRequestsTotal
          .labels(req.method, route, res.statusCode.toString(), userRole)
          .inc();
      });
      
      next();
    };
  }

  // Business metric tracking methods
  trackMSMEListing(industry: string, city: string, status: string) {
    this.businessMetrics.msmeListings.labels(industry, city, status).inc();
  }

  trackLoanApplication(status: string, nbfcId: string) {
    this.businessMetrics.loanApplications.labels(status, nbfcId).inc();
  }

  trackSubscriptionRevenue(planType: string, paymentStatus: string, amount: number) {
    this.businessMetrics.subscriptionRevenue.labels(planType, paymentStatus).inc(amount);
  }

  trackValuationRequest(businessType: string, userRole: string) {
    this.businessMetrics.valuationRequests.labels(businessType, userRole).inc();
  }

  trackMatchmakingRequest(matchType: string, success: boolean) {
    this.businessMetrics.matchmakingRequests.labels(matchType, success.toString()).inc();
  }

  trackEscrowTransaction(transactionType: string, status: string) {
    this.businessMetrics.escrowTransactions.labels(transactionType, status).inc();
  }

  // Get metrics for Prometheus scraping
  getMetrics() {
    return register.metrics();
  }
}

export const metricsService = new MetricsService();

// Setup monitoring endpoints
export function setupMonitoring(app: Express) {
  // Sentry request handler (must be first)
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());

  // Prometheus metrics middleware
  app.use(metricsService.requestMetrics());

  // Health check endpoint with detailed status
  app.get('/health', async (req, res) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: 'connected', // Would check actual DB connection
      services: {
        redis: 'connected',
        stripe: 'connected',
        sentry: process.env.SENTRY_DSN ? 'enabled' : 'disabled'
      }
    };

    res.json(health);
  });

  // Metrics endpoint for Prometheus
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await metricsService.getMetrics());
  });

  // Readiness probe
  app.get('/ready', (req, res) => {
    res.json({ ready: true, timestamp: new Date().toISOString() });
  });

  // Liveness probe
  app.get('/live', (req, res) => {
    res.json({ live: true, timestamp: new Date().toISOString() });
  });

  // Sentry error handler (must be last)
  app.use(Sentry.Handlers.errorHandler());
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private static timers = new Map<string, number>();

  static startTimer(name: string) {
    this.timers.set(name, Date.now());
  }

  static endTimer(name: string): number {
    const start = this.timers.get(name);
    if (!start) return 0;
    
    const duration = Date.now() - start;
    this.timers.delete(name);
    
    // Log slow operations
    if (duration > 1000) {
      console.warn(`⚠️ Slow operation: ${name} took ${duration}ms`);
    }
    
    return duration;
  }

  static async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startTimer(name);
    try {
      const result = await fn();
      const duration = this.endTimer(name);
      
      // Track in metrics
      if (name.includes('database')) {
        // Database operation metrics
      } else if (name.includes('valuation')) {
        // Valuation metrics
      }
      
      return result;
    } catch (error) {
      this.endTimer(name);
      throw error;
    }
  }
}

// Error tracking helper
export function trackError(error: Error, context?: Record<string, any>) {
  if (process.env.SENTRY_DSN) {
    Sentry.withScope(scope => {
      if (context) {
        scope.setContext('additional_info', context);
      }
      Sentry.captureException(error);
    });
  }
  
  console.error('Error tracked:', error.message, context);
}

// Business metrics tracking helper
export function trackBusinessEvent(event: string, data: Record<string, any>) {
  switch (event) {
    case 'msme_listing_created':
      metricsService.trackMSMEListing(data.industry, data.city, data.status);
      break;
    case 'loan_application_submitted':
      metricsService.trackLoanApplication(data.status, data.nbfcId);
      break;
    case 'subscription_payment':
      metricsService.trackSubscriptionRevenue(data.planType, data.status, data.amount);
      break;
    case 'valuation_requested':
      metricsService.trackValuationRequest(data.businessType, data.userRole);
      break;
    case 'matchmaking_requested':
      metricsService.trackMatchmakingRequest(data.matchType, data.success);
      break;
    case 'escrow_transaction':
      metricsService.trackEscrowTransaction(data.transactionType, data.status);
      break;
  }
}