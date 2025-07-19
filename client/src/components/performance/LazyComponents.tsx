import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
import { Loader2, TrendingUp, Building2, Users, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

// Loading fallback components
const LoadingSkeleton: React.FC<{ className?: string; variant?: 'card' | 'table' | 'chart' | 'dashboard' }> = ({
  className,
  variant = 'card',
}) => {
  const skeletonVariants = {
    pulse: {
      opacity: [0.6, 1, 0.6],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  switch (variant) {
  case 'table':
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={i}
            variants={skeletonVariants}
            animate="pulse"
            className="flex items-center space-x-4 p-4 bg-muted rounded-lg"
          >
            <div className="h-10 w-10 bg-muted-foreground/20 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted-foreground/20 rounded w-3/4" />
              <div className="h-3 bg-muted-foreground/20 rounded w-1/2" />
            </div>
            <div className="h-4 bg-muted-foreground/20 rounded w-20" />
          </motion.div>
        ))}
      </div>
    );

  case 'chart':
    return (
      <motion.div
        variants={skeletonVariants}
        animate="pulse"
        className={cn('space-y-4', className)}
      >
        <div className="h-6 bg-muted-foreground/20 rounded w-1/3" />
        <div className="h-64 bg-muted-foreground/20 rounded" />
        <div className="flex justify-between">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 bg-muted-foreground/20 rounded w-16" />
          ))}
        </div>
      </motion.div>
    );

  case 'dashboard':
    return (
      <div className={cn('space-y-6', className)}>
        {/* Header skeleton */}
        <motion.div
          variants={skeletonVariants}
          animate="pulse"
          className="space-y-2"
        >
          <div className="h-8 bg-muted-foreground/20 rounded w-1/4" />
          <div className="h-4 bg-muted-foreground/20 rounded w-1/2" />
        </motion.div>

        {/* Stats cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <motion.div
              key={i}
              variants={skeletonVariants}
              animate="pulse"
              className="p-6 bg-muted rounded-lg space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-muted-foreground/20 rounded w-20" />
                  <div className="h-8 bg-muted-foreground/20 rounded w-16" />
                </div>
                <div className="h-10 w-10 bg-muted-foreground/20 rounded-full" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Chart skeleton */}
        <motion.div
          variants={skeletonVariants}
          animate="pulse"
          className="p-6 bg-muted rounded-lg"
        >
          <div className="h-6 bg-muted-foreground/20 rounded w-1/4 mb-4" />
          <div className="h-64 bg-muted-foreground/20 rounded" />
        </motion.div>
      </div>
    );

  default:
    return (
      <motion.div
        variants={skeletonVariants}
        animate="pulse"
        className={cn('p-6 bg-muted rounded-lg space-y-4', className)}
      >
        <div className="h-6 bg-muted-foreground/20 rounded w-1/3" />
        <div className="space-y-2">
          <div className="h-4 bg-muted-foreground/20 rounded w-full" />
          <div className="h-4 bg-muted-foreground/20 rounded w-3/4" />
          <div className="h-4 bg-muted-foreground/20 rounded w-1/2" />
        </div>
      </motion.div>
    );
  }
};

// Enhanced loading spinner with context
const LoadingSpinner: React.FC<{
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({
  message = 'Loading...',
  className,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center space-y-4 p-8', className)}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="relative"
      >
        <Loader2 className={cn('text-primary', sizeClasses[size])} />
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-sm text-muted-foreground text-center"
      >
        {message}
      </motion.p>
    </div>
  );
};

// Lazy load heavy components
const LazyAnalyticsDashboard = React.lazy(() =>
  import('@/components/analytics/AnalyticsDashboard').then(module => ({
    default: module.AnalyticsDashboard,
  })),
);

const LazyMSMETable = React.lazy(() =>
  import('@/components/msme/MSMETable').then(module => ({
    default: module.MSMETable,
  })),
);

const LazyValuationChart = React.lazy(() =>
  import('@/components/charts/ValuationChart').then(module => ({
    default: module.ValuationChart,
  })),
);

const LazyGamificationDashboard = React.lazy(() =>
  import('@/components/gamification/GamificationDashboard').then(module => ({
    default: module.GamificationDashboard,
  })),
);

const LazyMSMERegistrationForm = React.lazy(() =>
  import('@/components/forms/MSMERegistrationForm').then(module => ({
    default: module.MSMERegistrationForm,
  })),
);

const LazyInteractiveMap = React.lazy(() =>
  import('@/components/maps/InteractiveMap').then(module => ({
    default: module.InteractiveMap,
  })),
);

// Wrapper components with error boundaries and loading states
export const SuspenseAnalyticsDashboard: React.FC<any> = (props) => (
  <Suspense fallback={<LoadingSkeleton variant="dashboard" />}>
    <LazyAnalyticsDashboard {...props} />
  </Suspense>
);

export const SuspenseMSMETable: React.FC<any> = (props) => (
  <Suspense fallback={<LoadingSkeleton variant="table" />}>
    <LazyMSMETable {...props} />
  </Suspense>
);

export const SuspenseValuationChart: React.FC<any> = (props) => (
  <Suspense fallback={<LoadingSkeleton variant="chart" />}>
    <LazyValuationChart {...props} />
  </Suspense>
);

export const SuspenseGamificationDashboard: React.FC<any> = (props) => (
  <Suspense fallback={<LoadingSpinner message="Loading gamification features..." />}>
    <LazyGamificationDashboard {...props} />
  </Suspense>
);

export const SuspenseMSMERegistrationForm: React.FC<any> = (props) => (
  <Suspense fallback={<LoadingSpinner message="Loading registration form..." />}>
    <LazyMSMERegistrationForm {...props} />
  </Suspense>
);

export const SuspenseInteractiveMap: React.FC<any> = (props) => (
  <Suspense fallback={<LoadingSpinner message="Loading interactive map..." />}>
    <LazyInteractiveMap {...props} />
  </Suspense>
);

// Performance monitoring wrapper
export const PerformanceWrapper: React.FC<{
  children: React.ReactNode;
  componentName: string;
  onLoadTime?: (time: number) => void;
}> = ({ children, componentName, onLoadTime }) => {
  React.useEffect(() => {
    const startTime = performance.now();

    return () => {
      const loadTime = performance.now() - startTime;
      onLoadTime?.(loadTime);

      // Log performance metrics
      if (process.env.NODE_ENV === 'development') {
        console.log(`${componentName} loaded in ${loadTime.toFixed(2)}ms`);
      }
    };
  }, [componentName, onLoadTime]);

  return <>{children}</>;
};

// Progressive loading component for images
export const ProgressiveImage: React.FC<{
  src: string;
  alt: string;
  placeholder?: string;
  className?: string;
  onLoad?: () => void;
}> = ({ src, alt, placeholder, className, onLoad }) => {
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);

  const handleLoad = () => {
    setLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
  };

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Placeholder */}
      {!loaded && !error && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: loaded ? 0 : 1 }}
          className="absolute inset-0 bg-muted"
        >
          {placeholder ? (
            <img
              src={placeholder}
              alt=""
              className="w-full h-full object-cover filter blur-sm"
            />
          ) : (
            <LoadingSkeleton className="w-full h-full" />
          )}
        </motion.div>
      )}

      {/* Main image */}
      <motion.img
        src={src}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        initial={{ opacity: 0 }}
        animate={{ opacity: loaded ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className={cn('w-full h-full object-cover', className)}
        loading="lazy"
      />

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Failed to load image</p>
        </div>
      )}
    </div>
  );
};

// Intersection Observer hook for lazy loading
export const useIntersectionObserver = (
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {},
) => {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) {return;}

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        ...options,
      },
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [ref, options]);

  return isVisible;
};

// Lazy section wrapper
export const LazySection: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
  threshold?: number;
  className?: string;
}> = ({ children, fallback, threshold = 0.1, className }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(ref, { threshold });

  return (
    <div ref={ref} className={className}>
      {isVisible ? children : fallback || <LoadingSkeleton />}
    </div>
  );
};

// Export all components
export {
  LoadingSkeleton,
  LoadingSpinner,
  LazyAnalyticsDashboard,
  LazyMSMETable,
  LazyValuationChart,
  LazyGamificationDashboard,
  LazyMSMERegistrationForm,
  LazyInteractiveMap,
};
