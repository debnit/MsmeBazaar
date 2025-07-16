// Resource manager to prevent file access conflicts

interface ResourceLock {
  id: string;
  owner: string;
  timestamp: number;
  timeout: number;
}

export class ResourceManager {
  private static instance: ResourceManager;
  private locks = new Map<string, ResourceLock>();
  private waitingQueue = new Map<string, Array<{ resolve: (value: boolean) => void; reject: (error: Error) => void }>>();

  private constructor() {
    // Auto-cleanup expired locks
    setInterval(() => this.cleanupExpiredLocks(), 1000);
  }

  public static getInstance(): ResourceManager {
    if (!ResourceManager.instance) {
      ResourceManager.instance = new ResourceManager();
    }
    return ResourceManager.instance;
  }

  // Acquire resource with automatic cleanup and tracing
  public async acquireResource(resourceId: string, owner: string, timeout: number = 5000): Promise<boolean> {
    const startTime = performance.now();
    
    return new Promise((resolve, reject) => {
      const currentTime = Date.now();
      const existingLock = this.locks.get(resourceId);

      // Check if resource is available
      if (!existingLock || currentTime > existingLock.timestamp + existingLock.timeout) {
        // Resource is available
        this.locks.set(resourceId, {
          id: resourceId,
          owner,
          timestamp: currentTime,
          timeout
        });
        
        const duration = performance.now() - startTime;
        if (duration > 50) {
          console.warn(`ResourceManager.acquireResource(${resourceId}) took ${duration.toFixed(2)}ms`);
        }
        
        resolve(true);
        return;
      }

      // Resource is locked, add to waiting queue
      if (!this.waitingQueue.has(resourceId)) {
        this.waitingQueue.set(resourceId, []);
      }
      
      this.waitingQueue.get(resourceId)!.push({ resolve, reject });

      // Set timeout for waiting
      setTimeout(() => {
        const queue = this.waitingQueue.get(resourceId);
        if (queue) {
          const index = queue.findIndex(item => item.resolve === resolve);
          if (index > -1) {
            queue.splice(index, 1);
            
            const duration = performance.now() - startTime;
            console.warn(`ResourceManager.acquireResource(${resourceId}) timed out after ${duration.toFixed(2)}ms`);
            
            resolve(false); // Timeout
          }
        }
      }, timeout);
    });
  }

  // Release resource with tracing
  public releaseResource(resourceId: string, owner: string): boolean {
    const startTime = performance.now();
    
    try {
      const lock = this.locks.get(resourceId);
      
      if (!lock || lock.owner !== owner) {
        return false; // Not owner or doesn't exist
      }

      // Remove lock
      this.locks.delete(resourceId);

      // Process waiting queue
      const queue = this.waitingQueue.get(resourceId);
      if (queue && queue.length > 0) {
        const next = queue.shift()!;
        const currentTime = Date.now();
        
        // Give resource to next in queue
        this.locks.set(resourceId, {
          id: resourceId,
          owner: `queue-${currentTime}`,
          timestamp: currentTime,
          timeout: 5000
        });
        
        next.resolve(true);
      }

      const duration = performance.now() - startTime;
      if (duration > 10) {
        console.warn(`ResourceManager.releaseResource(${resourceId}) took ${duration.toFixed(2)}ms`);
      }

      return true;
    } catch (error) {
      console.error('ResourceManager.releaseResource failed:', error);
      return false;
    }
  }

  // Check if resource is locked
  public isResourceLocked(resourceId: string): boolean {
    const lock = this.locks.get(resourceId);
    if (!lock) return false;
    
    const currentTime = Date.now();
    if (currentTime > lock.timestamp + lock.timeout) {
      this.locks.delete(resourceId);
      return false;
    }
    
    return true;
  }

  // Clean up expired locks
  private cleanupExpiredLocks(): void {
    const currentTime = Date.now();
    
    for (const [resourceId, lock] of this.locks.entries()) {
      if (currentTime > lock.timestamp + lock.timeout) {
        this.locks.delete(resourceId);
        
        // Process waiting queue for this resource
        const queue = this.waitingQueue.get(resourceId);
        if (queue && queue.length > 0) {
          const next = queue.shift()!;
          next.resolve(false); // Expired, but allow retry
        }
      }
    }
  }

  // Get resource status
  public getResourceStatus(resourceId: string): { locked: boolean; owner?: string; timeLeft?: number } {
    const lock = this.locks.get(resourceId);
    if (!lock) {
      return { locked: false };
    }
    
    const currentTime = Date.now();
    const timeLeft = (lock.timestamp + lock.timeout) - currentTime;
    
    if (timeLeft <= 0) {
      this.locks.delete(resourceId);
      return { locked: false };
    }
    
    return {
      locked: true,
      owner: lock.owner,
      timeLeft
    };
  }

  // Force release all resources for owner
  public forceReleaseAll(owner: string): number {
    let count = 0;
    
    for (const [resourceId, lock] of this.locks.entries()) {
      if (lock.owner === owner) {
        this.locks.delete(resourceId);
        count++;
      }
    }
    
    return count;
  }
}

// Export singleton
export const resourceManager = ResourceManager.getInstance();
export default resourceManager;