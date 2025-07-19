import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, CheckCircle2, Info, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  preventScroll?: boolean;
  className?: string;
  overlayClassName?: string;
  contentClassName?: string;
  initialFocus?: React.RefObject<HTMLElement>;
  onAfterOpen?: () => void;
  onAfterClose?: () => void;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  variant = 'default',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  preventScroll = true,
  className,
  overlayClassName,
  contentClassName,
  initialFocus,
  onAfterOpen,
  onAfterClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Size classes
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-none w-full h-full',
  };

  // Variant classes
  const variantClasses = {
    default: 'border-border',
    destructive: 'border-destructive/20 bg-destructive/5',
    success: 'border-success/20 bg-success/5',
    warning: 'border-warning/20 bg-warning/5',
    info: 'border-primary/20 bg-primary/5',
  };

  // Get variant icon
  const getVariantIcon = () => {
    switch (variant) {
      case 'destructive':
        return <AlertTriangle className="h-6 w-6 text-destructive" />;
      case 'success':
        return <CheckCircle2 className="h-6 w-6 text-success" />;
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-warning" />;
      case 'info':
        return <Info className="h-6 w-6 text-primary" />;
      default:
        return null;
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEscape && isVisible) {
        onClose();
      }
    };

    if (isOpen && closeOnEscape) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, closeOnEscape, isVisible, onClose]);

  // Handle scroll prevention
  useEffect(() => {
    if (isOpen && preventScroll) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen, preventScroll]);

  // Handle focus management
  useEffect(() => {
    if (isOpen) {
      // Store previously focused element
      previousActiveElement.current = document.activeElement as HTMLElement;
      
      // Focus initial element or modal content
      setTimeout(() => {
        if (initialFocus?.current) {
          initialFocus.current.focus();
        } else if (contentRef.current) {
          // Find first focusable element
          const focusableElements = contentRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          const firstFocusable = focusableElements[0] as HTMLElement;
          if (firstFocusable) {
            firstFocusable.focus();
          } else {
            contentRef.current.focus();
          }
        }
      }, 100);

      onAfterOpen?.();
    } else {
      // Restore focus to previously focused element
      setTimeout(() => {
        if (previousActiveElement.current && document.contains(previousActiveElement.current)) {
          previousActiveElement.current.focus();
        }
      }, 100);

      onAfterClose?.();
    }
  }, [isOpen, initialFocus, onAfterOpen, onAfterClose]);

  // Handle modal open/close animations
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      setTimeout(() => {
        setIsVisible(true);
        setIsAnimating(false);
      }, 10);
    } else if (isVisible) {
      setIsAnimating(true);
      setIsVisible(false);
      setTimeout(() => {
        setIsAnimating(false);
      }, 150);
    }
  }, [isOpen]);

  // Handle overlay click
  const handleOverlayClick = useCallback((event: React.MouseEvent) => {
    if (event.target === overlayRef.current && closeOnOverlayClick) {
      onClose();
    }
  }, [closeOnOverlayClick, onClose]);

  // Focus trap
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Tab' && contentRef.current) {
      const focusableElements = contentRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      const firstFocusable = focusableElements[0] as HTMLElement;
      const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (event.shiftKey) {
        if (document.activeElement === firstFocusable) {
          event.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          event.preventDefault();
          firstFocusable?.focus();
        }
      }
    }
  }, []);

  if (!isOpen && !isAnimating) return null;

  const modalContent = (
    <div
      ref={overlayRef}
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        'bg-black/50 backdrop-blur-sm transition-opacity duration-150',
        isVisible ? 'opacity-100' : 'opacity-0',
        overlayClassName
      )}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-description' : undefined}
    >
      <div
        ref={contentRef}
        className={cn(
          'relative w-full rounded-lg bg-background border shadow-strong transition-all duration-150 focus:outline-none',
          sizeClasses[size],
          variantClasses[variant],
          isVisible 
            ? 'scale-100 opacity-100 translate-y-0' 
            : 'scale-95 opacity-0 translate-y-4',
          size === 'full' && 'rounded-none',
          contentClassName
        )}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        {(title || description || showCloseButton) && (
          <div className="flex items-start justify-between p-6 pb-4">
            <div className="flex items-start space-x-3 flex-1">
              {getVariantIcon()}
              <div className="flex-1 space-y-1">
                {title && (
                  <h2 
                    id="modal-title"
                    className="text-lg font-semibold leading-none tracking-tight"
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p 
                    id="modal-description"
                    className="text-sm text-muted-foreground leading-relaxed"
                  >
                    {description}
                  </p>
                )}
              </div>
            </div>

            {showCloseButton && (
              <button
                onClick={onClose}
                className={cn(
                  'rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                  'ml-4 flex-shrink-0'
                )}
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        {children && (
          <div className={cn(
            'px-6',
            (title || description) ? 'pb-6' : 'py-6'
          )}>
            {children}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

// Confirmation Modal Component
export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive' | 'warning';
  loading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  loading = false,
}) => {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const handleConfirm = useCallback(() => {
    onConfirm();
  }, [onConfirm]);

  const getConfirmButtonVariant = () => {
    switch (variant) {
      case 'destructive':
        return 'bg-destructive text-destructive-foreground hover:bg-destructive/90';
      case 'warning':
        return 'bg-warning text-warning-foreground hover:bg-warning/90';
      default:
        return 'bg-primary text-primary-foreground hover:bg-primary hover:opacity-90';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      variant={variant}
      size="sm"
      initialFocus={confirmButtonRef}
      closeOnOverlayClick={!loading}
      closeOnEscape={!loading}
    >
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end space-y-2 space-y-reverse sm:space-y-0 sm:space-x-2">
        <button
          onClick={onClose}
          disabled={loading}
          className={cn(
            'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'h-10 px-4 py-2',
            'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
            'disabled:pointer-events-none disabled:opacity-50'
          )}
        >
          {cancelText}
        </button>
        
        <button
          ref={confirmButtonRef}
          onClick={handleConfirm}
          disabled={loading}
          className={cn(
            'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'h-10 px-4 py-2',
            getConfirmButtonVariant(),
            'disabled:pointer-events-none disabled:opacity-50'
          )}
        >
          {loading && (
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {confirmText}
        </button>
      </div>
    </Modal>
  );
};

// Alert Modal Component
export interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  variant?: 'info' | 'success' | 'warning' | 'destructive';
  buttonText?: string;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  variant = 'info',
  buttonText = 'OK',
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      variant={variant}
      size="sm"
      initialFocus={buttonRef}
    >
      <div className="flex justify-end">
        <button
          ref={buttonRef}
          onClick={onClose}
          className={cn(
            'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'h-10 px-4 py-2',
            'bg-primary text-primary-foreground hover:bg-primary hover:opacity-90'
          )}
        >
          {buttonText}
        </button>
      </div>
    </Modal>
  );
};

// Modal hooks for common use cases
export const useModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
};

export const useConfirmation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<{
    title: string;
    description?: string;
    onConfirm: () => void;
    variant?: 'default' | 'destructive' | 'warning';
  } | null>(null);

  const confirm = useCallback((
    title: string,
    description?: string,
    onConfirm?: () => void,
    variant?: 'default' | 'destructive' | 'warning'
  ) => {
    return new Promise<boolean>((resolve) => {
      setConfig({
        title,
        description,
        onConfirm: () => {
          onConfirm?.();
          resolve(true);
          setIsOpen(false);
        },
        variant,
      });
      setIsOpen(true);
    });
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setConfig(null);
  }, []);

  const ConfirmationModalComponent = config ? (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={close}
      onConfirm={config.onConfirm}
      title={config.title}
      description={config.description}
      variant={config.variant}
    />
  ) : null;

  return {
    confirm,
    ConfirmationModal: ConfirmationModalComponent,
  };
};