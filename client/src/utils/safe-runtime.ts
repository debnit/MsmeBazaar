// Safe runtime system to prevent plugin incompatibility and resource conflicts

// Runtime compatibility checker
export class SafeRuntime {
  private static instance: SafeRuntime;
  private compatibilityCache = new Map<string, boolean>();
  private resourceLocks = new Set<string>();
  private errorRecovery = new Map<string, () => void>();

  private constructor() {}

  public static getInstance(): SafeRuntime {
    if (!SafeRuntime.instance) {
      SafeRuntime.instance = new SafeRuntime();
    }
    return SafeRuntime.instance;
  }

  // Check if a feature is compatible with current environment
  public isCompatible(feature: string): boolean {
    if (this.compatibilityCache.has(feature)) {
      return this.compatibilityCache.get(feature)!;
    }

    let compatible = true;

    try {
      switch (feature) {
        case 'performance.memory':
          compatible = typeof window !== 'undefined' && 
                      'performance' in window && 
                      (performance as any).memory !== undefined;
          break;
        
        case 'local-storage':
          compatible = typeof window !== 'undefined' && 
                      'localStorage' in window && 
                      window.localStorage !== null;
          break;
        
        case 'session-storage':
          compatible = typeof window !== 'undefined' && 
                      'sessionStorage' in window && 
                      window.sessionStorage !== null;
          break;
        
        case 'web-workers':
          compatible = typeof window !== 'undefined' && 
                      'Worker' in window;
          break;
        
        case 'service-worker':
          compatible = typeof window !== 'undefined' && 
                      'serviceWorker' in navigator;
          break;
        
        case 'gc':
          compatible = typeof window !== 'undefined' && 
                      (window as any).gc !== undefined;
          break;
        
        default:
          compatible = false;
      }
    } catch (error) {
      compatible = false;
    }

    this.compatibilityCache.set(feature, compatible);
    return compatible;
  }

  // Acquire resource lock with timeout
  public acquireResource(resourceId: string, timeout: number = 5000): Promise<boolean> {
    return new Promise((resolve) => {
      const tryAcquire = () => {
        if (!this.resourceLocks.has(resourceId)) {
          this.resourceLocks.add(resourceId);
          resolve(true);
          return;
        }
        
        // Wait and retry
        setTimeout(tryAcquire, 100);
      };
      
      tryAcquire();
      
      // Timeout fallback
      setTimeout(() => {
        if (!this.resourceLocks.has(resourceId)) {
          this.resourceLocks.add(resourceId);
          resolve(true);
        } else {
          resolve(false);
        }
      }, timeout);
    });
  }

  // Release resource lock
  public releaseResource(resourceId: string): void {
    this.resourceLocks.delete(resourceId);
  }

  // Safe execution with error recovery
  public safeExecute<T>(
    operation: () => T,
    fallback: T,
    errorHandler?: (error: Error) => void
  ): T {
    try {
      return operation();
    } catch (error) {
      if (errorHandler) {
        errorHandler(error as Error);
      } else {
        console.warn('Safe execution failed:', error);
      }
      return fallback;
    }
  }

  // Register error recovery function
  public registerErrorRecovery(errorType: string, recovery: () => void): void {
    this.errorRecovery.set(errorType, recovery);
  }

  // Attempt error recovery
  public attemptRecovery(errorType: string): boolean {
    const recovery = this.errorRecovery.get(errorType);
    if (recovery) {
      try {
        recovery();
        return true;
      } catch (error) {
        console.warn('Error recovery failed:', error);
        return false;
      }
    }
    return false;
  }

  // Check dependencies
  public checkDependencies(dependencies: string[]): { missing: string[], available: string[] } {
    const missing: string[] = [];
    const available: string[] = [];

    dependencies.forEach(dep => {
      if (this.isCompatible(dep)) {
        available.push(dep);
      } else {
        missing.push(dep);
      }
    });

    return { missing, available };
  }

  // Safe feature initialization
  public initializeFeature(
    featureName: string,
    dependencies: string[],
    initFunction: () => void,
    fallbackFunction?: () => void
  ): boolean {
    const { missing } = this.checkDependencies(dependencies);
    
    if (missing.length > 0) {
      console.warn(`Feature ${featureName} missing dependencies:`, missing);
      if (fallbackFunction) {
        this.safeExecute(fallbackFunction, undefined);
      }
      return false;
    }

    return this.safeExecute(
      () => {
        initFunction();
        return true;
      },
      false,
      (error) => {
        console.warn(`Feature ${featureName} initialization failed:`, error);
        if (fallbackFunction) {
          this.safeExecute(fallbackFunction, undefined);
        }
      }
    );
  }
}

// Simple state management without static variables
export class SimpleStateManager {
  private state: Record<string, any> = {};
  private listeners: Record<string, Array<(value: any) => void>> = {};

  // Set state value
  public setState<T>(key: string, value: T): void {
    const runtime = SafeRuntime.getInstance();
    
    runtime.safeExecute(() => {
      this.state[key] = value;
      
      // Notify listeners
      const keyListeners = this.listeners[key] || [];
      keyListeners.forEach(listener => {
        runtime.safeExecute(
          () => listener(value),
          undefined,
          (error) => console.warn('State listener error:', error)
        );
      });
    }, undefined);
  }

  // Get state value
  public getState<T>(key: string, defaultValue: T): T {
    const runtime = SafeRuntime.getInstance();
    
    return runtime.safeExecute(
      () => this.state[key] ?? defaultValue,
      defaultValue
    );
  }

  // Subscribe to state changes
  public subscribe<T>(key: string, listener: (value: T) => void): () => void {
    const runtime = SafeRuntime.getInstance();
    
    return runtime.safeExecute(() => {
      if (!this.listeners[key]) {
        this.listeners[key] = [];
      }
      
      this.listeners[key].push(listener);
      
      // Return unsubscribe function
      return () => {
        const listeners = this.listeners[key] || [];
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      };
    }, () => {});
  }

  // Clear state
  public clearState(key?: string): void {
    const runtime = SafeRuntime.getInstance();
    
    runtime.safeExecute(() => {
      if (key) {
        delete this.state[key];
        delete this.listeners[key];
      } else {
        this.state = {};
        this.listeners = {};
      }
    }, undefined);
  }
}

// Safe toast system without static variables
export class SafeToastManager {
  private stateManager = new SimpleStateManager();
  private runtime = SafeRuntime.getInstance();
  private resourceId = 'toast-manager';

  constructor() {
    this.stateManager.setState('toasts', []);
    this.initializeWithResourceLock();
  }

  private async initializeWithResourceLock() {
    const acquired = await this.runtime.acquireResource(this.resourceId);
    if (!acquired) {
      console.warn('Failed to acquire toast manager resource lock');
    }
  }

  // Add toast with tracing (async)
  public async addToast(toast: {
    id: string;
    title?: string;
    description?: string;
    variant?: 'default' | 'destructive' | 'success' | 'warning';
    action?: any;
  }): Promise<void> {
    const startTime = performance.now();
    
    try {
      if (!toast || !toast.id) return;

      // Use async state management
      const currentToasts = await this.getToastsAsync();
      const newToasts = [...currentToasts, toast];
      await this.setToastsAsync(newToasts);
      
      const duration = performance.now() - startTime;
      if (duration > 10) {
        console.warn(`SafeToastManager.addToast took ${duration.toFixed(2)}ms`);
      }
    } catch (error) {
      console.error('SafeToastManager.addToast failed:', error);
    }
  }

  // Remove toast with tracing (async)
  public async removeToast(id: string): Promise<void> {
    const startTime = performance.now();
    
    try {
      if (!id) return;

      // Use async state management
      const currentToasts = await this.getToastsAsync();
      const newToasts = currentToasts.filter((toast: any) => toast.id !== id);
      await this.setToastsAsync(newToasts);
      
      const duration = performance.now() - startTime;
      if (duration > 10) {
        console.warn(`SafeToastManager.removeToast took ${duration.toFixed(2)}ms`);
      }
    } catch (error) {
      console.error('SafeToastManager.removeToast failed:', error);
    }
  }

  // Clear all toasts with tracing (async)
  public async clearToasts(): Promise<void> {
    const startTime = performance.now();
    
    try {
      await this.setToastsAsync([]);
      
      const duration = performance.now() - startTime;
      if (duration > 10) {
        console.warn(`SafeToastManager.clearToasts took ${duration.toFixed(2)}ms`);
      }
    } catch (error) {
      console.error('SafeToastManager.clearToasts failed:', error);
    }
  }

  // Get toasts with tracing
  public getToasts(): any[] {
    const startTime = performance.now();
    
    try {
      const toasts = this.stateManager.getState('toasts', []);
      
      const duration = performance.now() - startTime;
      if (duration > 5) {
        console.warn(`SafeToastManager.getToasts took ${duration.toFixed(2)}ms`);
      }
      
      return toasts;
    } catch (error) {
      console.error('SafeToastManager.getToasts failed:', error);
      return [];
    }
  }

  // Subscribe to toast changes with tracing (async)
  public async subscribe(listener: (toasts: any[]) => void): Promise<() => void> {
    const startTime = performance.now();
    
    try {
      const unsubscribe = this.stateManager.subscribe('toasts', listener);
      
      const duration = performance.now() - startTime;
      if (duration > 10) {
        console.warn(`SafeToastManager.subscribe took ${duration.toFixed(2)}ms`);
      }
      
      return unsubscribe;
    } catch (error) {
      console.error('SafeToastManager.subscribe failed:', error);
      return () => {};
    }
  }

  // Async helper methods
  private async getToastsAsync(): Promise<any[]> {
    return new Promise((resolve) => {
      // Use requestAnimationFrame for non-blocking execution
      requestAnimationFrame(() => {
        try {
          const toasts = this.stateManager.getState('toasts', []);
          resolve(toasts);
        } catch (error) {
          console.error('Failed to get toasts:', error);
          resolve([]);
        }
      });
    });
  }

  private async setToastsAsync(toasts: any[]): Promise<void> {
    return new Promise((resolve) => {
      // Use requestAnimationFrame for non-blocking execution
      requestAnimationFrame(() => {
        try {
          this.stateManager.setState('toasts', toasts);
          resolve();
        } catch (error) {
          console.error('Failed to set toasts:', error);
          resolve();
        }
      });
    });
  }
}

// Safe memory management
export class SafeMemoryManager {
  private runtime = SafeRuntime.getInstance();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private memoryThreshold = 100 * 1024 * 1024; // 100MB

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    this.runtime.initializeFeature(
      'memory-management',
      ['performance.memory'],
      () => this.startMemoryMonitoring(),
      () => this.startBasicCleanup()
    );
  }

  private startMemoryMonitoring(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.runtime.safeExecute(() => {
        if (this.runtime.isCompatible('performance.memory')) {
          const memory = (performance as any).memory;
          if (memory.usedJSHeapSize > this.memoryThreshold) {
            this.performCleanup();
          }
        }
      }, undefined);
    }, 30000); // Check every 30 seconds
  }

  private startBasicCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 60000); // Clean every minute
  }

  private performCleanup(): void {
    this.runtime.safeExecute(() => {
      // Clean localStorage
      if (this.runtime.isCompatible('local-storage')) {
        this.cleanLocalStorage();
      }

      // Clean sessionStorage
      if (this.runtime.isCompatible('session-storage')) {
        this.cleanSessionStorage();
      }

      // Trigger garbage collection if available
      if (this.runtime.isCompatible('gc')) {
        (window as any).gc();
      }
    }, undefined);
  }

  private cleanLocalStorage(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('temp_') || key.startsWith('cache_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('localStorage cleanup failed:', error);
    }
  }

  private cleanSessionStorage(): void {
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith('temp_') || key.startsWith('cache_')) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('sessionStorage cleanup failed:', error);
    }
  }

  public stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Export instances
export const safeRuntime = SafeRuntime.getInstance();
export const safeToastManager = new SafeToastManager();
export const safeMemoryManager = new SafeMemoryManager();

// Initialize error recovery
safeRuntime.registerErrorRecovery('memory-leak', () => {
  safeMemoryManager.stop();
  new SafeMemoryManager();
});

safeRuntime.registerErrorRecovery('state-corruption', () => {
  safeToastManager.clearToasts();
});

export default safeRuntime;