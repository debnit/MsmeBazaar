import * as React from "react"

// Modern toast types without deprecated components
export type ToastActionElement = React.ReactElement

export type ToastProps = {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
  variant?: 'default' | 'destructive' | 'success' | 'warning'
}

import { safeToastManager } from "@/utils/safe-runtime"
import { functionTracer, traceFunction } from "@/utils/function-tracer"

const TOAST_REMOVE_DELAY = 3000 // 3 seconds

type ToasterToast = ToastProps

// Global toast function for use outside of React components
const toast = traceFunction((props: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  variant?: 'default' | 'destructive' | 'success' | 'warning';
}) => {
  try {
    const id = Math.random().toString(36).slice(2, 9);
    
    safeToastManager.addToast({
      id,
      title: props.title,
      description: props.description,
      action: props.action,
      variant: props.variant || 'default'
    });
    
    // Auto-dismiss after delay
    setTimeout(() => {
      safeToastManager.removeToast(id);
    }, TOAST_REMOVE_DELAY);
    
    const update = (updatedProps: ToasterToast) => {
      try {
        safeToastManager.removeToast(id);
        safeToastManager.addToast({
          ...updatedProps,
          id
        });
      } catch (error) {
        console.warn('Toast update failed:', error);
      }
    };
    
    const dismiss = () => {
      try {
        safeToastManager.removeToast(id);
      } catch (error) {
        console.warn('Toast dismiss failed:', error);
      }
    };
    
    return {
      id,
      dismiss,
      update,
    };
  } catch (error) {
    console.warn('Toast creation failed:', error);
    return {
      id: '',
      dismiss: () => {},
      update: () => {},
    };
  }
}, 'toast');

// React hook for toast management
const useToast = traceFunction(() => {
  const [toasts, setToasts] = React.useState(() => safeToastManager.getToasts());

  React.useEffect(() => {
    const traceId = functionTracer.startTrace('useToast.subscribe');
    
    // Subscribe to safe toast manager changes
    const unsubscribe = safeToastManager.subscribe((newToasts) => {
      try {
        if (Array.isArray(newToasts)) {
          setToasts([...newToasts]);
        }
      } catch (error) {
        console.warn('Safe toast listener failed:', error);
        setToasts([]);
      }
    });
    
    functionTracer.endTrace(traceId);
    
    return () => {
      const cleanupTraceId = functionTracer.startTrace('useToast.cleanup');
      unsubscribe();
      functionTracer.endTrace(cleanupTraceId);
    };
  }, []);

  // Toast function for use within React components
  const reactToast = React.useCallback((props: {
    title?: React.ReactNode;
    description?: React.ReactNode;
    action?: ToastActionElement;
    variant?: 'default' | 'destructive' | 'success' | 'warning';
  }) => {
    const traceId = functionTracer.startTrace('useToast.reactToast', [props]);
    const result = toast(props);
    functionTracer.endTrace(traceId, result);
    return result;
  }, []);

  // Dismiss function
  const dismiss = React.useCallback((toastId?: string) => {
    const traceId = functionTracer.startTrace('useToast.dismiss', [toastId]);
    
    try {
      if (toastId) {
        safeToastManager.removeToast(toastId);
      } else {
        safeToastManager.clearToasts();
      }
      functionTracer.endTrace(traceId);
    } catch (error) {
      console.warn('Safe dismiss failed:', error);
      functionTracer.endTrace(traceId, undefined, error as Error);
    }
  }, []);

  return React.useMemo(() => ({
    toasts,
    toast: reactToast,
    dismiss,
  }), [toasts, reactToast, dismiss]);
}, 'useToast');

export { useToast, toast }