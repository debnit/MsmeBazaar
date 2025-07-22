import { useQuery, QueryKey, UseQueryOptions } from '@tanstack/react-query';
import { cacheApiCall, clientCache } from '../utils/cache';

// Fast query hook with optimized caching
export const useFastQuery = <T>(
  queryKey: QueryKey,
  queryFn: () => Promise<T>,
  options?: UseQueryOptions<T>
) => {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const cacheKey = Array.isArray(queryKey) ? queryKey.join(':') : String(queryKey);
      return cacheApiCall(cacheKey, queryFn, 300000); // 5 minutes cache
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
};

// Prefetch data for better performance
export const usePrefetchQuery = <T>(
  queryKey: QueryKey,
  queryFn: () => Promise<T>,
  condition: boolean = true
) => {
  return useQuery({
    queryKey,
    queryFn,
    enabled: condition,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};