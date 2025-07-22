import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cachedFetch } from '@/utils/enhanced-caching';

// Create optimized query client with enhanced caching
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        // Only retry on network errors, not on 4xx/5xx
        if (error instanceof Error && error.message.includes('fetch')) {
          return failureCount < 2;
        }
        return false;
      },
    },
    mutations: {
      retry: 1,
    },
  },
});

// Enhanced API request function with caching
export async function apiRequest(
  method: string,
  url: string,
  data?: any,
  options?: RequestInit
): Promise<Response> {
  const requestOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  };

  if (data && method !== 'GET') {
    requestOptions.body = JSON.stringify(data);
  }

  // Use cached fetch for GET requests
  if (method === 'GET') {
    return cachedFetch(url, requestOptions);
  }

  // Regular fetch for non-GET requests
  const response = await fetch(url, requestOptions);
  
  // Invalidate cache on successful mutations
  if (response.ok && method !== 'GET') {
    // Clear related cache entries
    queryClient.invalidateQueries({ queryKey: [url] });
    
    // Clear specific cache patterns
    if (url.includes('auth')) {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    }
    if (url.includes('msme-listings')) {
      queryClient.invalidateQueries({ queryKey: ['/api/msme-listings'] });
    }
  }

  return response;
}

// Preload critical queries
export const preloadCriticalQueries = () => {
  const criticalQueries = [
    { queryKey: ['/api/auth/me'], queryFn: () => apiRequest('GET', '/api/auth/me') },
    { queryKey: ['/api/dashboard-stats'], queryFn: () => apiRequest('GET', '/api/dashboard-stats') },
    { queryKey: ['/api/health'], queryFn: () => apiRequest('GET', '/api/health') },
  ];

  criticalQueries.forEach(query => {
    queryClient.prefetchQuery(query);
  });
};