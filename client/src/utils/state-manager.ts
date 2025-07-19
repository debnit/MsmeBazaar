// State management utilities with null safety and proper initialization

import React from 'react';
import { safeGet, safeCall, safeArray, safeLocalStorage, safeLocalStorageSet } from './null-safe';

export interface AppState {
  user: any | null;
  isAuthenticated: boolean;
  notifications: any[];
  preferences: Record<string, any>;
  theme: 'light' | 'dark';
  language: 'en' | 'hi' | 'or';
}

// Initialize default state
const defaultState: AppState = {
  user: null,
  isAuthenticated: false,
  notifications: [],
  preferences: {},
  theme: 'light',
  language: 'en'
};

// State manager class with null safety and memory management
export class StateManager {
  private static instance: StateManager;
  private state: AppState;
  private listeners: Array<(state: AppState) => void> = [];
  private cleanupTasks: Array<() => void> = [];
  private debounceTimeout: NodeJS.Timeout | null = null;
  private isDestroyed: boolean = false;

  private constructor() {
    this.state = this.loadInitialState();
    this.setupCleanup();
  }

  static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  // Add cleanup mechanisms
  private setupCleanup(): void {
    // Cleanup on page unload
    if (typeof window !== 'undefined') {
      const handleBeforeUnload = () => {
        this.destroy();
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      this.cleanupTasks.push(() => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      });

      // Cleanup on visibility change (when tab becomes hidden)
      const handleVisibilityChange = () => {
        if (document.hidden) {
          this.saveState();
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      this.cleanupTasks.push(() => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      });
    }
  }

  private loadInitialState(): AppState {
    try {
      // Load from localStorage with fallback to defaults
      const savedState = safeLocalStorage('appState', defaultState);
      
      // Validate and merge with defaults to ensure all required properties exist
      return {
        user: safeGet(savedState, 'user', null),
        isAuthenticated: safeGet(savedState, 'isAuthenticated', false),
        notifications: safeArray(safeGet(savedState, 'notifications', [])),
        preferences: safeGet(savedState, 'preferences', {}),
        theme: safeGet(savedState, 'theme', 'light') as 'light' | 'dark',
        language: safeGet(savedState, 'language', 'en') as 'en' | 'hi' | 'or'
      };
    } catch (error) {
      console.warn('Failed to load initial state, using defaults:', error);
      return { ...defaultState };
    }
  }

  // Debounced state saving to prevent excessive localStorage writes
  private saveState(): void {
    if (this.isDestroyed) return;
    
    try {
      // Clear existing timeout
      if (this.debounceTimeout) {
        clearTimeout(this.debounceTimeout);
      }
      
      // Debounce state saving
      this.debounceTimeout = setTimeout(() => {
        if (!this.isDestroyed) {
          safeLocalStorageSet('appState', this.state);
        }
      }, 300);
    } catch (error) {
      console.warn('Failed to save state:', error);
    }
  }

  // Subscribe to state changes with automatic cleanup
  subscribe(listener: (state: AppState) => void): () => void {
    if (this.isDestroyed) {
      console.warn('Cannot subscribe to destroyed StateManager');
      return () => {};
    }

    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.unsubscribe(listener);
    };
  }

  // Unsubscribe from state changes
  unsubscribe(listener: (state: AppState) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  // Notify all listeners with error handling
  private notifyListeners(): void {
    if (this.isDestroyed) return;

    // Create a copy of listeners to prevent issues if listeners array is modified during iteration
    const currentListeners = [...this.listeners];
    
    currentListeners.forEach(listener => {
      try {
        safeCall(listener, this.state);
      } catch (error) {
        console.error('Error in state listener:', error);
        // Remove faulty listener
        this.unsubscribe(listener);
      }
    });
  }

  // Get current state (immutable copy)
  getState(): AppState {
    if (this.isDestroyed) {
      console.warn('StateManager is destroyed, returning default state');
      return { ...defaultState };
    }
    return { ...this.state };
  }

  // Update state with partial updates
  setState(partialState: Partial<AppState>): void {
    if (this.isDestroyed) {
      console.warn('Cannot update destroyed StateManager');
      return;
    }

    try {
      // Merge with existing state
      this.state = {
        ...this.state,
        ...partialState
      };

      // Save to localStorage
      this.saveState();
      
      // Notify listeners
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to update state:', error);
    }
  }

  // User-specific methods
  setUser(user: any): void {
    this.setState({
      user,
      isAuthenticated: !!user
    });
  }

  clearUser(): void {
    this.setState({
      user: null,
      isAuthenticated: false
    });
  }

  // Notification methods with size limit to prevent memory bloat
  addNotification(notification: any): void {
    const notifications = [...this.state.notifications, notification];
    
    // Limit notifications to prevent memory issues
    const maxNotifications = 50;
    if (notifications.length > maxNotifications) {
      notifications.splice(0, notifications.length - maxNotifications);
    }
    
    this.setState({ notifications });
  }

  removeNotification(notificationId: string): void {
    const notifications = this.state.notifications.filter(
      n => safeGet(n, 'id', '') !== notificationId
    );
    this.setState({ notifications });
  }

  clearNotifications(): void {
    this.setState({ notifications: [] });
  }

  // Preferences methods
  setPreference(key: string, value: any): void {
    this.setState({
      preferences: {
        ...this.state.preferences,
        [key]: value
      }
    });
  }

  getPreference(key: string, defaultValue?: any): any {
    return safeGet(this.state.preferences, key, defaultValue);
  }

  // Theme methods
  setTheme(theme: 'light' | 'dark'): void {
    this.setState({ theme });
  }

  // Language methods
  setLanguage(language: 'en' | 'hi' | 'or'): void {
    this.setState({ language });
  }

  // Reset state to defaults
  reset(): void {
    if (this.isDestroyed) return;
    
    this.state = { ...defaultState };
    this.saveState();
    this.notifyListeners();
  }

  // Get memory usage information
  getMemoryInfo(): { 
    listenersCount: number;
    stateSize: number;
    notificationsCount: number;
  } {
    return {
      listenersCount: this.listeners.length,
      stateSize: JSON.stringify(this.state).length,
      notificationsCount: this.state.notifications.length
    };
  }

  // Clean up resources
  destroy(): void {
    if (this.isDestroyed) return;

    // Mark as destroyed
    this.isDestroyed = true;

    // Clear debounce timeout
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }

    // Save final state
    try {
      safeLocalStorageSet('appState', this.state);
    } catch (error) {
      console.warn('Failed to save final state:', error);
    }

    // Clear listeners
    this.listeners.length = 0;

    // Run cleanup tasks
    this.cleanupTasks.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.warn('Error during cleanup:', error);
      }
    });
    this.cleanupTasks.length = 0;

    // Clear instance reference
    StateManager.instance = null as any;
  }
}

// React hook for using state manager
export function useStateManager(): {
  state: AppState;
  setState: (partialState: Partial<AppState>) => void;
  setUser: (user: any) => void;
  clearUser: () => void;
  addNotification: (notification: any) => void;
  removeNotification: (id: string) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (language: 'en' | 'hi' | 'or') => void;
  reset: () => void;
} {
  const [state, setReactState] = React.useState<AppState>(() => 
    StateManager.getInstance().getState()
  );

  React.useEffect(() => {
    const stateManager = StateManager.getInstance();
    
    // Subscribe to state changes
    const unsubscribe = stateManager.subscribe((newState) => {
      setReactState(newState);
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  // Get current state manager instance
  const stateManager = StateManager.getInstance();

  return {
    state,
    setState: stateManager.setState.bind(stateManager),
    setUser: stateManager.setUser.bind(stateManager),
    clearUser: stateManager.clearUser.bind(stateManager),
    addNotification: stateManager.addNotification.bind(stateManager),
    removeNotification: stateManager.removeNotification.bind(stateManager),
    setTheme: stateManager.setTheme.bind(stateManager),
    setLanguage: stateManager.setLanguage.bind(stateManager),
    reset: stateManager.reset.bind(stateManager)
  };
}

// Export singleton instance for direct access (use sparingly)
export const stateManager = StateManager.getInstance();

// Utility function to monitor memory usage in development
if (process.env.NODE_ENV === 'development') {
  (window as any).stateManagerDebug = {
    getMemoryInfo: () => stateManager.getMemoryInfo(),
    getState: () => stateManager.getState(),
    destroy: () => stateManager.destroy(),
    listenersCount: () => (stateManager as any).listeners.length
  };
}