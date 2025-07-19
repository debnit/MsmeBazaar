// Theme System - Enterprise Design System for MSMEBazaar
import { designTokens } from './design-tokens';

// Theme Configuration
export const themes = {
  light: {
    // Background Colors
    background: {
      primary: designTokens.colors.neutral[0],     // Pure white
      secondary: designTokens.colors.neutral[50],  // Off white
      tertiary: designTokens.colors.neutral[100],  // Light gray
      inverse: designTokens.colors.neutral[900],   // Dark gray
    },

    // Text Colors
    text: {
      primary: designTokens.colors.neutral[900],   // Nearly black
      secondary: designTokens.colors.neutral[600], // Medium gray
      tertiary: designTokens.colors.neutral[500],  // Light gray
      inverse: designTokens.colors.neutral[0],     // White
      muted: designTokens.colors.neutral[400],     // Very light gray
    },

    // Border Colors
    border: {
      primary: designTokens.colors.neutral[200],   // Light border
      secondary: designTokens.colors.neutral[300], // Medium border
      strong: designTokens.colors.neutral[400],    // Strong border
      interactive: designTokens.colors.primary[300], // Interactive border
    },

    // Surface Colors (for cards, modals, etc.)
    surface: {
      primary: designTokens.colors.neutral[0],     // White
      secondary: designTokens.colors.neutral[50],  // Off white
      elevated: designTokens.colors.neutral[0],    // White with shadow
      overlay: 'rgba(0, 0, 0, 0.5)',              // Modal backdrop
    },

    // Interactive States
    interactive: {
      primary: designTokens.colors.primary[500],
      'primary-hover': designTokens.colors.primary[600],
      'primary-active': designTokens.colors.primary[700],
      'primary-disabled': designTokens.colors.neutral[300],

      secondary: designTokens.colors.neutral[100],
      'secondary-hover': designTokens.colors.neutral[200],
      'secondary-active': designTokens.colors.neutral[300],

      ghost: 'transparent',
      'ghost-hover': designTokens.colors.neutral[100],
      'ghost-active': designTokens.colors.neutral[200],
    },

    // Status Colors
    status: {
      success: designTokens.colors.success[500],
      'success-bg': designTokens.colors.success[50],
      'success-border': designTokens.colors.success[200],

      warning: designTokens.colors.warning[500],
      'warning-bg': designTokens.colors.warning[50],
      'warning-border': designTokens.colors.warning[200],

      error: designTokens.colors.error[500],
      'error-bg': designTokens.colors.error[50],
      'error-border': designTokens.colors.error[200],

      info: designTokens.colors.primary[500],
      'info-bg': designTokens.colors.primary[50],
      'info-border': designTokens.colors.primary[200],
    },
  },

  dark: {
    // Background Colors
    background: {
      primary: designTokens.colors.neutral[950],   // Nearly black
      secondary: designTokens.colors.neutral[900], // Dark gray
      tertiary: designTokens.colors.neutral[800],  // Medium dark
      inverse: designTokens.colors.neutral[0],     // White
    },

    // Text Colors
    text: {
      primary: designTokens.colors.neutral[50],    // Off white
      secondary: designTokens.colors.neutral[400], // Medium gray
      tertiary: designTokens.colors.neutral[500],  // Light gray
      inverse: designTokens.colors.neutral[900],   // Dark
      muted: designTokens.colors.neutral[600],     // Muted gray
    },

    // Border Colors
    border: {
      primary: designTokens.colors.neutral[800],   // Dark border
      secondary: designTokens.colors.neutral[700], // Medium border
      strong: designTokens.colors.neutral[600],    // Strong border
      interactive: designTokens.colors.primary[400], // Interactive border
    },

    // Surface Colors
    surface: {
      primary: designTokens.colors.neutral[900],   // Dark gray
      secondary: designTokens.colors.neutral[800], // Medium dark
      elevated: designTokens.colors.neutral[850],  // Elevated surface
      overlay: 'rgba(0, 0, 0, 0.8)',              // Modal backdrop
    },

    // Interactive States
    interactive: {
      primary: designTokens.colors.primary[400],
      'primary-hover': designTokens.colors.primary[300],
      'primary-active': designTokens.colors.primary[200],
      'primary-disabled': designTokens.colors.neutral[700],

      secondary: designTokens.colors.neutral[800],
      'secondary-hover': designTokens.colors.neutral[700],
      'secondary-active': designTokens.colors.neutral[600],

      ghost: 'transparent',
      'ghost-hover': designTokens.colors.neutral[800],
      'ghost-active': designTokens.colors.neutral[700],
    },

    // Status Colors
    status: {
      success: designTokens.colors.success[400],
      'success-bg': 'rgba(34, 197, 94, 0.1)',
      'success-border': designTokens.colors.success[700],

      warning: designTokens.colors.warning[400],
      'warning-bg': 'rgba(245, 158, 11, 0.1)',
      'warning-border': designTokens.colors.warning[700],

      error: designTokens.colors.error[400],
      'error-bg': 'rgba(239, 68, 68, 0.1)',
      'error-border': designTokens.colors.error[700],

      info: designTokens.colors.primary[400],
      'info-bg': 'rgba(14, 165, 233, 0.1)',
      'info-border': designTokens.colors.primary[700],
    },
  },
} as const;

// CSS Variables for theme switching
export const generateCSSVariables = (theme: 'light' | 'dark') => {
  const currentTheme = themes[theme];

  return {
    // Background
    '--bg-primary': currentTheme.background.primary,
    '--bg-secondary': currentTheme.background.secondary,
    '--bg-tertiary': currentTheme.background.tertiary,
    '--bg-inverse': currentTheme.background.inverse,

    // Text
    '--text-primary': currentTheme.text.primary,
    '--text-secondary': currentTheme.text.secondary,
    '--text-tertiary': currentTheme.text.tertiary,
    '--text-inverse': currentTheme.text.inverse,
    '--text-muted': currentTheme.text.muted,

    // Borders
    '--border-primary': currentTheme.border.primary,
    '--border-secondary': currentTheme.border.secondary,
    '--border-strong': currentTheme.border.strong,
    '--border-interactive': currentTheme.border.interactive,

    // Surfaces
    '--surface-primary': currentTheme.surface.primary,
    '--surface-secondary': currentTheme.surface.secondary,
    '--surface-elevated': currentTheme.surface.elevated,
    '--surface-overlay': currentTheme.surface.overlay,

    // Interactive
    '--interactive-primary': currentTheme.interactive.primary,
    '--interactive-primary-hover': currentTheme.interactive['primary-hover'],
    '--interactive-primary-active': currentTheme.interactive['primary-active'],
    '--interactive-primary-disabled': currentTheme.interactive['primary-disabled'],
    '--interactive-secondary': currentTheme.interactive.secondary,
    '--interactive-secondary-hover': currentTheme.interactive['secondary-hover'],
    '--interactive-secondary-active': currentTheme.interactive['secondary-active'],
    '--interactive-ghost': currentTheme.interactive.ghost,
    '--interactive-ghost-hover': currentTheme.interactive['ghost-hover'],
    '--interactive-ghost-active': currentTheme.interactive['ghost-active'],

    // Status
    '--status-success': currentTheme.status.success,
    '--status-success-bg': currentTheme.status['success-bg'],
    '--status-success-border': currentTheme.status['success-border'],
    '--status-warning': currentTheme.status.warning,
    '--status-warning-bg': currentTheme.status['warning-bg'],
    '--status-warning-border': currentTheme.status['warning-border'],
    '--status-error': currentTheme.status.error,
    '--status-error-bg': currentTheme.status['error-bg'],
    '--status-error-border': currentTheme.status['error-border'],
    '--status-info': currentTheme.status.info,
    '--status-info-bg': currentTheme.status['info-bg'],
    '--status-info-border': currentTheme.status['info-border'],
  };
};

// Theme Context
export interface ThemeContextType {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  systemTheme: 'light' | 'dark';
}

// Animation Presets
export const animationPresets = {
  // Fade animations
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2, ease: 'easeOut' },
  },

  // Scale animations
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.2, ease: 'easeOut' },
  },

  // Slide animations
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },

  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },

  slideLeft: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },

  slideRight: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },

  // Bounce animation
  bounce: {
    initial: { opacity: 0, scale: 0.3 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.3 },
    transition: {
      duration: 0.5,
      ease: [0.68, -0.55, 0.265, 1.55], // bounce easing
    },
  },

  // Stagger children animation
  staggerChildren: {
    animate: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  },

  // Page transitions
  pageTransition: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.4, ease: 'easeInOut' },
  },
};

// Component Style Variants
export const componentVariants = {
  // Button variants
  button: {
    primary: {
      backgroundColor: 'var(--interactive-primary)',
      color: 'var(--text-inverse)',
      '&:hover': {
        backgroundColor: 'var(--interactive-primary-hover)',
      },
      '&:active': {
        backgroundColor: 'var(--interactive-primary-active)',
      },
      '&:disabled': {
        backgroundColor: 'var(--interactive-primary-disabled)',
        cursor: 'not-allowed',
      },
    },

    secondary: {
      backgroundColor: 'var(--interactive-secondary)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-primary)',
      '&:hover': {
        backgroundColor: 'var(--interactive-secondary-hover)',
      },
      '&:active': {
        backgroundColor: 'var(--interactive-secondary-active)',
      },
    },

    ghost: {
      backgroundColor: 'var(--interactive-ghost)',
      color: 'var(--text-primary)',
      '&:hover': {
        backgroundColor: 'var(--interactive-ghost-hover)',
      },
      '&:active': {
        backgroundColor: 'var(--interactive-ghost-active)',
      },
    },
  },

  // Card variants
  card: {
    default: {
      backgroundColor: 'var(--surface-primary)',
      border: '1px solid var(--border-primary)',
      borderRadius: designTokens.borderRadius['2xl'],
      boxShadow: designTokens.boxShadow.md,
    },

    elevated: {
      backgroundColor: 'var(--surface-elevated)',
      border: '1px solid var(--border-primary)',
      borderRadius: designTokens.borderRadius['2xl'],
      boxShadow: designTokens.boxShadow.xl,
    },

    outlined: {
      backgroundColor: 'var(--surface-primary)',
      border: '2px solid var(--border-interactive)',
      borderRadius: designTokens.borderRadius['2xl'],
    },
  },
};

// Utility classes for theming
export const themeClasses = {
  // Background utilities
  bg: {
    primary: 'bg-[var(--bg-primary)]',
    secondary: 'bg-[var(--bg-secondary)]',
    tertiary: 'bg-[var(--bg-tertiary)]',
    inverse: 'bg-[var(--bg-inverse)]',
  },

  // Text utilities
  text: {
    primary: 'text-[var(--text-primary)]',
    secondary: 'text-[var(--text-secondary)]',
    tertiary: 'text-[var(--text-tertiary)]',
    inverse: 'text-[var(--text-inverse)]',
    muted: 'text-[var(--text-muted)]',
  },

  // Border utilities
  border: {
    primary: 'border-[var(--border-primary)]',
    secondary: 'border-[var(--border-secondary)]',
    strong: 'border-[var(--border-strong)]',
    interactive: 'border-[var(--border-interactive)]',
  },
};

export type ThemeType = keyof typeof themes;
export type AnimationPreset = keyof typeof animationPresets;
