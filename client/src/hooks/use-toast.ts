import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

import { safeCall, safeExecute, safeArray } from "@/utils/null-safe"
import { safeToastManager } from "@/utils/safe-runtime"
import { resourceManager } from "@/utils/resource-manager"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  try {
    if (!state || !action) {
      return { toasts: [] };
    }

    const currentToasts = safeArray(state.toasts);

    switch (action.type) {
      case "ADD_TOAST":
        if (!action.toast) {
          return state;
        }
        return {
          ...state,
          toasts: [action.toast, ...currentToasts].slice(0, TOAST_LIMIT),
        }

      case "UPDATE_TOAST":
        if (!action.toast || !action.toast.id) {
          return state;
        }
        return {
          ...state,
          toasts: currentToasts.map((t) =>
            t && t.id === action.toast.id ? { ...t, ...action.toast } : t
          ).filter(Boolean),
        }

      case "DISMISS_TOAST": {
        const { toastId } = action

        // Handle side effects safely
        if (toastId) {
          safeCall(addToRemoveQueue, undefined, toastId);
        } else {
          currentToasts.forEach((toast) => {
            if (toast && toast.id) {
              safeCall(addToRemoveQueue, undefined, toast.id);
            }
          });
        }

        return {
          ...state,
          toasts: currentToasts.map((t) =>
            t && (t.id === toastId || toastId === undefined)
              ? {
                  ...t,
                  open: false,
                }
              : t
          ).filter(Boolean),
        }
      }
      case "REMOVE_TOAST":
        if (action.toastId === undefined) {
          return {
            ...state,
            toasts: [],
          }
        }
        return {
          ...state,
          toasts: currentToasts.filter((t) => t && t.id !== action.toastId),
        }
      default:
        return state;
    }
  } catch (error) {
    console.warn('Toast reducer error:', error);
    return state || { toasts: [] };
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

// Initialize state properly to prevent holding other values
function initializeState(): State {
  return { toasts: [] };
}

// Reset state if it contains invalid data
function validateState(state: State): State {
  if (!state || typeof state !== 'object') {
    return initializeState();
  }
  
  if (!Array.isArray(state.toasts)) {
    return initializeState();
  }
  
  // Filter out invalid toast entries
  const validToasts = state.toasts.filter(toast => 
    toast && 
    typeof toast === 'object' && 
    typeof toast.id === 'string' &&
    toast.id.length > 0
  );
  
  return { toasts: validToasts };
}

// Ensure memory state is properly initialized and reset if corrupted
try {
  memoryState = validateState(memoryState);
} catch (error) {
  console.warn('Memory state initialization failed, resetting:', error);
  memoryState = initializeState();
}

function dispatch(action: Action) {
  try {
    if (!action) {
      return;
    }
    
    // Validate current state before processing
    memoryState = validateState(memoryState);
    
    // Process the action
    const newState = reducer(memoryState, action);
    
    // Validate the new state
    memoryState = validateState(newState);
    
    const currentListeners = safeArray(listeners);
    
    currentListeners.forEach((listener) => {
      safeCall(listener, undefined, memoryState);
    });
  } catch (error) {
    console.warn('Toast dispatch error:', error);
    // Reset to clean state on error
    memoryState = initializeState();
  }
}

type Toast = Omit<ToasterToast, "id">

function toast({ ...props }: Toast) {
  try {
    const id = Math.random().toString(36).slice(2, 9);
    
    // Use safe runtime instead of static variables
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
        // Remove old toast and add updated one
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
}

function useToast() {
  // Use safe runtime system - simplified to avoid hook rule violations
  const [toasts, setToasts] = React.useState(() => safeToastManager.getToasts());

  React.useEffect(() => {
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
    
    return unsubscribe;
  }, []);

  // Safe toast functions using safe runtime
  const safeToast = React.useCallback((props: {
    title?: React.ReactNode;
    description?: React.ReactNode;
    action?: ToastActionElement;
    variant?: 'default' | 'destructive';
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
      
      return { id, dismiss: () => safeToastManager.removeToast(id) };
    } catch (error) {
      console.warn('Safe toast failed:', error);
      return { id: '', dismiss: () => {} };
    }
  }, []);

  const safeDismiss = React.useCallback((toastId?: string) => {
    try {
      if (toastId) {
        safeToastManager.removeToast(toastId);
      } else {
        safeToastManager.clearToasts();
      }
    } catch (error) {
      console.warn('Safe dismiss failed:', error);
    }
  }, []);

  // Return safe interface using safe runtime
  return React.useMemo(() => ({
    toasts,
    toast: safeToast,
    dismiss: safeDismiss,
  }), [toasts, safeToast, safeDismiss]);
}

export { useToast, toast }
