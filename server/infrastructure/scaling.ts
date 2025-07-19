// Auto-scaling and load balancing configuration
export interface ScalingConfig {
  minInstances: number;
  maxInstances: number;
  targetCPUUtilization: number;
  targetMemoryUtilization: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  cooldownPeriod: number;
}

export class AutoScaler {
  private config: ScalingConfig;
  private currentInstances: number = 1;
  private lastScalingAction: Date = new Date();
  private metrics: Array<{ timestamp: Date; cpu: number; memory: number; requests: number }> = [];

  constructor(config: ScalingConfig) {
    this.config = config;
    this.startMetricsCollection();
  }

  private startMetricsCollection() {
    setInterval(() => {
      this.collectMetrics();
    }, 60000); // Collect every minute
  }

  private collectMetrics() {
    const now = new Date();
    const memUsage = process.memoryUsage();

    // Simulate CPU usage (in production, use actual CPU metrics)
    const cpuUsage = Math.random() * 100;

    // Calculate memory usage percentage
    const memoryUsage = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    // Simulate request count (in production, use actual request metrics)
    const requestCount = Math.floor(Math.random() * 1000);

    this.metrics.push({
      timestamp: now,
      cpu: cpuUsage,
      memory: memoryUsage,
      requests: requestCount,
    });

    // Keep only last 10 minutes of metrics
    this.metrics = this.metrics.filter(m =>
      now.getTime() - m.timestamp.getTime() < 10 * 60 * 1000,
    );

    this.evaluateScaling();
  }

  private evaluateScaling() {
    if (this.metrics.length < 3) {return;}

    const now = new Date();
    const timeSinceLastScaling = now.getTime() - this.lastScalingAction.getTime();

    // Respect cooldown period
    if (timeSinceLastScaling < this.config.cooldownPeriod * 1000) {
      return;
    }

    const recentMetrics = this.metrics.slice(-5); // Last 5 minutes
    const avgCPU = recentMetrics.reduce((sum, m) => sum + m.cpu, 0) / recentMetrics.length;
    const avgMemory = recentMetrics.reduce((sum, m) => sum + m.memory, 0) / recentMetrics.length;
    const avgRequests = recentMetrics.reduce((sum, m) => sum + m.requests, 0) / recentMetrics.length;

    const shouldScaleUp = (
      avgCPU > this.config.targetCPUUtilization ||
      avgMemory > this.config.targetMemoryUtilization ||
      avgRequests > this.config.scaleUpThreshold
    ) && this.currentInstances < this.config.maxInstances;

    const shouldScaleDown = (
      avgCPU < this.config.targetCPUUtilization * 0.5 &&
      avgMemory < this.config.targetMemoryUtilization * 0.5 &&
      avgRequests < this.config.scaleDownThreshold
    ) && this.currentInstances > this.config.minInstances;

    if (shouldScaleUp) {
      this.scaleUp();
    } else if (shouldScaleDown) {
      this.scaleDown();
    }
  }

  private scaleUp() {
    this.currentInstances++;
    this.lastScalingAction = new Date();

    console.log(`📈 Scaling UP to ${this.currentInstances} instances`);

    // In production, this would trigger container orchestration
    this.triggerScaling('up');
  }

  private scaleDown() {
    this.currentInstances--;
    this.lastScalingAction = new Date();

    console.log(`📉 Scaling DOWN to ${this.currentInstances} instances`);

    // In production, this would trigger container orchestration
    this.triggerScaling('down');
  }

  private triggerScaling(direction: 'up' | 'down') {
    // This would integrate with Kubernetes, Docker Swarm, or cloud auto-scaling services
    console.log(`🔄 Triggering ${direction} scaling event`);

    // Example Kubernetes scaling command (would be executed via kubectl or K8s API)
    const kubectlCommand = `kubectl scale deployment msmesquare-api --replicas=${this.currentInstances}`;
    console.log(`K8s Command: ${kubectlCommand}`);

    // Example Docker Swarm scaling
    const swarmCommand = `docker service scale msmesquare-stack_api=${this.currentInstances}`;
    console.log(`Swarm Command: ${swarmCommand}`);
  }

  getStatus() {
    return {
      currentInstances: this.currentInstances,
      config: this.config,
      recentMetrics: this.metrics.slice(-5),
      lastScalingAction: this.lastScalingAction,
    };
  }
}

// Load balancer configuration
export class LoadBalancer {
  private servers: Array<{ id: string; url: string; health: 'healthy' | 'unhealthy'; load: number }> = [];
  private currentIndex = 0;

  constructor(serverList: Array<{ id: string; url: string }>) {
    this.servers = serverList.map(server => ({
      ...server,
      health: 'healthy' as const,
      load: 0,
    }));

    this.startHealthChecks();
  }

  private startHealthChecks() {
    setInterval(() => {
      this.checkServerHealth();
    }, 30000); // Check every 30 seconds
  }

  private async checkServerHealth() {
    for (const server of this.servers) {
      try {
        // In production, this would make actual HTTP requests
        const response = await fetch(`${server.url}/health`);
        server.health = response.ok ? 'healthy' : 'unhealthy';

        // Simulate load calculation
        server.load = Math.random() * 100;
      } catch (error) {
        server.health = 'unhealthy';
        server.load = 0;
      }
    }
  }

  // Round-robin load balancing
  getNextServer() {
    const healthyServers = this.servers.filter(s => s.health === 'healthy');

    if (healthyServers.length === 0) {
      throw new Error('No healthy servers available');
    }

    const server = healthyServers[this.currentIndex % healthyServers.length];
    this.currentIndex++;

    return server;
  }

  // Least connections load balancing
  getLeastLoadedServer() {
    const healthyServers = this.servers.filter(s => s.health === 'healthy');

    if (healthyServers.length === 0) {
      throw new Error('No healthy servers available');
    }

    return healthyServers.reduce((least, current) =>
      current.load < least.load ? current : least,
    );
  }

  // Weighted round-robin
  getWeightedServer() {
    const healthyServers = this.servers.filter(s => s.health === 'healthy');

    if (healthyServers.length === 0) {
      throw new Error('No healthy servers available');
    }

    // Choose server based on inverse of load (lower load = higher weight)
    const weights = healthyServers.map(s => 100 - s.load);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    let random = Math.random() * totalWeight;

    for (let i = 0; i < healthyServers.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return healthyServers[i];
      }
    }

    return healthyServers[0];
  }

  getStatus() {
    return {
      servers: this.servers,
      healthyCount: this.servers.filter(s => s.health === 'healthy').length,
      totalCount: this.servers.length,
      averageLoad: this.servers.reduce((sum, s) => sum + s.load, 0) / this.servers.length,
    };
  }
}

// Circuit breaker pattern for resilience
export class CircuitBreaker {
  private failures = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(
    private failureThreshold: number = 5,
    private timeout: number = 60000, // 1 minute
    private monitoringPeriod: number = 10000, // 10 seconds
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;

    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= 3) {
        this.state = 'closed';
      }
    }
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
      successCount: this.successCount,
    };
  }
}

// Default scaling configuration
export const defaultScalingConfig: ScalingConfig = {
  minInstances: 1,
  maxInstances: 10,
  targetCPUUtilization: 70,
  targetMemoryUtilization: 80,
  scaleUpThreshold: 100, // requests per minute
  scaleDownThreshold: 20, // requests per minute
  cooldownPeriod: 300, // 5 minutes
};

// Initialize auto-scaler
export const autoScaler = new AutoScaler(defaultScalingConfig);

// Initialize load balancer (example servers)
export const loadBalancer = new LoadBalancer([
  { id: 'server1', url: 'http://localhost:5000' },
  { id: 'server2', url: 'http://localhost:5001' },
  { id: 'server3', url: 'http://localhost:5002' },
]);

// Circuit breakers for external services
export const circuitBreakers = {
  database: new CircuitBreaker(5, 60000, 10000),
  redis: new CircuitBreaker(3, 30000, 5000),
  stripe: new CircuitBreaker(5, 120000, 15000),
  valuation: new CircuitBreaker(10, 300000, 30000),
};
