import { useState, useCallback } from 'react';

export type ToastVariant = 'default' | 'destructive' | 'success' | 'warning' | 'info';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  action?: any;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
}

const initialState: ToastState = {
  toasts: [],
};

let state = initialState;
const listeners: Array<(state: ToastState) => void> = [];

function dispatch(action: any) {
  state = reducer(state, action);
  listeners.forEach((listener) => listener(state));
}

function reducer(state: ToastState, action: any): ToastState {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [...state.toasts, action.toast],
      };
    case 'UPDATE_TOAST':
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };
    case 'DISMISS_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
    default:
      return state;
  }
}

export function useToast() {
  const [state, setState] = useState(initialState);

  const toast = useCallback(({ ...props }: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const toastObj: Toast = {
      id,
      ...props,
    };

    dispatch({
      type: 'ADD_TOAST',
      toast: toastObj,
    });

    return {
      id,
      dismiss: () => dismiss(id),
      update: (props: Partial<Toast>) => update(id, props),
    };
  }, []);

  const dismiss = useCallback((toastId: string) => {
    dispatch({
      type: 'DISMISS_TOAST',
      toastId,
    });

    setTimeout(() => {
      dispatch({
        type: 'REMOVE_TOAST',
        toastId,
      });
    }, 100);
  }, []);

  const update = useCallback((toastId: string, toast: Partial<Toast>) => {
    dispatch({
      type: 'UPDATE_TOAST',
      toast: { id: toastId, ...toast },
    });
  }, []);

  return {
    toast,
    dismiss,
    toasts: state.toasts,
  };
}