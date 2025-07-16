// Memory management for static variables to prevent memory leakage

import { STATIC_TOAST_STATE, STATIC_APP_STATE } from './static-variables';

// Memory management configuration
const MEMORY_CONFIG = {
  MAX_TOASTS: 10,
  MAX_NOTIFICATIONS: 50,
  CLEANUP_INTERVAL: 30000, // 30 seconds
  FORCE_CLEANUP_INTERVAL: 120000, // 2 minutes
  MAX_LISTENERS: 20,
  MEMORY_THRESHOLD: 100 * 1024 * 1024, // 100MB
};

// Memory stats tracking
let memoryStats = {
  lastCleanup: Date.now(),
  cleanupCount: 0,
  memoryUsage: 0,
  gcCount: 0,
};

// Memory cleanup utilities
export class MemoryManager {
  private static cleanupTimer: NodeJS.Timeout | null = null;
  private static forceCleanupTimer: NodeJS.Timeout | null = null;
  private static isCleaningUp = false;

  // Initialize memory management
  static initialize() {
    console.log('Memory manager initialized');
    
    // Start periodic cleanup
    this.startPeriodicCleanup();
    
    // Monitor memory usage
    this.startMemoryMonitoring();
    
    // Setup cleanup on page unload
    this.setupUnloadCleanup();
  }

  // Start periodic cleanup
  private static startPeriodicCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, MEMORY_CONFIG.CLEANUP_INTERVAL);

    // Force cleanup timer
    if (this.forceCleanupTimer) {
      clearInterval(this.forceCleanupTimer);
    }
    
    this.forceCleanupTimer = setInterval(() => {
      this.performForceCleanup();
    }, MEMORY_CONFIG.FORCE_CLEANUP_INTERVAL);
  }

  // Monitor memory usage
  private static startMemoryMonitoring() {
    if (typeof window !== 'undefined' && 'performance' in window && (performance as any).memory) {
      setInterval(() => {
        try {
          const memory = (performance as any).memory;
          memoryStats.memoryUsage = memory.usedJSHeapSize;
          
          // If memory usage is high, trigger cleanup
          if (memory.usedJSHeapSize > MEMORY_CONFIG.MEMORY_THRESHOLD) {
            console.warn('High memory usage detected:', memory.usedJSHeapSize);
            this.performForceCleanup();
          }
        } catch (error) {
          console.warn('Memory monitoring failed:', error);
        }
      }, 10000); // Check every 10 seconds
    }
  }

  // Setup cleanup on page unload
  private static setupUnloadCleanup() {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.performCompleteCleanup();
      });
      
      window.addEventListener('unload', () => {
        this.performCompleteCleanup();
      });
    }
  }

  // Perform regular cleanup
  static performCleanup() {
    if (this.isCleaningUp) return;
    
    this.isCleaningUp = true;
    
    try {
      // Clean toast state
      this.cleanToastState();
      
      // Clean app state
      this.cleanAppState();
      
      // Clean listeners
      this.cleanListeners();
      
      // Update stats
      memoryStats.lastCleanup = Date.now();
      memoryStats.cleanupCount++;
      
      console.log('Memory cleanup completed');
    } catch (error) {
      console.warn('Memory cleanup failed:', error);
    } finally {
      this.isCleaningUp = false;
    }
  }

  // Clean toast state
  private static cleanToastState() {
    try {
      // Limit number of toasts
      if (STATIC_TOAST_STATE.toasts.length > MEMORY_CONFIG.MAX_TOASTS) {
        const excess = STATIC_TOAST_STATE.toasts.length - MEMORY_CONFIG.MAX_TOASTS;
        STATIC_TOAST_STATE.toasts.splice(0, excess);
      }
      
      // Remove expired toasts (older than 5 minutes)
      const now = Date.now();
      STATIC_TOAST_STATE.toasts = STATIC_TOAST_STATE.toasts.filter(toast => {
        const toastAge = now - (toast as any).timestamp || 0;
        return toastAge < 300000; // 5 minutes
      });
    } catch (error) {
      console.warn('Toast state cleanup failed:', error);
      // Reset to safe state
      STATIC_TOAST_STATE.toasts.length = 0;
    }
  }

  // Clean app state
  private static cleanAppState() {
    try {
      // Limit notifications
      if (STATIC_APP_STATE.notifications.length > MEMORY_CONFIG.MAX_NOTIFICATIONS) {
        const excess = STATIC_APP_STATE.notifications.length - MEMORY_CONFIG.MAX_NOTIFICATIONS;
        STATIC_APP_STATE.notifications.splice(0, excess);
      }
      
      // Clean preferences (remove temporary keys)
      Object.keys(STATIC_APP_STATE.preferences).forEach(key => {
        if (key.startsWith('temp_') || key.startsWith('cache_')) {
          delete STATIC_APP_STATE.preferences[key];
        }
      });
    } catch (error) {
      console.warn('App state cleanup failed:', error);
      // Reset to safe state
      STATIC_APP_STATE.notifications.length = 0;
      STATIC_APP_STATE.preferences = {};
    }
  }

  // Clean listeners
  private static cleanListeners() {
    try {
      // Limit toast listeners
      if (STATIC_TOAST_STATE.listeners.length > MEMORY_CONFIG.MAX_LISTENERS) {
        const excess = STATIC_TOAST_STATE.listeners.length - MEMORY_CONFIG.MAX_LISTENERS;
        STATIC_TOAST_STATE.listeners.splice(0, excess);
      }
      
      // Limit app listeners
      if (STATIC_APP_STATE.listeners.length > MEMORY_CONFIG.MAX_LISTENERS) {
        const excess = STATIC_APP_STATE.listeners.length - MEMORY_CONFIG.MAX_LISTENERS;
        STATIC_APP_STATE.listeners.splice(0, excess);
      }
    } catch (error) {
      console.warn('Listeners cleanup failed:', error);
      // Reset to safe state
      STATIC_TOAST_STATE.listeners.length = 0;
      STATIC_APP_STATE.listeners.length = 0;
    }
  }

  // Perform force cleanup
  static performForceCleanup() {
    try {
      // Clear all toasts
      STATIC_TOAST_STATE.toasts.length = 0;
      
      // Clear notifications
      STATIC_APP_STATE.notifications.length = 0;
      
      // Clear temporary preferences
      STATIC_APP_STATE.preferences = {};
      
      // Trigger garbage collection if available
      if (typeof window !== 'undefined' && (window as any).gc) {
        (window as any).gc();
        memoryStats.gcCount++;
      }
      
      console.log('Force cleanup completed');
    } catch (error) {
      console.warn('Force cleanup failed:', error);
    }
  }

  // Perform complete cleanup
  static performCompleteCleanup() {
    try {
      // Clear all timers
      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer);
        this.cleanupTimer = null;
      }
      
      if (this.forceCleanupTimer) {
        clearInterval(this.forceCleanupTimer);
        this.forceCleanupTimer = null;
      }
      
      // Clear all static state
      STATIC_TOAST_STATE.toasts.length = 0;
      STATIC_TOAST_STATE.listeners.length = 0;
      
      STATIC_APP_STATE.user = null;
      STATIC_APP_STATE.isAuthenticated = false;
      STATIC_APP_STATE.notifications.length = 0;
      STATIC_APP_STATE.preferences = {};
      STATIC_APP_STATE.listeners.length = 0;
      
      console.log('Complete cleanup performed');
    } catch (error) {
      console.warn('Complete cleanup failed:', error);
    }
  }

  // Get memory statistics
  static getMemoryStats() {
    return {
      ...memoryStats,
      toastCount: STATIC_TOAST_STATE.toasts.length,
      toastListenerCount: STATIC_TOAST_STATE.listeners.length,
      notificationCount: STATIC_APP_STATE.notifications.length,
      appListenerCount: STATIC_APP_STATE.listeners.length,
      preferenceCount: Object.keys(STATIC_APP_STATE.preferences).length,
    };
  }

  // Manual cleanup trigger
  static triggerCleanup() {
    this.performCleanup();
  }

  // Manual force cleanup trigger
  static triggerForceCleanup() {
    this.performForceCleanup();
  }

  // Stop memory management
  static stop() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    if (this.forceCleanupTimer) {
      clearInterval(this.forceCleanupTimer);
      this.forceCleanupTimer = null;
    }
  }
}

// Auto-initialize memory management
if (typeof window !== 'undefined') {
  MemoryManager.initialize();
}

export default MemoryManager;