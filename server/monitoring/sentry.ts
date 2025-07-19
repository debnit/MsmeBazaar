/**
 * 📊 Sentry Error Monitoring Setup
 * Production-grade error tracking and performance monitoring
 */

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { Request, Response, NextFunction } from 'express';

interface SentryConfig {
  dsn?: string;
  environment: string;
  release?: string;
  sampleRate: number;
  profilesSampleRate: number;
  tracesSampleRate: number;
  integrations?: any[];
  beforeSend?: (event: Sentry.Event) => Sentry.Event | null;
}

class MSMESentryMonitoring {
  private static instance: MSMESentryMonitoring;
  private initialized = false;

  private constructor() {}

  public static getInstance(): MSMESentryMonitoring {
    if (!MSMESentryMonitoring.instance) {
      MSMESentryMonitoring.instance = new MSMESentryMonitoring();
    }
    return MSMESentryMonitoring.instance;
  }

  public initialize(config?: Partial<SentryConfig>) {
    if (this.initialized) {
      console.warn('Sentry already initialized');
      return;
    }

    const defaultConfig: SentryConfig = {
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.npm_package_version || '1.0.0',
      sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      integrations: [
        nodeProfilingIntegration(),
        // Add custom integrations
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Express({ app: undefined }),
        new Sentry.Integrations.Postgres(),
        new Sentry.Integrations.Redis(),
      ],
      beforeSend: (event) => {
        // Filter out known non-critical errors
        if (event.exception) {
          const error = event.exception.values?.[0];
          if (error?.type === 'ValidationError' ||
              error?.value?.includes('ECONNREFUSED') ||
              error?.value?.includes('timeout')) {
            return null; // Don't send these errors
          }
        }
        return event;
      },
    };

    const finalConfig = { ...defaultConfig, ...config };

    if (!finalConfig.dsn) {
      console.warn('Sentry DSN not provided, error tracking disabled');
      return;
    }

    Sentry.init(finalConfig);

    this.initialized = true;
    console.log('Sentry monitoring initialized');
  }

  public getRequestHandler() {
    return Sentry.Handlers.requestHandler({
      user: ['id', 'email', 'role'],
      request: ['method', 'url', 'headers'],
      transaction: 'methodPath',
    });
  }

  public getTracingHandler() {
    return Sentry.Handlers.tracingHandler();
  }

  public getErrorHandler() {
    return Sentry.Handlers.errorHandler({
      shouldHandleError: (error) => {
        // Only handle 5xx errors
        return error.status >= 500;
      },
    });
  }

  public captureException(error: Error, context?: any) {
    if (!this.initialized) {return;}

    Sentry.withScope((scope) => {
      if (context) {
        scope.setContext('additional_info', context);
      }
      Sentry.captureException(error);
    });
  }

  public captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: any) {
    if (!this.initialized) {return;}

    Sentry.withScope((scope) => {
      if (context) {
        scope.setContext('additional_info', context);
      }
      Sentry.captureMessage(message, level);
    });
  }

  public setUser(user: { id: string; email?: string; role?: string }) {
    if (!this.initialized) {return;}

    Sentry.setUser(user);
  }

  public setTag(key: string, value: string) {
    if (!this.initialized) {return;}

    Sentry.setTag(key, value);
  }

  public setContext(key: string, context: any) {
    if (!this.initialized) {return;}

    Sentry.setContext(key, context);
  }

  public addBreadcrumb(breadcrumb: Sentry.Breadcrumb) {
    if (!this.initialized) {return;}

    Sentry.addBreadcrumb(breadcrumb);
  }

  public startTransaction(name: string, op: string) {
    if (!this.initialized) {return null;}

    return Sentry.startTransaction({ name, op });
  }

  public configureScope(callback: (scope: Sentry.Scope) => void) {
    if (!this.initialized) {return;}

    Sentry.configureScope(callback);
  }

  // Custom middleware for tracking business metrics
  public businessMetricsMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.initialized) {return next();}

      const startTime = Date.now();

      // Track business-specific events
      this.addBreadcrumb({
        message: `API Request: ${req.method} ${req.path}`,
        category: 'api',
        level: 'info',
        data: {
          method: req.method,
          path: req.path,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
        },
      });

      // Track user context if available
      if (req.user) {
        this.setUser({
          id: req.user.id.toString(),
          email: req.user.email,
          role: req.user.role,
        });
      }

      // Track performance metrics
      res.on('finish', () => {
        const duration = Date.now() - startTime;

        this.addBreadcrumb({
          message: `API Response: ${res.statusCode} in ${duration}ms`,
          category: 'api',
          level: res.statusCode >= 400 ? 'error' : 'info',
          data: {
            statusCode: res.statusCode,
            duration,
            path: req.path,
            method: req.method,
          },
        });

        // Track slow requests
        if (duration > 5000) {
          this.captureMessage(`Slow API request: ${req.method} ${req.path}`, 'warning', {
            duration,
            statusCode: res.statusCode,
            userAgent: req.get('User-Agent'),
          });
        }
      });

      next();
    };
  }

  // Track MSME-specific business events
  public trackMSMEEvent(event: string, data: any) {
    if (!this.initialized) {return;}

    this.addBreadcrumb({
      message: `MSME Event: ${event}`,
      category: 'business',
      level: 'info',
      data,
    });

    // Track critical business events as messages
    const criticalEvents = [
      'listing_created',
      'interest_expressed',
      'valuation_requested',
      'loan_application_submitted',
      'transaction_completed',
    ];

    if (criticalEvents.includes(event)) {
      this.captureMessage(`Business Event: ${event}`, 'info', data);
    }
  }

  // Track ML model performance
  public trackMLPerformance(modelName: string, metrics: any) {
    if (!this.initialized) {return;}

    this.addBreadcrumb({
      message: `ML Model Performance: ${modelName}`,
      category: 'ml',
      level: 'info',
      data: metrics,
    });

    // Alert on poor model performance
    if (metrics.accuracy && metrics.accuracy < 0.8) {
      this.captureMessage(`Low ML model accuracy: ${modelName}`, 'warning', metrics);
    }
  }

  // Track queue system performance
  public trackQueuePerformance(queueName: string, metrics: any) {
    if (!this.initialized) {return;}

    this.addBreadcrumb({
      message: `Queue Performance: ${queueName}`,
      category: 'queue',
      level: 'info',
      data: metrics,
    });

    // Alert on queue backlogs
    if (metrics.pending && metrics.pending > 100) {
      this.captureMessage(`High queue backlog: ${queueName}`, 'warning', metrics);
    }
  }

  // Health check method
  public isHealthy(): boolean {
    return this.initialized;
  }
}

export const sentryMonitoring = MSMESentryMonitoring.getInstance();

// Export middleware functions for easy use
export const sentryRequestHandler = () => sentryMonitoring.getRequestHandler();
export const sentryTracingHandler = () => sentryMonitoring.getTracingHandler();
export const sentryErrorHandler = () => sentryMonitoring.getErrorHandler();
export const sentryBusinessMetrics = () => sentryMonitoring.businessMetricsMiddleware();

// Export convenience functions
export const captureException = (error: Error, context?: any) =>
  sentryMonitoring.captureException(error, context);

export const captureMessage = (message: string, level?: Sentry.SeverityLevel, context?: any) =>
  sentryMonitoring.captureMessage(message, level, context);

export const trackMSMEEvent = (event: string, data: any) =>
  sentryMonitoring.trackMSMEEvent(event, data);

export const trackMLPerformance = (modelName: string, metrics: any) =>
  sentryMonitoring.trackMLPerformance(modelName, metrics);

export const trackQueuePerformance = (queueName: string, metrics: any) =>
  sentryMonitoring.trackQueuePerformance(queueName, metrics);

export { sentryMonitoring };
