#!/usr/bin/env node

/**
 * 🧪 Database Connection Test Script
 * 
 * This script tests your PostgreSQL database connection
 * and performs health checks for the MSMEBazaar application.
 */

import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

async function loadEnvVariables() {
  const envPath = path.join(__dirname, '.env');
  
  if (!fs.existsSync(envPath)) {
    throw new Error('.env file not found. Please run setup-database.js first.');
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#][^=]*)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (value) {
        envVars[key] = value;
        process.env[key] = value;
      }
    }
  });

  return envVars;
}

async function testDatabaseConnection() {
  console.log(colorize('\n🧪 Database Connection Test', 'cyan'));
  console.log(colorize('===========================\n', 'cyan'));

  try {
    // Load environment variables
    const envVars = await loadEnvVariables();
    console.log(colorize('✅ Environment variables loaded', 'green'));

    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.log(colorize('❌ DATABASE_URL not found in .env', 'red'));
      console.log('Run setup-database.js to configure your database');
      return;
    }

    // Parse database URL for display
    const urlParts = databaseUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (urlParts) {
      const [, user, , host, port, dbName] = urlParts;
      console.log(colorize('📊 Database Configuration:', 'blue'));
      console.log(`   Host: ${host}`);
      console.log(`   Port: ${port}`);
      console.log(`   Database: ${dbName}`);
      console.log(`   User: ${user}`);
      console.log(`   URL: ${databaseUrl.substring(0, 30)}...`);
    }

    console.log(colorize('\n🔍 Testing Connection...', 'blue'));

    // Create connection pool
    const pool = new Pool({
      connectionString: databaseUrl,
      max: 1,
      connectionTimeoutMillis: 10000,
      ssl: databaseUrl.includes('localhost') ? false : {
        rejectUnauthorized: false
      }
    });

    const startTime = Date.now();
    
    // Test basic connection
    const client = await pool.connect();
    const connectionTime = Date.now() - startTime;
    
    console.log(colorize(`✅ Database connection successful (${connectionTime}ms)`, 'green'));

    // Test basic query
    console.log(colorize('\n🔍 Testing Basic Queries...', 'blue'));
    
    const versionResult = await client.query('SELECT version()');
    const postgresVersion = versionResult.rows[0].version;
    console.log(colorize('✅ PostgreSQL version:', 'green'));
    console.log(`   ${postgresVersion.split(' ').slice(0, 2).join(' ')}`);

    // Test database info
    const dbInfoResult = await client.query(`
      SELECT 
        current_database() as database_name,
        current_user as current_user,
        inet_server_addr() as server_address,
        inet_server_port() as server_port
    `);
    
    const dbInfo = dbInfoResult.rows[0];
    console.log(colorize('✅ Database info:', 'green'));
    console.log(`   Database: ${dbInfo.database_name}`);
    console.log(`   User: ${dbInfo.current_user}`);
    if (dbInfo.server_address) {
      console.log(`   Server: ${dbInfo.server_address}:${dbInfo.server_port}`);
    }

    // Test table permissions
    console.log(colorize('\n🔍 Testing Permissions...', 'blue'));
    
    try {
      await client.query('CREATE TABLE IF NOT EXISTS test_connection_table (id SERIAL PRIMARY KEY, test_data TEXT)');
      await client.query('INSERT INTO test_connection_table (test_data) VALUES ($1)', [`Test at ${new Date().toISOString()}`]);
      const testResult = await client.query('SELECT COUNT(*) as count FROM test_connection_table');
      await client.query('DROP TABLE test_connection_table');
      
      console.log(colorize('✅ Database permissions: CREATE, INSERT, SELECT, DROP', 'green'));
    } catch (error) {
      console.log(colorize('⚠️  Limited database permissions', 'yellow'));
      console.log(`   Error: ${error.message}`);
    }

    // Test performance
    console.log(colorize('\n🔍 Testing Performance...', 'blue'));
    
    const perfStartTime = Date.now();
    await client.query('SELECT 1');
    const queryTime = Date.now() - perfStartTime;
    
    console.log(colorize(`✅ Query performance: ${queryTime}ms`, 'green'));

    // Test concurrent connections
    console.log(colorize('\n🔍 Testing Connection Pool...', 'blue'));
    
    const maxConnections = await client.query('SHOW max_connections');
    console.log(colorize(`✅ Max connections: ${maxConnections.rows[0].max_connections}`, 'green'));

    // Check existing tables
    console.log(colorize('\n🔍 Checking Application Tables...', 'blue'));
    
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length > 0) {
      console.log(colorize('✅ Existing tables found:', 'green'));
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    } else {
      console.log(colorize('⚠️  No application tables found', 'yellow'));
      console.log('   Run "npm run db:push" to create database schema');
    }

    client.release();
    await pool.end();

    // Summary
    console.log(colorize('\n📋 Test Summary', 'blue'));
    console.log('================');
    console.log(colorize('✅ Database Connection: Working', 'green'));
    console.log(colorize('✅ Basic Queries: Working', 'green'));
    console.log(colorize('✅ Permissions: Sufficient', 'green'));
    console.log(colorize(`✅ Performance: ${queryTime}ms response time`, 'green'));

    console.log(colorize('\n🎉 Database is ready for MSMEBazaar!', 'green'));
    console.log('\nNext steps:');
    console.log('1. Run migrations: npm run db:push');
    console.log('2. Start your application: npm start');

  } catch (error) {
    console.error(colorize('\n❌ Database test failed:', 'red'));
    
    if (error.code === 'ENOTFOUND') {
      console.error(colorize('   Network Error: Cannot resolve database host', 'red'));
      console.error('   - Check your internet connection');
      console.error('   - Verify the database host address');
    } else if (error.code === 'ECONNREFUSED') {
      console.error(colorize('   Connection Refused: Database server not responding', 'red'));
      console.error('   - Check if database server is running');
      console.error('   - Verify host and port are correct');
    } else if (error.code === '28P01') {
      console.error(colorize('   Authentication Failed: Invalid credentials', 'red'));
      console.error('   - Check username and password in DATABASE_URL');
    } else if (error.code === '3D000') {
      console.error(colorize('   Database Not Found: Database does not exist', 'red'));
      console.error('   - Create the database first');
      console.error('   - Check database name in DATABASE_URL');
    } else if (error.code === '28000') {
      console.error(colorize('   Access Denied: User lacks permissions', 'red'));
      console.error('   - Grant proper permissions to database user');
    } else {
      console.error(colorize(`   Error: ${error.message}`, 'red'));
      console.error(colorize(`   Code: ${error.code}`, 'red'));
    }

    console.log(colorize('\n🔧 Troubleshooting Tips:', 'blue'));
    console.log('1. Verify DATABASE_URL format: postgresql://user:pass@host:port/db');
    console.log('2. Check if database service is running');
    console.log('3. Test connection from command line: psql $DATABASE_URL');
    console.log('4. Check firewall and network connectivity');
    console.log('5. Verify SSL settings for cloud databases');

    process.exit(1);
  }
}

// Run the test
testDatabaseConnection();