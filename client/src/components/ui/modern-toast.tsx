import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Modern toast system without deprecated components
const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-4 pr-8 shadow-lg transition-all',
  {
    variants: {
      variant: {
        default: 'border bg-background text-foreground',
        destructive: 'border-destructive bg-destructive text-destructive-foreground',
        success: 'border-green-500 bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-200',
        warning: 'border-yellow-500 bg-yellow-50 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface ToastProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof toastVariants> {
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  onClose?: () => void
}

export const ModernToast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant, title, description, action, onClose, ...props }, ref) => {
    const [isVisible, setIsVisible] = React.useState(true);

    const handleClose = () => {
      setIsVisible(false);
      setTimeout(() => {
        onClose?.();
      }, 150); // Allow animation to complete
    };

    if (!isVisible) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn(
          toastVariants({ variant }),
          'animate-in slide-in-from-top-full duration-300',
          className,
        )}
        role="alert"
        aria-live="polite"
        {...props}
      >
        <div className="flex-1 space-y-1">
          {title && (
            <div className="text-sm font-semibold">
              {title}
            </div>
          )}
          {description && (
            <div className="text-sm opacity-90">
              {description}
            </div>
          )}
        </div>

        {action && (
          <div className="flex-shrink-0">
            {action}
          </div>
        )}

        <button
          onClick={handleClose}
          className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  },
);

ModernToast.displayName = 'ModernToast';

export interface ToastContainerProps {
  children: React.ReactNode
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
}

export const ToastContainer = React.forwardRef<HTMLDivElement, ToastContainerProps>(
  ({ children, position = 'top-right', ...props }, ref) => {
    const positionClasses = {
      'top-right': 'fixed top-4 right-4 z-50',
      'top-left': 'fixed top-4 left-4 z-50',
      'bottom-right': 'fixed bottom-4 right-4 z-50',
      'bottom-left': 'fixed bottom-4 left-4 z-50',
      'top-center': 'fixed top-4 left-1/2 -translate-x-1/2 z-50',
      'bottom-center': 'fixed bottom-4 left-1/2 -translate-x-1/2 z-50',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col gap-2 w-full max-w-sm',
          positionClasses[position],
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

ToastContainer.displayName = 'ToastContainer';

export type { VariantProps };
