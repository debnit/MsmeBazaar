import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  type?: 'success' | 'error' | 'warning' | 'info' | 'loading';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  onDismiss?: () => void;
}

interface ToastContextType {
  toasts: Toast[];
  toast: (toast: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Toast component
const ToastComponent: React.FC<{ toast: Toast }> = ({ toast }) => {
  const { dismiss } = useToast();
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Animate in
    setTimeout(() => setIsVisible(true), 10);

    // Auto dismiss
    if (toast.duration && toast.duration > 0 && toast.type !== 'loading') {
      timeoutRef.current = setTimeout(() => {
        handleDismiss();
      }, toast.duration);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleDismiss = useCallback(() => {
    if (isLeaving) {return;}

    setIsLeaving(true);
    setIsVisible(false);

    setTimeout(() => {
      dismiss(toast.id);
      toast.onDismiss?.();
    }, 150);
  }, [toast.id, toast.onDismiss, dismiss, isLeaving]);

  const handleAction = useCallback(() => {
    toast.action?.onClick();
    handleDismiss();
  }, [toast.action, handleDismiss]);

  const getIcon = () => {
    switch (toast.type) {
    case 'success':
      return <CheckCircle2 className="h-5 w-5 text-success" />;
    case 'error':
      return <AlertCircle className="h-5 w-5 text-destructive" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-warning" />;
    case 'info':
      return <Info className="h-5 w-5 text-primary" />;
    case 'loading':
      return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
    default:
      return null;
    }
  };

  const getBackgroundColor = () => {
    switch (toast.type) {
    case 'success':
      return 'bg-success/10 border-success/20';
    case 'error':
      return 'bg-destructive/10 border-destructive/20';
    case 'warning':
      return 'bg-warning/10 border-warning/20';
    case 'info':
      return 'bg-primary/10 border-primary/20';
    case 'loading':
      return 'bg-muted border-border';
    default:
      return 'bg-background border-border';
    }
  };

  return (
    <div
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      className={cn(
        'group pointer-events-auto relative flex w-full max-w-md items-start space-x-4 overflow-hidden rounded-lg border p-4 shadow-lg transition-all',
        getBackgroundColor(),
        'animate-slide-up',
        isVisible && 'translate-y-0 opacity-100',
        !isVisible && 'translate-y-2 opacity-0',
        isLeaving && 'animate-slide-down',
      )}
    >
      {/* Icon */}
      <div className="flex-shrink-0">
        {getIcon()}
      </div>

      {/* Content */}
      <div className="flex-1 space-y-1">
        {toast.title && (
          <h3 className="text-sm font-semibold leading-none tracking-tight">
            {toast.title}
          </h3>
        )}
        {toast.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {toast.description}
          </p>
        )}

        {/* Action button */}
        {toast.action && (
          <button
            onClick={handleAction}
            className={cn(
              'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'h-8 px-3 mt-2',
              'bg-primary text-primary-foreground hover:bg-primary hover:opacity-90',
            )}
          >
            {toast.action.label}
          </button>
        )}
      </div>

      {/* Dismiss button */}
      {toast.dismissible !== false && (
        <button
          onClick={handleDismiss}
          className={cn(
            'absolute right-2 top-2 rounded-md p-1 text-muted-foreground/70 transition-colors',
            'hover:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'group-hover:opacity-100 opacity-70',
          )}
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

// Toast container
const ToastContainer: React.FC<{ toasts: Toast[] }> = ({ toasts }) => {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let toastContainer = document.getElementById('toast-container');

    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = cn(
        'fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]',
      );
      document.body.appendChild(toastContainer);
    }

    setContainer(toastContainer);

    return () => {
      if (toastContainer && toastContainer.children.length === 0) {
        document.body.removeChild(toastContainer);
      }
    };
  }, []);

  if (!container) {return null;}

  return createPortal(
    <div className="flex flex-col-reverse space-y-reverse space-y-2 sm:flex-col sm:space-y-2 sm:space-y-reverse-0">
      {toasts.map((toast) => (
        <ToastComponent key={toast.id} toast={toast} />
      ))}
    </div>,
    container,
  );
};

// Toast provider
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((toastData: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      id,
      duration: 5000,
      dismissible: true,
      ...toastData,
    };

    setToasts((prev) => [...prev, newToast]);
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const value = {
    toasts,
    toast,
    dismiss,
    dismissAll,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  );
};

// Convenience hooks for different toast types
export const useToastHelpers = () => {
  const { toast } = useToast();

  return {
    success: (title: string, description?: string) =>
      toast({ type: 'success', title, description }),

    error: (title: string, description?: string) =>
      toast({ type: 'error', title, description, duration: 8000 }),

    warning: (title: string, description?: string) =>
      toast({ type: 'warning', title, description }),

    info: (title: string, description?: string) =>
      toast({ type: 'info', title, description }),

    loading: (title: string, description?: string) =>
      toast({ type: 'loading', title, description, duration: 0, dismissible: false }),

    promise: async <T,>(
      promise: Promise<T>,
      {
        loading: loadingMessage = 'Loading...',
        success: successMessage = 'Success!',
        error: errorMessage = 'Something went wrong',
      }: {
        loading?: string;
        success?: string | ((data: T) => string);
        error?: string | ((error: any) => string);
      } = {},
    ) => {
      const loadingId = toast({
        type: 'loading',
        title: loadingMessage,
        duration: 0,
        dismissible: false,
      });

      try {
        const result = await promise;

        // Dismiss loading toast
        toast.dismiss?.(loadingId);

        // Show success toast
        const successMsg = typeof successMessage === 'function'
          ? successMessage(result)
          : successMessage;
        toast({ type: 'success', title: successMsg });

        return result;
      } catch (error) {
        // Dismiss loading toast
        toast.dismiss?.(loadingId);

        // Show error toast
        const errorMsg = typeof errorMessage === 'function'
          ? errorMessage(error)
          : errorMessage;
        toast({ type: 'error', title: errorMsg, duration: 8000 });

        throw error;
      }
    },
  };
};

// Global toast function (can be used outside React components)
let globalToastFn: ((toast: Omit<Toast, 'id'>) => string) | null = null;

export const setGlobalToast = (toastFn: (toast: Omit<Toast, 'id'>) => string) => {
  globalToastFn = toastFn;
};

export const globalToast = {
  success: (title: string, description?: string) => {
    if (!globalToastFn) {throw new Error('Toast provider not initialized');}
    return globalToastFn({ type: 'success', title, description });
  },

  error: (title: string, description?: string) => {
    if (!globalToastFn) {throw new Error('Toast provider not initialized');}
    return globalToastFn({ type: 'error', title, description, duration: 8000 });
  },

  warning: (title: string, description?: string) => {
    if (!globalToastFn) {throw new Error('Toast provider not initialized');}
    return globalToastFn({ type: 'warning', title, description });
  },

  info: (title: string, description?: string) => {
    if (!globalToastFn) {throw new Error('Toast provider not initialized');}
    return globalToastFn({ type: 'info', title, description });
  },

  loading: (title: string, description?: string) => {
    if (!globalToastFn) {throw new Error('Toast provider not initialized');}
    return globalToastFn({ type: 'loading', title, description, duration: 0, dismissible: false });
  },
};

// Hook to initialize global toast
export const useInitializeGlobalToast = () => {
  const { toast } = useToast();

  useEffect(() => {
    setGlobalToast(toast);
    return () => setGlobalToast(null as any);
  }, [toast]);
};
