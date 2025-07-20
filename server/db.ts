import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Database configuration with environment variables
const DATABASE_URL = process.env.DATABASE_URL;
const DB_POOL_SIZE = parseInt(process.env.DB_POOL_SIZE || "10");
const DB_CONNECTION_TIMEOUT = parseInt(process.env.DB_CONNECTION_TIMEOUT || "30000");
const DB_IDLE_TIMEOUT = parseInt(process.env.DB_IDLE_TIMEOUT || "30000");

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  console.error("📋 To fix this issue:");
  console.error("1. Provision a PostgreSQL database in Render");
  console.error("2. Copy the Internal Database URL");
  console.error("3. Set DATABASE_URL environment variable in Render dashboard");
  console.error("4. Redeploy your service");
  console.error("📖 See docs/RENDER_SETUP.md for detailed instructions");
  
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Enhanced connection pool configuration
export const pool = new Pool({ 
  connectionString: DATABASE_URL,
  max: DB_POOL_SIZE,
  connectionTimeoutMillis: DB_CONNECTION_TIMEOUT,
  idleTimeoutMillis: DB_IDLE_TIMEOUT,
});

// Database instance with error handling
export const db = drizzle({ client: pool, schema });

// Connection health check
export async function checkDatabaseHealth(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    await pool.query('SELECT 1 as health_check');
    const latency = Date.now() - startTime;
    
    return {
      healthy: true,
      latency
    };
  } catch (error) {
    console.error('Database health check failed:', error);
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Database connection retry wrapper
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      console.warn(`Database operation failed (attempt ${attempt}/${maxRetries}):`, lastError.message);
      
      // Exponential backoff
      const waitTime = delay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError!;
}

// Database query wrapper with logging and retry
export async function executeQuery<T>(
  queryFn: () => Promise<T>,
  queryName: string = 'unknown'
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await withRetry(queryFn);
    const duration = Date.now() - startTime;
    
    console.log(`DB Query [${queryName}] completed in ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`DB Query [${queryName}] failed after ${duration}ms:`, error);
    throw error;
  }
}

// Graceful shutdown
export async function closeDatabaseConnections(): Promise<void> {
  try {
    await pool.end();
    console.log('Database connections closed gracefully');
  } catch (error) {
    console.error('Error closing database connections:', error);
  }
}

// Connection monitoring
setInterval(async () => {
  const health = await checkDatabaseHealth();
  if (!health.healthy) {
    console.error('Database health check failed:', health.error);
  }
}, 60000); // Check every minute

// Handle process termination
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing database connections...');
  await closeDatabaseConnections();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing database connections...');
  await closeDatabaseConnections();
  process.exit(0);
});