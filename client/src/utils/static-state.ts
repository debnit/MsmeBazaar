// Static state management to prevent null exceptions

interface StaticToastState {
  toasts: Array<{
    id: string;
    title?: string;
    description?: string;
    variant?: 'default' | 'destructive';
    action?: any;
  }>;
}

interface StaticAppState {
  user: any | null;
  isAuthenticated: boolean;
  notifications: any[];
  preferences: Record<string, any>;
  theme: 'light' | 'dark';
  language: 'en' | 'hi' | 'or';
}

// Static state containers
class StaticStateManager {
  private static instance: StaticStateManager;

  // Static state objects - never null
  public static toastState: StaticToastState = { toasts: [] };
  public static appState: StaticAppState = {
    user: null,
    isAuthenticated: false,
    notifications: [],
    preferences: {},
    theme: 'light',
    language: 'en',
  };

  // Static listeners
  private static toastListeners: Array<(state: StaticToastState) => void> = [];
  private static appListeners: Array<(state: StaticAppState) => void> = [];

  private constructor() {}

  public static getInstance(): StaticStateManager {
    if (!StaticStateManager.instance) {
      StaticStateManager.instance = new StaticStateManager();
    }
    return StaticStateManager.instance;
  }

  // Static methods for toast management
  public static initializeToastState(): StaticToastState {
    StaticStateManager.toastState = { toasts: [] };
    return StaticStateManager.toastState;
  }

  public static getToastState(): StaticToastState {
    if (!StaticStateManager.toastState) {
      StaticStateManager.toastState = { toasts: [] };
    }
    return StaticStateManager.toastState;
  }

  public static setToastState(newState: StaticToastState): void {
    if (!newState || typeof newState !== 'object') {
      return;
    }

    StaticStateManager.toastState = {
      toasts: Array.isArray(newState.toasts) ? newState.toasts : [],
    };

    // Notify listeners
    StaticStateManager.toastListeners.forEach(listener => {
      try {
        listener(StaticStateManager.toastState);
      } catch (error) {
        console.warn('Toast listener error:', error);
      }
    });
  }

  public static addToastListener(listener: (state: StaticToastState) => void): () => void {
    if (typeof listener !== 'function') {
      return () => {};
    }

    StaticStateManager.toastListeners.push(listener);

    return () => {
      const index = StaticStateManager.toastListeners.indexOf(listener);
      if (index > -1) {
        StaticStateManager.toastListeners.splice(index, 1);
      }
    };
  }

  public static addToast(toast: {
    id: string;
    title?: string;
    description?: string;
    variant?: 'default' | 'destructive';
    action?: any;
  }): void {
    if (!toast || !toast.id) {
      return;
    }

    const currentState = StaticStateManager.getToastState();
    const newToasts = [...currentState.toasts, toast];

    StaticStateManager.setToastState({ toasts: newToasts });
  }

  public static removeToast(toastId: string): void {
    if (!toastId) {
      return;
    }

    const currentState = StaticStateManager.getToastState();
    const newToasts = currentState.toasts.filter(toast => toast.id !== toastId);

    StaticStateManager.setToastState({ toasts: newToasts });
  }

  public static clearAllToasts(): void {
    StaticStateManager.setToastState({ toasts: [] });
  }

  // Static methods for app state management
  public static initializeAppState(): StaticAppState {
    StaticStateManager.appState = {
      user: null,
      isAuthenticated: false,
      notifications: [],
      preferences: {},
      theme: 'light',
      language: 'en',
    };
    return StaticStateManager.appState;
  }

  public static getAppState(): StaticAppState {
    if (!StaticStateManager.appState) {
      StaticStateManager.appState = {
        user: null,
        isAuthenticated: false,
        notifications: [],
        preferences: {},
        theme: 'light',
        language: 'en',
      };
    }
    return StaticStateManager.appState;
  }

  public static setAppState(updates: Partial<StaticAppState>): void {
    if (!updates || typeof updates !== 'object') {
      return;
    }

    const currentState = StaticStateManager.getAppState();
    StaticStateManager.appState = {
      ...currentState,
      ...updates,
    };

    // Notify listeners
    StaticStateManager.appListeners.forEach(listener => {
      try {
        listener(StaticStateManager.appState);
      } catch (error) {
        console.warn('App listener error:', error);
      }
    });
  }

  public static addAppListener(listener: (state: StaticAppState) => void): () => void {
    if (typeof listener !== 'function') {
      return () => {};
    }

    StaticStateManager.appListeners.push(listener);

    return () => {
      const index = StaticStateManager.appListeners.indexOf(listener);
      if (index > -1) {
        StaticStateManager.appListeners.splice(index, 1);
      }
    };
  }

  // Utility methods
  public static resetAllState(): void {
    StaticStateManager.initializeToastState();
    StaticStateManager.initializeAppState();
  }

  public static getStateSnapshot(): {
    toast: StaticToastState;
    app: StaticAppState;
    } {
    return {
      toast: StaticStateManager.getToastState(),
      app: StaticStateManager.getAppState(),
    };
  }
}

// Static utility functions
export const StaticState = {
  // Toast methods
  initializeToast: () => StaticStateManager.initializeToastState(),
  getToastState: () => StaticStateManager.getToastState(),
  setToastState: (state: StaticToastState) => StaticStateManager.setToastState(state),
  addToastListener: (listener: (state: StaticToastState) => void) => StaticStateManager.addToastListener(listener),
  addToast: (toast: any) => StaticStateManager.addToast(toast),
  removeToast: (id: string) => StaticStateManager.removeToast(id),
  clearToasts: () => StaticStateManager.clearAllToasts(),

  // App methods
  initializeApp: () => StaticStateManager.initializeAppState(),
  getAppState: () => StaticStateManager.getAppState(),
  setAppState: (updates: Partial<StaticAppState>) => StaticStateManager.setAppState(updates),
  addAppListener: (listener: (state: StaticAppState) => void) => StaticStateManager.addAppListener(listener),

  // Global methods
  reset: () => StaticStateManager.resetAllState(),
  snapshot: () => StaticStateManager.getStateSnapshot(),

  // Safe access methods
  safeGetToasts: () => {
    try {
      const state = StaticStateManager.getToastState();
      return Array.isArray(state.toasts) ? state.toasts : [];
    } catch (error) {
      console.warn('Safe get toasts failed:', error);
      return [];
    }
  },

  safeGetUser: () => {
    try {
      const state = StaticStateManager.getAppState();
      return state.user;
    } catch (error) {
      console.warn('Safe get user failed:', error);
      return null;
    }
  },

  safeGetAuth: () => {
    try {
      const state = StaticStateManager.getAppState();
      return state.isAuthenticated;
    } catch (error) {
      console.warn('Safe get auth failed:', error);
      return false;
    }
  },
};

// Initialize static state immediately
StaticStateManager.initializeToastState();
StaticStateManager.initializeAppState();

export default StaticState;
