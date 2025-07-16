import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
  ReactElement
} from "react";

export type ToastActionElement = ReactElement;

export type ToastProps = {
  id: string;
  title?: ReactNode;
  description?: ReactNode;
  action?: ToastActionElement;
  variant?: "default" | "destructive" | "success" | "warning";
};

const useToast = () => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  useEffect(() => {
    // Simulated toast manager subscription
    const id = setTimeout(() => {
      setToasts([
        {
          id: "123",
          title: "Test Toast",
          description: "This is a test.",
          variant: "success",
        },
      ]);
    }, 1000);

    return () => clearTimeout(id);
  }, []);

  return {
    toasts,
    toast: () => {},
    dismiss: () => {},
  };
};

export { useToast };
