// Startup Manager - Selective service initialization
export class StartupManager {
  private coreServices: string[] = [];
  private secondaryServices: string[] = [];
  private initializedServices: Set<string> = new Set();

  constructor() {
    this.defineCoreServices();
    this.defineSecondaryServices();
  }

  // Define critical services needed for basic app functionality
  private defineCoreServices() {
    this.coreServices = [
      'database',
      'authentication',
      'basic-routing',
      'health-check'
    ];
  }

  // Define secondary services that can be loaded after core startup
  private defineSecondaryServices() {
    this.secondaryServices = [
      'cache-management',
      'cpu-optimization',
      'process-priority',
      'monitoring',
      'performance-tracking',
      'ml-engines',
      'queue-system',
      'notifications',
      'escrow',
      'compliance',
      'document-generation'
    ];
  }

  // Initialize core services only
  async initializeCoreServices() {
    console.log('🚀 Starting core services...');
    
    for (const service of this.coreServices) {
      try {
        await this.initializeService(service);
        this.initializedServices.add(service);
        console.log(`✅ Core service initialized: ${service}`);
      } catch (error) {
        console.error(`❌ Failed to initialize core service ${service}:`, error);
        throw error; // Core services are critical
      }
    }
    
    console.log('✅ All core services initialized');
  }

  // Initialize secondary services gradually
  async initializeSecondaryServices() {
    console.log('🔄 Starting secondary services...');
    
    // Initialize secondary services with delays to prevent resource spikes
    for (let i = 0; i < this.secondaryServices.length; i++) {
      const service = this.secondaryServices[i];
      
      try {
        await this.initializeService(service);
        this.initializedServices.add(service);
        console.log(`✅ Secondary service initialized: ${service}`);
        
        // Add delay between service initializations
        if (i < this.secondaryServices.length - 1) {
          await this.delay(500); // 500ms delay
        }
      } catch (error) {
        console.warn(`⚠️ Secondary service ${service} failed to initialize:`, error);
        // Continue with other services
      }
    }
    
    console.log('✅ Secondary services initialization complete');
  }

  // Initialize a specific service
  private async initializeService(serviceName: string) {
    switch (serviceName) {
      case 'database':
        // Already initialized in db.ts
        break;
      case 'authentication':
        // Basic auth middleware
        break;
      case 'basic-routing':
        // Core routes only
        break;
      case 'health-check':
        // Health endpoint
        break;
      case 'cache-management':
        const { cacheManager } = await import('./cache-management');
        // Already initialized in constructor
        break;
      case 'cpu-optimization':
        const { cpuOptimizer } = await import('./cpu-optimization');
        // Already initialized in constructor
        break;
      case 'process-priority':
        const { processPriorityManager } = await import('./process-priority');
        processPriorityManager.setupMonitoring();
        break;
      case 'monitoring':
        const { monitoringService } = await import('../services/monitoring');
        // Service available but not actively monitoring yet
        break;
      case 'performance-tracking':
        // Performance tracking can be enabled later
        break;
      case 'ml-engines':
        // ML engines loaded on-demand
        break;
      case 'queue-system':
        // BullMQ initialization
        break;
      case 'notifications':
        // Notification service
        break;
      case 'escrow':
        // Escrow service
        break;
      case 'compliance':
        // Compliance service
        break;
      case 'document-generation':
        // Document generation service
        break;
      default:
        console.warn(`Unknown service: ${serviceName}`);
    }
  }

  // Get initialization status
  getStatus() {
    return {
      coreServices: this.coreServices.map(service => ({
        name: service,
        initialized: this.initializedServices.has(service)
      })),
      secondaryServices: this.secondaryServices.map(service => ({
        name: service,
        initialized: this.initializedServices.has(service)
      })),
      totalInitialized: this.initializedServices.size,
      totalServices: this.coreServices.length + this.secondaryServices.length
    };
  }

  // Check if service is initialized
  isServiceInitialized(serviceName: string): boolean {
    return this.initializedServices.has(serviceName);
  }

  // Delay utility
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const startupManager = new StartupManager();