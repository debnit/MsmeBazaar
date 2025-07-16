// Static variables for state management to prevent null exceptions

// Static toast state - never null, always initialized
export const STATIC_TOAST_STATE = {
  toasts: [] as Array<{
    id: string;
    title?: string;
    description?: string;
    variant?: 'default' | 'destructive';
    action?: any;
  }>,
  listeners: [] as Array<(toasts: any[]) => void>
};

// Static app state - never null, always initialized  
export const STATIC_APP_STATE = {
  user: null as any,
  isAuthenticated: false,
  notifications: [] as any[],
  preferences: {} as Record<string, any>,
  theme: 'light' as 'light' | 'dark',
  language: 'en' as 'en' | 'hi' | 'or',
  listeners: [] as Array<(state: any) => void>
};

// Static utility functions
export const StaticUtils = {
  // Toast functions
  addToast: (toast: { id: string; title?: string; description?: string; variant?: string; action?: any }) => {
    if (!toast || !toast.id) return;
    
    // Add to static array
    STATIC_TOAST_STATE.toasts.push(toast);
    
    // Notify listeners
    STATIC_TOAST_STATE.listeners.forEach(listener => {
      try {
        listener(STATIC_TOAST_STATE.toasts);
      } catch (error) {
        console.warn('Toast listener error:', error);
      }
    });
  },
  
  removeToast: (id: string) => {
    if (!id) return;
    
    // Remove from static array
    const index = STATIC_TOAST_STATE.toasts.findIndex(toast => toast.id === id);
    if (index > -1) {
      STATIC_TOAST_STATE.toasts.splice(index, 1);
    }
    
    // Notify listeners
    STATIC_TOAST_STATE.listeners.forEach(listener => {
      try {
        listener(STATIC_TOAST_STATE.toasts);
      } catch (error) {
        console.warn('Toast listener error:', error);
      }
    });
  },
  
  clearToasts: () => {
    STATIC_TOAST_STATE.toasts.length = 0;
    
    // Notify listeners
    STATIC_TOAST_STATE.listeners.forEach(listener => {
      try {
        listener(STATIC_TOAST_STATE.toasts);
      } catch (error) {
        console.warn('Toast listener error:', error);
      }
    });
  },
  
  addToastListener: (listener: (toasts: any[]) => void) => {
    if (typeof listener !== 'function') return () => {};
    
    STATIC_TOAST_STATE.listeners.push(listener);
    
    return () => {
      const index = STATIC_TOAST_STATE.listeners.indexOf(listener);
      if (index > -1) {
        STATIC_TOAST_STATE.listeners.splice(index, 1);
      }
    };
  },
  
  getToasts: () => {
    return [...STATIC_TOAST_STATE.toasts];
  },
  
  // App state functions
  setUser: (user: any) => {
    STATIC_APP_STATE.user = user;
    STATIC_APP_STATE.isAuthenticated = !!user;
    
    // Notify listeners
    STATIC_APP_STATE.listeners.forEach(listener => {
      try {
        listener(STATIC_APP_STATE);
      } catch (error) {
        console.warn('App listener error:', error);
      }
    });
  },
  
  clearUser: () => {
    STATIC_APP_STATE.user = null;
    STATIC_APP_STATE.isAuthenticated = false;
    
    // Notify listeners
    STATIC_APP_STATE.listeners.forEach(listener => {
      try {
        listener(STATIC_APP_STATE);
      } catch (error) {
        console.warn('App listener error:', error);
      }
    });
  },
  
  setTheme: (theme: 'light' | 'dark') => {
    STATIC_APP_STATE.theme = theme;
    
    // Notify listeners
    STATIC_APP_STATE.listeners.forEach(listener => {
      try {
        listener(STATIC_APP_STATE);
      } catch (error) {
        console.warn('App listener error:', error);
      }
    });
  },
  
  setLanguage: (language: 'en' | 'hi' | 'or') => {
    STATIC_APP_STATE.language = language;
    
    // Notify listeners
    STATIC_APP_STATE.listeners.forEach(listener => {
      try {
        listener(STATIC_APP_STATE);
      } catch (error) {
        console.warn('App listener error:', error);
      }
    });
  },
  
  addNotification: (notification: any) => {
    if (!notification) return;
    
    STATIC_APP_STATE.notifications.push(notification);
    
    // Notify listeners
    STATIC_APP_STATE.listeners.forEach(listener => {
      try {
        listener(STATIC_APP_STATE);
      } catch (error) {
        console.warn('App listener error:', error);
      }
    });
  },
  
  removeNotification: (id: string) => {
    if (!id) return;
    
    const index = STATIC_APP_STATE.notifications.findIndex(n => n && n.id === id);
    if (index > -1) {
      STATIC_APP_STATE.notifications.splice(index, 1);
    }
    
    // Notify listeners
    STATIC_APP_STATE.listeners.forEach(listener => {
      try {
        listener(STATIC_APP_STATE);
      } catch (error) {
        console.warn('App listener error:', error);
      }
    });
  },
  
  addAppListener: (listener: (state: any) => void) => {
    if (typeof listener !== 'function') return () => {};
    
    STATIC_APP_STATE.listeners.push(listener);
    
    return () => {
      const index = STATIC_APP_STATE.listeners.indexOf(listener);
      if (index > -1) {
        STATIC_APP_STATE.listeners.splice(index, 1);
      }
    };
  },
  
  getAppState: () => {
    return { ...STATIC_APP_STATE };
  },
  
  // Utility functions
  resetAll: () => {
    // Clear toast state
    STATIC_TOAST_STATE.toasts.length = 0;
    STATIC_TOAST_STATE.listeners.length = 0;
    
    // Clear app state
    STATIC_APP_STATE.user = null;
    STATIC_APP_STATE.isAuthenticated = false;
    STATIC_APP_STATE.notifications.length = 0;
    STATIC_APP_STATE.preferences = {};
    STATIC_APP_STATE.theme = 'light';
    STATIC_APP_STATE.language = 'en';
    STATIC_APP_STATE.listeners.length = 0;
  },
  
  // Safe access functions
  safeGetToasts: () => {
    try {
      return Array.isArray(STATIC_TOAST_STATE.toasts) ? [...STATIC_TOAST_STATE.toasts] : [];
    } catch (error) {
      console.warn('Safe get toasts failed:', error);
      return [];
    }
  },
  
  safeGetUser: () => {
    try {
      return STATIC_APP_STATE.user;
    } catch (error) {
      console.warn('Safe get user failed:', error);
      return null;
    }
  },
  
  safeGetAuth: () => {
    try {
      return STATIC_APP_STATE.isAuthenticated;
    } catch (error) {
      console.warn('Safe get auth failed:', error);
      return false;
    }
  },
  
  safeGetTheme: () => {
    try {
      return STATIC_APP_STATE.theme;
    } catch (error) {
      console.warn('Safe get theme failed:', error);
      return 'light';
    }
  },
  
  safeGetLanguage: () => {
    try {
      return STATIC_APP_STATE.language;
    } catch (error) {
      console.warn('Safe get language failed:', error);
      return 'en';
    }
  }
};

// Initialize static variables immediately
console.log('Static variables initialized');

export default StaticUtils;