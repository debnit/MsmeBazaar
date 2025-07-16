import { Suspense, lazy } from 'react';
import { Route, RouteProps } from 'wouter';
import { LoadingSpinner } from './ui/loading-spinner';

// Optimized route component with lazy loading and error boundaries
interface OptimizedRouteProps extends RouteProps {
  component: React.ComponentType<any>;
  fallback?: React.ReactNode;
}

export const OptimizedRoute = ({ 
  component: Component, 
  fallback = <LoadingSpinner />, 
  ...props 
}: OptimizedRouteProps) => {
  return (
    <Route 
      {...props} 
      component={(params) => (
        <Suspense fallback={fallback}>
          <Component {...params} />
        </Suspense>
      )}
    />
  );
};

// Preload components on hover
export const PreloadOnHover = ({ 
  onMouseEnter, 
  children, 
  loader 
}: { 
  onMouseEnter?: () => void;
  children: React.ReactNode;
  loader: () => Promise<any>;
}) => {
  const handleMouseEnter = () => {
    loader();
    onMouseEnter?.();
  };

  return (
    <div onMouseEnter={handleMouseEnter}>
      {children}
    </div>
  );
};