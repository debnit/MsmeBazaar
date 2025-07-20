// Production Configuration - Safe External Service Handling
export const productionConfig = {
  // External Services - Disable in production if not configured
  externalServices: {
    mlService: {
      enabled: !!process.env.ML_SERVICE_URL && process.env.ML_SERVICE_URL !== 'http://localhost:8000',
      url: process.env.ML_SERVICE_URL,
      timeout: 5000,
    },
    
    msg91: {
      enabled: !!process.env.MSG91_AUTH_KEY,
      authKey: process.env.MSG91_AUTH_KEY,
      timeout: 10000,
    },
    
    metabase: {
      enabled: !!process.env.METABASE_SITE_URL && !!process.env.METABASE_USERNAME,
      siteUrl: process.env.METABASE_SITE_URL,
      timeout: 5000,
    },
    
    retool: {
      enabled: !!process.env.RETOOL_BASE_URL,
      baseUrl: process.env.RETOOL_BASE_URL,
      timeout: 5000,
    },
    
    whatsapp: {
      enabled: !!process.env.WHATSAPP_API_URL && !!process.env.WHATSAPP_API_TOKEN,
      apiUrl: process.env.WHATSAPP_API_URL,
      timeout: 10000,
    }
  },
  
  // Database Configuration
  database: {
    healthCheckEnabled: true,
    healthCheckInterval: 30000, // 30 seconds
    connectionTimeout: 10000,
    queryTimeout: 5000,
  },
  
  // Error Handling
  errorHandling: {
    logExternalServiceErrors: true,
    failSilentlyOnExternalServiceErrors: true,
    retryAttempts: 2,
    retryDelay: 1000,
  }
};

// Helper function to check if external service is available
export function isExternalServiceEnabled(serviceName: keyof typeof productionConfig.externalServices): boolean {
  return productionConfig.externalServices[serviceName].enabled;
}

// Safe external service call wrapper
export async function safeExternalCall<T>(
  serviceName: string,
  callFn: () => Promise<T>,
  fallbackValue?: T
): Promise<T | null> {
  try {
    return await callFn();
  } catch (error) {
    console.warn(`External service ${serviceName} call failed:`, error);
    
    if (productionConfig.errorHandling.failSilentlyOnExternalServiceErrors) {
      return fallbackValue || null;
    }
    
    throw error;
  }
}