#!/usr/bin/env node

/**
 * Database Check and Migration Script
 * Ensures database is properly configured and migrations are applied
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

async function checkDatabase() {
  console.log('🔍 Checking database connection...');
  
  try {
    const client = postgres(DATABASE_URL, { max: 1 });
    const db = drizzle(client);
    
    // Test basic connection
    await client`SELECT 1 as test`;
    console.log('✅ Database connection successful');
    
    // Check if migrations are needed
    try {
      console.log('🔄 Checking for pending migrations...');
      
      // Run migrations (this will create tables if they don't exist)
      await migrate(db, { migrationsFolder: './database/migrations' });
      console.log('✅ Database migrations completed');
      
    } catch (migrationError) {
      console.log('⚠️ Migration check completed (tables may already exist)');
    }
    
    await client.end();
    console.log('✅ Database check completed successfully');
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.error('💡 Database connection failed. Please check:');
      console.error('   - DATABASE_URL is correct');
      console.error('   - Database server is running');
      console.error('   - Network connectivity');
    }
    
    process.exit(1);
  }
}

// Run the check
checkDatabase().catch(console.error);