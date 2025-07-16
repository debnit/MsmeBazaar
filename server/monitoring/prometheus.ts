/**
 * 📈 Prometheus Metrics Collection
 * Business and technical metrics for monitoring and alerting
 */

import { register, Counter, Histogram, Gauge, Summary } from 'prom-client';
import { Request, Response, NextFunction } from 'express';

class MSMEPrometheusMetrics {
  private static instance: MSMEPrometheusMetrics;
  
  // HTTP Metrics
  public httpRequestsTotal: Counter<string>;
  public httpRequestDuration: Histogram<string>;
  public httpRequestSize: Summary<string>;
  public httpResponseSize: Summary<string>;
  
  // Business Metrics
  public msmeListingsTotal: Counter<string>;
  public buyerInterestTotal: Counter<string>;
  public loanApplicationsTotal: Counter<string>;
  public valuationRequestsTotal: Counter<string>;
  public transactionCompletionTotal: Counter<string>;
  
  // ML Metrics
  public mlModelAccuracy: Gauge<string>;
  public mlModelLatency: Histogram<string>;
  public mlModelPredictions: Counter<string>;
  
  // Queue Metrics
  public queueJobsTotal: Counter<string>;
  public queueJobDuration: Histogram<string>;
  public queueJobsActive: Gauge<string>;
  public queueJobsWaiting: Gauge<string>;
  
  // Database Metrics
  public dbConnectionsActive: Gauge<string>;
  public dbQueryDuration: Histogram<string>;
  public dbQueryTotal: Counter<string>;
  
  // Real-time Metrics
  public socketConnectionsActive: Gauge<string>;
  public socketMessagesTotal: Counter<string>;
  public socketRoomsActive: Gauge<string>;
  
  // System Metrics
  public memoryUsage: Gauge<string>;
  public cpuUsage: Gauge<string>;
  public activeUsers: Gauge<string>;
  public errorRate: Counter<string>;

  private constructor() {
    this.initializeMetrics();
  }

  public static getInstance(): MSMEPrometheusMetrics {
    if (!MSMEPrometheusMetrics.instance) {
      MSMEPrometheusMetrics.instance = new MSMEPrometheusMetrics();
    }
    return MSMEPrometheusMetrics.instance;
  }

  private initializeMetrics() {
    // HTTP Metrics
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'user_role']
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5, 10]
    });

    this.httpRequestSize = new Summary({
      name: 'http_request_size_bytes',
      help: 'Size of HTTP requests in bytes',
      labelNames: ['method', 'route']
    });

    this.httpResponseSize = new Summary({
      name: 'http_response_size_bytes',
      help: 'Size of HTTP responses in bytes',
      labelNames: ['method', 'route']
    });

    // Business Metrics
    this.msmeListingsTotal = new Counter({
      name: 'msme_listings_total',
      help: 'Total number of MSME listings',
      labelNames: ['industry', 'state', 'status']
    });

    this.buyerInterestTotal = new Counter({
      name: 'buyer_interest_total',
      help: 'Total number of buyer interests expressed',
      labelNames: ['industry', 'buyer_segment', 'listing_type']
    });

    this.loanApplicationsTotal = new Counter({
      name: 'loan_applications_total',
      help: 'Total number of loan applications',
      labelNames: ['nbfc', 'status', 'loan_type']
    });

    this.valuationRequestsTotal = new Counter({
      name: 'valuation_requests_total',
      help: 'Total number of valuation requests',
      labelNames: ['industry', 'model_used', 'confidence_level']
    });

    this.transactionCompletionTotal = new Counter({
      name: 'transaction_completion_total',
      help: 'Total number of completed transactions',
      labelNames: ['industry', 'transaction_type', 'agent_involved']
    });

    // ML Metrics
    this.mlModelAccuracy = new Gauge({
      name: 'ml_model_accuracy',
      help: 'Accuracy of ML models',
      labelNames: ['model_name', 'version']
    });

    this.mlModelLatency = new Histogram({
      name: 'ml_model_latency_seconds',
      help: 'Latency of ML model predictions',
      labelNames: ['model_name', 'prediction_type'],
      buckets: [0.1, 0.5, 1, 2, 5]
    });

    this.mlModelPredictions = new Counter({
      name: 'ml_model_predictions_total',
      help: 'Total number of ML model predictions',
      labelNames: ['model_name', 'prediction_type', 'confidence_level']
    });

    // Queue Metrics
    this.queueJobsTotal = new Counter({
      name: 'queue_jobs_total',
      help: 'Total number of queue jobs',
      labelNames: ['queue_name', 'job_type', 'status']
    });

    this.queueJobDuration = new Histogram({
      name: 'queue_job_duration_seconds',
      help: 'Duration of queue jobs in seconds',
      labelNames: ['queue_name', 'job_type'],
      buckets: [1, 5, 10, 30, 60, 300]
    });

    this.queueJobsActive = new Gauge({
      name: 'queue_jobs_active',
      help: 'Number of active queue jobs',
      labelNames: ['queue_name']
    });

    this.queueJobsWaiting = new Gauge({
      name: 'queue_jobs_waiting',
      help: 'Number of waiting queue jobs',
      labelNames: ['queue_name']
    });

    // Database Metrics
    this.dbConnectionsActive = new Gauge({
      name: 'db_connections_active',
      help: 'Number of active database connections'
    });

    this.dbQueryDuration = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['query_type', 'table'],
      buckets: [0.01, 0.1, 0.5, 1, 2, 5]
    });

    this.dbQueryTotal = new Counter({
      name: 'db_query_total',
      help: 'Total number of database queries',
      labelNames: ['query_type', 'table', 'status']
    });

    // Real-time Metrics
    this.socketConnectionsActive = new Gauge({
      name: 'socket_connections_active',
      help: 'Number of active socket connections'
    });

    this.socketMessagesTotal = new Counter({
      name: 'socket_messages_total',
      help: 'Total number of socket messages',
      labelNames: ['message_type', 'room_type']
    });

    this.socketRoomsActive = new Gauge({
      name: 'socket_rooms_active',
      help: 'Number of active socket rooms',
      labelNames: ['room_type']
    });

    // System Metrics
    this.memoryUsage = new Gauge({
      name: 'process_memory_usage_bytes',
      help: 'Process memory usage in bytes',
      labelNames: ['type']
    });

    this.cpuUsage = new Gauge({
      name: 'process_cpu_usage_percent',
      help: 'Process CPU usage percentage'
    });

    this.activeUsers = new Gauge({
      name: 'active_users_total',
      help: 'Number of active users',
      labelNames: ['user_role', 'time_window']
    });

    this.errorRate = new Counter({
      name: 'error_rate_total',
      help: 'Total number of errors',
      labelNames: ['error_type', 'severity', 'component']
    });

    // Start system metrics collection
    this.startSystemMetricsCollection();
  }

  private startSystemMetricsCollection() {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      const memUsage = process.memoryUsage();
      this.memoryUsage.set({ type: 'rss' }, memUsage.rss);
      this.memoryUsage.set({ type: 'heap_used' }, memUsage.heapUsed);
      this.memoryUsage.set({ type: 'heap_total' }, memUsage.heapTotal);
      this.memoryUsage.set({ type: 'external' }, memUsage.external);

      const cpuUsage = process.cpuUsage();
      this.cpuUsage.set((cpuUsage.user + cpuUsage.system) / 1000000);
    }, 30000);
  }

  // Middleware for automatic HTTP metrics collection
  public httpMetricsMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const requestSize = parseInt(req.get('content-length') || '0', 10);

      // Track request size
      if (requestSize > 0) {
        this.httpRequestSize.observe(
          { method: req.method, route: req.route?.path || req.path },
          requestSize
        );
      }

      // Track response when finished
      res.on('finish', () => {
        const duration = (Date.now() - startTime) / 1000;
        const responseSize = parseInt(res.get('content-length') || '0', 10);
        const userRole = req.user?.role || 'anonymous';

        // Record metrics
        this.httpRequestsTotal.inc({
          method: req.method,
          route: req.route?.path || req.path,
          status_code: res.statusCode.toString(),
          user_role: userRole
        });

        this.httpRequestDuration.observe(
          { method: req.method, route: req.route?.path || req.path, status_code: res.statusCode.toString() },
          duration
        );

        if (responseSize > 0) {
          this.httpResponseSize.observe(
            { method: req.method, route: req.route?.path || req.path },
            responseSize
          );
        }
      });

      next();
    };
  }

  // Business metrics tracking methods
  public trackMSMEListing(industry: string, state: string, status: string) {
    this.msmeListingsTotal.inc({ industry, state, status });
  }

  public trackBuyerInterest(industry: string, buyerSegment: string, listingType: string) {
    this.buyerInterestTotal.inc({ industry, buyer_segment: buyerSegment, listing_type: listingType });
  }

  public trackLoanApplication(nbfc: string, status: string, loanType: string) {
    this.loanApplicationsTotal.inc({ nbfc, status, loan_type: loanType });
  }

  public trackValuationRequest(industry: string, modelUsed: string, confidenceLevel: string) {
    this.valuationRequestsTotal.inc({ industry, model_used: modelUsed, confidence_level: confidenceLevel });
  }

  public trackTransactionCompletion(industry: string, transactionType: string, agentInvolved: boolean) {
    this.transactionCompletionTotal.inc({ 
      industry, 
      transaction_type: transactionType, 
      agent_involved: agentInvolved.toString() 
    });
  }

  // ML metrics tracking methods
  public trackMLModelAccuracy(modelName: string, version: string, accuracy: number) {
    this.mlModelAccuracy.set({ model_name: modelName, version }, accuracy);
  }

  public trackMLModelLatency(modelName: string, predictionType: string, latency: number) {
    this.mlModelLatency.observe({ model_name: modelName, prediction_type: predictionType }, latency);
  }

  public trackMLModelPrediction(modelName: string, predictionType: string, confidenceLevel: string) {
    this.mlModelPredictions.inc({ model_name: modelName, prediction_type: predictionType, confidence_level: confidenceLevel });
  }

  // Queue metrics tracking methods
  public trackQueueJob(queueName: string, jobType: string, status: string) {
    this.queueJobsTotal.inc({ queue_name: queueName, job_type: jobType, status });
  }

  public trackQueueJobDuration(queueName: string, jobType: string, duration: number) {
    this.queueJobDuration.observe({ queue_name: queueName, job_type: jobType }, duration);
  }

  public updateQueueJobsActive(queueName: string, count: number) {
    this.queueJobsActive.set({ queue_name: queueName }, count);
  }

  public updateQueueJobsWaiting(queueName: string, count: number) {
    this.queueJobsWaiting.set({ queue_name: queueName }, count);
  }

  // Database metrics tracking methods
  public trackDBQuery(queryType: string, table: string, status: string, duration: number) {
    this.dbQueryTotal.inc({ query_type: queryType, table, status });
    this.dbQueryDuration.observe({ query_type: queryType, table }, duration);
  }

  public updateDBConnectionsActive(count: number) {
    this.dbConnectionsActive.set(count);
  }

  // Real-time metrics tracking methods
  public updateSocketConnectionsActive(count: number) {
    this.socketConnectionsActive.set(count);
  }

  public trackSocketMessage(messageType: string, roomType: string) {
    this.socketMessagesTotal.inc({ message_type: messageType, room_type: roomType });
  }

  public updateSocketRoomsActive(roomType: string, count: number) {
    this.socketRoomsActive.set({ room_type: roomType }, count);
  }

  // User metrics tracking methods
  public updateActiveUsers(userRole: string, timeWindow: string, count: number) {
    this.activeUsers.set({ user_role: userRole, time_window: timeWindow }, count);
  }

  // Error tracking methods
  public trackError(errorType: string, severity: string, component: string) {
    this.errorRate.inc({ error_type: errorType, severity, component });
  }

  // Get metrics for Prometheus endpoint
  public getMetrics(): Promise<string> {
    return register.metrics();
  }

  // Get registry for custom metrics
  public getRegistry() {
    return register;
  }

  // Health check
  public isHealthy(): boolean {
    return true;
  }
}

export const prometheusMetrics = MSMEPrometheusMetrics.getInstance();

// Export middleware and convenience functions
export const httpMetricsMiddleware = () => prometheusMetrics.httpMetricsMiddleware();
export const getMetrics = () => prometheusMetrics.getMetrics();
export const getRegistry = () => prometheusMetrics.getRegistry();

// Export tracking functions
export const trackMSMEListing = (industry: string, state: string, status: string) => 
  prometheusMetrics.trackMSMEListing(industry, state, status);

export const trackBuyerInterest = (industry: string, buyerSegment: string, listingType: string) => 
  prometheusMetrics.trackBuyerInterest(industry, buyerSegment, listingType);

export const trackLoanApplication = (nbfc: string, status: string, loanType: string) => 
  prometheusMetrics.trackLoanApplication(nbfc, status, loanType);

export const trackValuationRequest = (industry: string, modelUsed: string, confidenceLevel: string) => 
  prometheusMetrics.trackValuationRequest(industry, modelUsed, confidenceLevel);

export const trackTransactionCompletion = (industry: string, transactionType: string, agentInvolved: boolean) => 
  prometheusMetrics.trackTransactionCompletion(industry, transactionType, agentInvolved);

export const trackMLModelAccuracy = (modelName: string, version: string, accuracy: number) => 
  prometheusMetrics.trackMLModelAccuracy(modelName, version, accuracy);

export const trackMLModelLatency = (modelName: string, predictionType: string, latency: number) => 
  prometheusMetrics.trackMLModelLatency(modelName, predictionType, latency);

export const trackMLModelPrediction = (modelName: string, predictionType: string, confidenceLevel: string) => 
  prometheusMetrics.trackMLModelPrediction(modelName, predictionType, confidenceLevel);

export const trackQueueJob = (queueName: string, jobType: string, status: string) => 
  prometheusMetrics.trackQueueJob(queueName, jobType, status);

export const trackQueueJobDuration = (queueName: string, jobType: string, duration: number) => 
  prometheusMetrics.trackQueueJobDuration(queueName, jobType, duration);

export const updateQueueJobsActive = (queueName: string, count: number) => 
  prometheusMetrics.updateQueueJobsActive(queueName, count);

export const updateQueueJobsWaiting = (queueName: string, count: number) => 
  prometheusMetrics.updateQueueJobsWaiting(queueName, count);

export const trackDBQuery = (queryType: string, table: string, status: string, duration: number) => 
  prometheusMetrics.trackDBQuery(queryType, table, status, duration);

export const updateDBConnectionsActive = (count: number) => 
  prometheusMetrics.updateDBConnectionsActive(count);

export const updateSocketConnectionsActive = (count: number) => 
  prometheusMetrics.updateSocketConnectionsActive(count);

export const trackSocketMessage = (messageType: string, roomType: string) => 
  prometheusMetrics.trackSocketMessage(messageType, roomType);

export const updateSocketRoomsActive = (roomType: string, count: number) => 
  prometheusMetrics.updateSocketRoomsActive(roomType, count);

export const updateActiveUsers = (userRole: string, timeWindow: string, count: number) => 
  prometheusMetrics.updateActiveUsers(userRole, timeWindow, count);

export const trackError = (errorType: string, severity: string, component: string) => 
  prometheusMetrics.trackError(errorType, severity, component);

export { prometheusMetrics };