import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket only if we're using a WebSocket-compatible database URL
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  console.error("📋 To fix this issue:");
  console.error("1. Provision a PostgreSQL database in Render");
  console.error("2. Copy the Internal Database URL (postgres://...)");
  console.error("3. Set DATABASE_URL environment variable in Render dashboard");
  console.error("4. Redeploy your service");
  console.error("📖 See docs/RENDER_SETUP.md for detailed instructions");
  
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Only configure WebSocket for Neon databases that support it
const isNeonWebSocketUrl = DATABASE_URL.includes('neon.tech') || DATABASE_URL.startsWith('wss://');
const isRegularPostgres = DATABASE_URL.startsWith('postgres://') || DATABASE_URL.startsWith('postgresql://');

if (isNeonWebSocketUrl) {
  console.log('🔌 Configuring Neon WebSocket connection');
  neonConfig.webSocketConstructor = ws;
} else if (isRegularPostgres) {
  console.log('🔌 Using standard PostgreSQL connection');
  // Don't configure WebSocket for regular PostgreSQL
} else {
  console.warn('⚠️ Unknown database URL format, attempting standard connection');
}

// Database configuration with environment variables
const DB_POOL_SIZE = parseInt(process.env.DB_POOL_SIZE || "10");
const DB_CONNECTION_TIMEOUT = parseInt(process.env.DB_CONNECTION_TIMEOUT || "10000"); // Reduced from 30s
const DB_IDLE_TIMEOUT = parseInt(process.env.DB_IDLE_TIMEOUT || "30000");

// Enhanced connection pool configuration
export const pool = new Pool({ 
  connectionString: DATABASE_URL,
  max: DB_POOL_SIZE,
  connectionTimeoutMillis: DB_CONNECTION_TIMEOUT,
  idleTimeoutMillis: DB_IDLE_TIMEOUT,
});

// Database instance with error handling
export const db = drizzle({ client: pool, schema });

// Production-safe database health check
export async function checkDatabaseHealth(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
  const startTime = Date.now();
  const timeout = 8000; // 8 second timeout (increased for WebSocket handshake)
  
  try {
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database health check timeout after 8s')), timeout);
    });
    
    // For WebSocket connections, we need to handle connection establishment
    if (isNeonWebSocketUrl) {
      console.log('🔍 Performing WebSocket database health check...');
    } else {
      console.log('🔍 Performing standard PostgreSQL health check...');
    }
    
    // Race between query and timeout
    await Promise.race([
      pool.query('SELECT 1 as health_check, NOW() as current_time'),
      timeoutPromise
    ]);
    
    const latency = Date.now() - startTime;
    console.log(`✅ Database health check passed (${latency}ms)`);
    
    return {
      healthy: true,
      latency
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Enhanced error logging for debugging
    console.error(`❌ Database health check failed after ${latency}ms:`);
    console.error(`   Error: ${errorMessage}`);
    console.error(`   Database URL type: ${isNeonWebSocketUrl ? 'Neon WebSocket' : 'Standard PostgreSQL'}`);
    console.error(`   URL starts with: ${DATABASE_URL.substring(0, 20)}...`);
    
    // Check for specific WebSocket errors
    if (errorMessage.includes('WebSocket') || errorMessage.includes('1006')) {
      console.error('💡 WebSocket connection failed. Consider using postgres:// URL instead of wss://');
    }
    
    return {
      healthy: false,
      latency,
      error: errorMessage
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

// Test database connection on startup
export async function testDatabaseConnection(): Promise<void> {
  console.log('🔍 Testing database connection...');
  
  try {
    const result = await checkDatabaseHealth();
    
    if (result.healthy) {
      console.log(`✅ Database connection successful (${result.latency}ms)`);
    } else {
      console.error(`❌ Database connection failed: ${result.error}`);
      
      // Provide helpful error messages based on the error type
      if (result.error?.includes('WebSocket') || result.error?.includes('1006')) {
        console.error('');
        console.error('🔧 WebSocket Connection Troubleshooting:');
        console.error('1. If using Render PostgreSQL, use the postgres:// URL (Internal Database URL)');
        console.error('2. If using Neon, make sure the URL includes neon.tech domain');
        console.error('3. Check that your DATABASE_URL environment variable is correctly set');
        console.error('4. Verify network connectivity to the database server');
        console.error('');
      }
      
      throw new Error(`Database connection test failed: ${result.error}`);
    }
  } catch (error) {
    console.error('💥 Critical database connection error:', error);
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