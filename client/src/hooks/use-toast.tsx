import { useState, useEffect, ReactNode, ReactElement } from 'react';

export type ToastActionElement = ReactElement;

export type ToastProps = {
  id: string;
  title?: ReactNode;
  description?: ReactNode;
  action?: ToastActionElement;
  variant?: 'default' | 'destructive' | 'success' | 'warning';
};

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  useEffect(() => {
    setTimeout(() => {
      setToasts([
        {
          id: 'abc123',
          title: 'Welcome',
          description: 'Toast test',
          variant: 'success',
        },
      ]);
    }, 1000);
  }, []);

  return { toasts };
}
try {
  const [toasts, setToasts] = useState<ToastProps[]>([]);
} catch (err) {
  console.error('useState crashed', err);
}
