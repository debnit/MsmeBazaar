// State management utilities with null safety and proper initialization

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

// State manager class with null safety
export class StateManager {
  private static instance: StateManager;
  private state: AppState;
  private listeners: Array<(state: AppState) => void> = [];

  private constructor() {
    this.state = this.loadInitialState();
  }

  static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  private loadInitialState(): AppState {
    try {
      // Load from localStorage with fallback to defaults
      const savedState = safeLocalStorage('appState', defaultState);
      
      // Validate and merge with defaults
      return {
        user: safeGet(savedState, 'user', null),
        isAuthenticated: safeGet(savedState, 'isAuthenticated', false),
        notifications: safeArray(safeGet(savedState, 'notifications', [])),
        preferences: safeGet(savedState, 'preferences', {}),
        theme: safeGet(savedState, 'theme', 'light'),
        language: safeGet(savedState, 'language', 'en')
      };
    } catch (error) {
      console.warn('Failed to load initial state:', error);
      return { ...defaultState };
    }
  }

  private saveState(): void {
    try {
      safeLocalStorageSet('appState', this.state);
    } catch (error) {
      console.warn('Failed to save state:', error);
    }
  }

  private notifyListeners(): void {
    const currentListeners = safeArray(this.listeners);
    currentListeners.forEach(listener => {
      safeCall(listener, undefined, this.state);
    });
  }

  public getState(): AppState {
    return { ...this.state };
  }

  public setState(updates: Partial<AppState>): void {
    try {
      if (!updates || typeof updates !== 'object') {
        return;
      }

      this.state = {
        ...this.state,
        ...updates
      };

      this.saveState();
      this.notifyListeners();
    } catch (error) {
      console.warn('Failed to set state:', error);
    }
  }

  public subscribe(listener: (state: AppState) => void): () => void {
    try {
      if (typeof listener !== 'function') {
        return () => {};
      }

      this.listeners.push(listener);

      return () => {
        const index = this.listeners.indexOf(listener);
        if (index > -1) {
          this.listeners.splice(index, 1);
        }
      };
    } catch (error) {
      console.warn('Failed to subscribe to state:', error);
      return () => {};
    }
  }

  public reset(): void {
    try {
      this.state = { ...defaultState };
      this.saveState();
      this.notifyListeners();
    } catch (error) {
      console.warn('Failed to reset state:', error);
    }
  }

  // Helper methods for common operations
  public setUser(user: any): void {
    this.setState({
      user,
      isAuthenticated: !!user
    });
  }

  public clearUser(): void {
    this.setState({
      user: null,
      isAuthenticated: false
    });
  }

  public addNotification(notification: any): void {
    if (!notification) return;

    const currentNotifications = safeArray(this.state.notifications);
    this.setState({
      notifications: [...currentNotifications, notification]
    });
  }

  public removeNotification(notificationId: string): void {
    if (!notificationId) return;

    const currentNotifications = safeArray(this.state.notifications);
    this.setState({
      notifications: currentNotifications.filter(n => n && n.id !== notificationId)
    });
  }

  public setPreference(key: string, value: any): void {
    if (!key) return;

    this.setState({
      preferences: {
        ...this.state.preferences,
        [key]: value
      }
    });
  }

  public getPreference(key: string, defaultValue: any = null): any {
    return safeGet(this.state.preferences, key, defaultValue);
  }
}

// Export singleton instance
export const stateManager = StateManager.getInstance();

// React hook for using state manager
export function useAppState(): [AppState, (updates: Partial<AppState>) => void] {
  const [state, setState] = React.useState<AppState>(() => stateManager.getState());

  React.useEffect(() => {
    const unsubscribe = stateManager.subscribe((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, []);

  const updateState = React.useCallback((updates: Partial<AppState>) => {
    stateManager.setState(updates);
  }, []);

  return [state, updateState];
}

// Export for backwards compatibility
export default stateManager;