export async function apiRequest(url: string, options: RequestInit = {}) {
  // Improved token fallback strategy
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');

  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  const response = await fetch(`${import.meta.env.VITE_API_URL || ''}${url}`, mergedOptions);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network error' }));

    // Enhanced error handling for auth failures
    const enhancedError = {
      message: error.message || `HTTP ${response.status}`,
      status: response.status,
      statusText: response.statusText,
      ...(response.status === 401 && {
        authError: 'Authentication required - token missing or invalid',
      }),
      ...(response.status === 403 && {
        authError: 'Access denied - insufficient permissions',
      }),
    };

    throw enhancedError;
  }

  return response.json();
}
