import React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

import { safeCall, safeExecute, safeArray } from "@/utils/null-safe"

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

// Ensure memory state is properly initialized
memoryState = validateState(memoryState);

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
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(() => {
    // Always initialize with a clean state
    const initialState = validateState(memoryState);
    return initialState;
  })

  React.useEffect(() => {
    const listener = (newState: State) => {
      if (newState && setState) {
        // Validate incoming state before setting
        const validatedState = validateState(newState);
        safeCall(setState, undefined, validatedState);
      }
    }
    
    if (listeners && Array.isArray(listeners)) {
      listeners.push(listener);
    }
    
    return () => {
      if (listeners && Array.isArray(listeners)) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    }
  }, [])

  // Ensure current state is always valid
  const currentState = validateState(state);

  return {
    ...currentState,
    toast,
    dismiss: (toastId?: string) => safeCall(dispatch, undefined, { type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }
