// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Database configuration with environment variables
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

// Database configuration with environment variables
const DB_POOL_SIZE = parseInt(process.env.DB_POOL_SIZE || "10");
const DB_CONNECTION_TIMEOUT = parseInt(process.env.DB_CONNECTION_TIMEOUT || "10000");
const DB_IDLE_TIMEOUT = parseInt(process.env.DB_IDLE_TIMEOUT || "30000");

// Log connection type for debugging
console.log('🔌 Using standard PostgreSQL connection');
console.log(`📊 Pool config: max=${DB_POOL_SIZE}, timeout=${DB_CONNECTION_TIMEOUT}ms`);

// Enhanced connection pool configuration
export const pool = new Pool({ 
  connectionString: DATABASE_URL,
  max: DB_POOL_SIZE,
  connectionTimeoutMillis: DB_CONNECTION_TIMEOUT,
  idleTimeoutMillis: DB_IDLE_TIMEOUT,
  // SSL configuration for production databases
  ssl: DATABASE_URL.includes('localhost') ? false : {
    rejectUnauthorized: false
  }
});

// Database instance with error handling
export const db = drizzle(pool, { schema });

// Production-safe database health check using standard PostgreSQL
export async function checkDatabaseHealth(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
  const startTime = Date.now();
  const timeout = 8000; // 8 second timeout
  
  try {
    console.log('🔍 Performing standard PostgreSQL health check...');
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database health check timeout after 8s')), timeout);
    });
    
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
    console.error(`   Database URL starts with: ${DATABASE_URL.substring(0, 20)}...`);
    
    // Provide specific troubleshooting guidance
    if (errorMessage.includes('ECONNREFUSED')) {
      console.error('💡 Connection refused - check if database server is running and accessible');
    } else if (errorMessage.includes('authentication')) {
      console.error('💡 Authentication failed - check username/password in DATABASE_URL');
    } else if (errorMessage.includes('timeout')) {
      console.error('💡 Connection timeout - check network connectivity and firewall settings');
    }
    
    return {
      healthy: false,
      latency,
      error: errorMessage
    };
  }
}

// Enhanced database connection retry wrapper
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
        console.error('💥 All database retry attempts failed');
        console.error('   Last error:', lastError.message);
        throw lastError;
      }
      
      console.warn(`Database operation failed (attempt ${attempt}/${maxRetries}):`, lastError.message);
      console.warn(`Retrying in ${delay}ms...`);
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Exponential backoff
      delay *= 2;
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
      console.error('');
      console.error('🔧 Database Connection Troubleshooting:');
      console.error('1. Verify your DATABASE_URL is correct and uses postgres:// format');
      console.error('2. Check that the database server is running and accessible');
      console.error('3. Ensure your database credentials are correct');
      console.error('4. Verify network connectivity and firewall settings');
      console.error('5. For cloud databases, ensure SSL is properly configured');
      console.error('');
      
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
    console.log('🔌 Closing database connections...');
    await pool.end();
    console.log('✅ Database connections closed successfully');
  } catch (error) {
    console.error('❌ Error closing database connections:', error);
  }
}

// Handle process termination
process.on('SIGTERM', async () => {
  console.log('📱 Received SIGTERM, closing database connections...');
  await closeDatabaseConnections();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📱 Received SIGINT, closing database connections...');
  await closeDatabaseConnections();
  process.exit(0);
});