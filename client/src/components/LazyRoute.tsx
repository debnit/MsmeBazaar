import { lazy, Suspense } from 'react';
import { Route, RouteProps } from 'wouter';

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
  </div>
);

interface LazyRouteProps extends Omit<RouteProps, 'component'> {
  component: () => Promise<{ default: React.ComponentType<any> }>;
  fallback?: React.ReactNode;
}

export const LazyRoute = ({ component, fallback = <LoadingSpinner />, ...props }: LazyRouteProps) => {
  const LazyComponent = lazy(component);
  
  return (
    <Route 
      {...props}
      component={(params) => (
        <Suspense fallback={fallback}>
          <LazyComponent {...params} />
        </Suspense>
      )}
    />
  );
};