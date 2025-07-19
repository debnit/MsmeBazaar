import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { applyMask, removeMask, getMaskPlaceholder, validateMaskedInput, getCursorPosition, type MaskType } from '@/lib/input-masks';
import { Eye, EyeOff, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export interface FormFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string;
  description?: string;
  error?: string;
  success?: string;
  loading?: boolean;
  required?: boolean;
  mask?: MaskType;
  value?: string;
  onChange?: (value: string, rawValue?: string) => void;
  showPasswordToggle?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'ghost' | 'filled';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({
    label,
    description,
    error,
    success,
    loading,
    required,
    mask,
    value = '',
    onChange,
    showPasswordToggle,
    leftIcon,
    rightIcon,
    variant = 'default',
    size = 'md',
    fullWidth = true,
    type = 'text',
    placeholder,
    disabled,
    className,
    id,
    ...props
  }, ref) => {
    const [internalValue, setInternalValue] = useState(value);
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [cursorPosition, setCursorPosition] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const fieldId = id || `field-${Math.random().toString(36).substr(2, 9)}`;

    // Use provided ref or internal ref
    const resolvedRef = ref || inputRef;

    // Sync internal value with prop value
    useEffect(() => {
      if (value !== internalValue) {
        setInternalValue(value);
      }
    }, [value]);

    // Apply mask and handle cursor position
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputElement = e.target;
      const newValue = e.target.value;
      const oldCursor = inputElement.selectionStart || 0;

      let processedValue = newValue;
      let rawValue = newValue;

      if (mask) {
        processedValue = applyMask(newValue, mask);
        rawValue = removeMask(processedValue, mask);

        // Calculate new cursor position
        const newCursor = getCursorPosition(internalValue, processedValue, oldCursor, mask);
        setCursorPosition(newCursor);
      }

      setInternalValue(processedValue);
      onChange?.(processedValue, rawValue);
    };

    // Set cursor position after render
    useEffect(() => {
      if (mask && resolvedRef && 'current' in resolvedRef && resolvedRef.current) {
        resolvedRef.current.setSelectionRange(cursorPosition, cursorPosition);
      }
    }, [internalValue, cursorPosition, mask]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      props.onBlur?.(e);
    };

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };

    // Determine input type
    const inputType = showPasswordToggle
      ? (showPassword ? 'text' : 'password')
      : type;

    // Generate placeholder
    const inputPlaceholder = mask
      ? (placeholder || getMaskPlaceholder(mask))
      : placeholder;

    // Size classes
    const sizeClasses = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-3 text-sm',
      lg: 'h-12 px-4 text-base',
    };

    // Variant classes
    const variantClasses = {
      default: 'border border-input bg-background',
      ghost: 'border-0 bg-transparent',
      filled: 'border-0 bg-muted',
    };

    // Status classes
    const statusClasses = error
      ? 'border-destructive focus-visible:ring-destructive'
      : success
        ? 'border-success focus-visible:ring-success'
        : 'focus-visible:ring-ring';

    const hasLeftContent = leftIcon;
    const hasRightContent = rightIcon || showPasswordToggle || loading || error || success;

    return (
      <div className={cn('form-field', fullWidth && 'w-full', className)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={fieldId}
            className={cn(
              'form-label block mb-2',
              required && "after:content-['*'] after:ml-1 after:text-destructive",
              disabled && 'opacity-60',
            )}
          >
            {label}
          </label>
        )}

        {/* Input container */}
        <div className="relative">
          {/* Left icon */}
          {hasLeftContent && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              {leftIcon}
            </div>
          )}

          {/* Input field */}
          <input
            ref={resolvedRef}
            id={fieldId}
            type={inputType}
            value={internalValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={inputPlaceholder}
            disabled={disabled || loading}
            aria-describedby={
              [
                description && `${fieldId}-description`,
                error && `${fieldId}-error`,
                success && `${fieldId}-success`,
              ]
                .filter(Boolean)
                .join(' ') || undefined
            }
            aria-invalid={!!error}
            aria-required={required}
            className={cn(
              'input-base flex w-full rounded-md ring-offset-background transition-colors',
              'file:border-0 file:bg-transparent file:text-sm file:font-medium',
              'placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              sizeClasses[size],
              variantClasses[variant],
              statusClasses,
              hasLeftContent && 'pl-10',
              hasRightContent && 'pr-10',
              isFocused && 'ring-2 ring-offset-2',
            )}
            {...props}
          />

          {/* Right content */}
          {hasRightContent && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {/* Loading spinner */}
              {loading && (
                <Loader2
                  className="h-4 w-4 animate-spin text-muted-foreground"
                  aria-label="Loading"
                />
              )}

              {/* Success icon */}
              {success && !loading && (
                <CheckCircle2
                  className="h-4 w-4 text-success"
                  aria-label="Success"
                />
              )}

              {/* Error icon */}
              {error && !loading && (
                <AlertCircle
                  className="h-4 w-4 text-destructive"
                  aria-label="Error"
                />
              )}

              {/* Password toggle */}
              {showPasswordToggle && !loading && (
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className={cn(
                    'inline-flex items-center justify-center',
                    'h-4 w-4 text-muted-foreground hover:text-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    'transition-colors',
                  )}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              )}

              {/* Custom right icon */}
              {rightIcon && !loading && (
                <div className="text-muted-foreground">
                  {rightIcon}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Description */}
        {description && (
          <p
            id={`${fieldId}-description`}
            className="form-description mt-1 text-sm text-muted-foreground"
          >
            {description}
          </p>
        )}

        {/* Error message */}
        {error && (
          <p
            id={`${fieldId}-error`}
            className="form-error mt-1 text-sm text-destructive flex items-center gap-1"
            role="alert"
          >
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            {error}
          </p>
        )}

        {/* Success message */}
        {success && !error && (
          <p
            id={`${fieldId}-success`}
            className="mt-1 text-sm text-success flex items-center gap-1"
          >
            <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
            {success}
          </p>
        )}
      </div>
    );
  },
);

FormField.displayName = 'FormField';

// Textarea component with similar features
export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label?: string;
  description?: string;
  error?: string;
  success?: string;
  loading?: boolean;
  required?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  variant?: 'default' | 'ghost' | 'filled';
  fullWidth?: boolean;
  showCharCount?: boolean;
  maxLength?: number;
  minRows?: number;
  maxRows?: number;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({
    label,
    description,
    error,
    success,
    loading,
    required,
    value = '',
    onChange,
    variant = 'default',
    fullWidth = true,
    showCharCount,
    maxLength,
    minRows = 3,
    maxRows = 10,
    disabled,
    className,
    id,
    ...props
  }, ref) => {
    const [internalValue, setInternalValue] = useState(value);
    const [isFocused, setIsFocused] = useState(false);
    const fieldId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

    // Sync internal value with prop value
    useEffect(() => {
      if (value !== internalValue) {
        setInternalValue(value);
      }
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setInternalValue(newValue);
      onChange?.(newValue);
    };

    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(true);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(false);
      props.onBlur?.(e);
    };

    const charCount = internalValue.length;
    const isOverLimit = maxLength ? charCount > maxLength : false;

    // Variant classes
    const variantClasses = {
      default: 'border border-input bg-background',
      ghost: 'border-0 bg-transparent',
      filled: 'border-0 bg-muted',
    };

    // Status classes
    const statusClasses = error
      ? 'border-destructive focus-visible:ring-destructive'
      : success
        ? 'border-success focus-visible:ring-success'
        : 'focus-visible:ring-ring';

    return (
      <div className={cn('form-field', fullWidth && 'w-full', className)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={fieldId}
            className={cn(
              'form-label block mb-2',
              required && "after:content-['*'] after:ml-1 after:text-destructive",
              disabled && 'opacity-60',
            )}
          >
            {label}
          </label>
        )}

        {/* Textarea */}
        <textarea
          ref={ref}
          id={fieldId}
          value={internalValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled || loading}
          maxLength={maxLength}
          aria-describedby={
            [
              description && `${fieldId}-description`,
              error && `${fieldId}-error`,
              success && `${fieldId}-success`,
            ]
              .filter(Boolean)
              .join(' ') || undefined
          }
          aria-invalid={!!error}
          aria-required={required}
          className={cn(
            'flex min-h-[80px] w-full rounded-md px-3 py-2 text-sm',
            'ring-offset-background transition-colors resize-y',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            variantClasses[variant],
            statusClasses,
            isFocused && 'ring-2 ring-offset-2',
          )}
          rows={minRows}
          style={{ maxHeight: `${maxRows * 1.5}rem` }}
          {...props}
        />

        {/* Character count */}
        {showCharCount && maxLength && (
          <div className="mt-1 text-right">
            <span className={cn(
              'text-xs',
              isOverLimit ? 'text-destructive' : 'text-muted-foreground',
            )}>
              {charCount}/{maxLength}
            </span>
          </div>
        )}

        {/* Description */}
        {description && (
          <p
            id={`${fieldId}-description`}
            className="form-description mt-1 text-sm text-muted-foreground"
          >
            {description}
          </p>
        )}

        {/* Error message */}
        {error && (
          <p
            id={`${fieldId}-error`}
            className="form-error mt-1 text-sm text-destructive flex items-center gap-1"
            role="alert"
          >
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            {error}
          </p>
        )}

        {/* Success message */}
        {success && !error && (
          <p
            id={`${fieldId}-success`}
            className="mt-1 text-sm text-success flex items-center gap-1"
          >
            <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
            {success}
          </p>
        )}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
