#!/usr/bin/env node

/**
 * 🗄️ MSMEBazaar Database Setup Script
 * 
 * This script helps you configure PostgreSQL database
 * for the MSMEBazaar application with multiple options.
 */

import fs from 'fs';
import path from 'path';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

const databaseOptions = {
  local: {
    name: 'Local PostgreSQL',
    description: 'Install and run PostgreSQL on your local machine',
    cost: 'Free',
    complexity: 'Medium',
    bestFor: 'Development and testing'
  },
  docker: {
    name: 'Docker PostgreSQL',
    description: 'Run PostgreSQL in a Docker container',
    cost: 'Free',
    complexity: 'Easy',
    bestFor: 'Development and quick setup'
  },
  neon: {
    name: 'Neon (Serverless)',
    description: 'Serverless PostgreSQL with generous free tier',
    cost: 'Free tier: 0.5GB storage, 10GB transfer',
    complexity: 'Very Easy',
    bestFor: 'Production and development'
  },
  supabase: {
    name: 'Supabase',
    description: 'PostgreSQL with built-in features and dashboard',
    cost: 'Free tier: 500MB storage, 2GB transfer',
    complexity: 'Easy',
    bestFor: 'Full-stack applications'
  },
  railway: {
    name: 'Railway PostgreSQL',
    description: 'Simple PostgreSQL hosting with good free tier',
    cost: 'Free tier: $5/month credit',
    complexity: 'Easy',
    bestFor: 'Small to medium applications'
  },
  render: {
    name: 'Render PostgreSQL',
    description: 'Managed PostgreSQL on Render platform',
    cost: 'Starts at $7/month',
    complexity: 'Easy',
    bestFor: 'Production applications'
  }
};

async function main() {
  console.log(colorize('\n🗄️ MSMEBazaar Database Setup', 'cyan'));
  console.log(colorize('===============================\n', 'cyan'));

  console.log('This script will help you set up PostgreSQL for your MSMEBazaar application.');
  console.log('Choose the option that best fits your needs:\n');

  // Show database options
  let optionNumber = 1;
  const optionKeys = Object.keys(databaseOptions);
  
  for (const [key, option] of Object.entries(databaseOptions)) {
    console.log(colorize(`${optionNumber}. ${option.name}`, 'blue'));
    console.log(`   ${option.description}`);
    console.log(`   💰 Cost: ${option.cost}`);
    console.log(`   🔧 Complexity: ${option.complexity}`);
    console.log(`   🎯 Best for: ${option.bestFor}\n`);
    optionNumber++;
  }

  const choice = await question(colorize('Choose an option (1-6): ', 'yellow'));
  const choiceIndex = parseInt(choice) - 1;

  if (choiceIndex < 0 || choiceIndex >= optionKeys.length) {
    console.log(colorize('❌ Invalid choice. Exiting.', 'red'));
    rl.close();
    return;
  }

  const selectedOption = optionKeys[choiceIndex];
  console.log(colorize(`\n✅ You selected: ${databaseOptions[selectedOption].name}`, 'green'));

  switch (selectedOption) {
    case 'local':
      await setupLocalPostgreSQL();
      break;
    case 'docker':
      await setupDockerPostgreSQL();
      break;
    case 'neon':
      await setupNeonDatabase();
      break;
    case 'supabase':
      await setupSupabaseDatabase();
      break;
    case 'railway':
      await setupRailwayDatabase();
      break;
    case 'render':
      await setupRenderDatabase();
      break;
  }

  rl.close();
}

async function setupLocalPostgreSQL() {
  console.log(colorize('\n🔧 Setting up Local PostgreSQL', 'blue'));
  console.log('=====================================\n');

  // Check if PostgreSQL is installed
  try {
    await execAsync('psql --version');
    console.log(colorize('✅ PostgreSQL is already installed', 'green'));
  } catch (error) {
    console.log(colorize('❌ PostgreSQL is not installed', 'red'));
    console.log('\nInstallation instructions:');
    console.log(colorize('📦 Ubuntu/Debian:', 'blue'));
    console.log('   sudo apt update && sudo apt install postgresql postgresql-contrib');
    console.log(colorize('🍎 macOS:', 'blue'));
    console.log('   brew install postgresql');
    console.log(colorize('🪟 Windows:', 'blue'));
    console.log('   Download from: https://www.postgresql.org/download/windows/');
    
    const continueSetup = await question(colorize('\nDo you want to continue with configuration? (y/N): ', 'yellow'));
    if (!continueSetup.toLowerCase().startsWith('y')) {
      return;
    }
  }

  // Database configuration
  const dbName = await question(colorize('Database name [msmebazaar]: ', 'yellow')) || 'msmebazaar';
  const dbUser = await question(colorize('Database user [msmebazaar_user]: ', 'yellow')) || 'msmebazaar_user';
  const dbPassword = await question(colorize('Database password [secure_password]: ', 'yellow')) || 'secure_password';
  const dbHost = await question(colorize('Database host [localhost]: ', 'yellow')) || 'localhost';
  const dbPort = await question(colorize('Database port [5432]: ', 'yellow')) || '5432';

  const databaseUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;

  // Update .env file
  updateEnvVariable('DATABASE_URL', databaseUrl);

  console.log(colorize('\n📋 Next steps:', 'blue'));
  console.log('1. Start PostgreSQL service:');
  console.log('   sudo systemctl start postgresql  # Linux');
  console.log('   brew services start postgresql  # macOS');
  console.log('2. Create database and user:');
  console.log(`   sudo -u postgres createuser -P ${dbUser}`);
  console.log(`   sudo -u postgres createdb -O ${dbUser} ${dbName}`);
  console.log('3. Run database migrations:');
  console.log('   npm run db:push');
}

async function setupDockerPostgreSQL() {
  console.log(colorize('\n🐳 Setting up Docker PostgreSQL', 'blue'));
  console.log('=====================================\n');

  // Check if Docker is installed
  try {
    await execAsync('docker --version');
    console.log(colorize('✅ Docker is installed', 'green'));
  } catch (error) {
    console.log(colorize('❌ Docker is not installed', 'red'));
    console.log('Please install Docker first: https://docs.docker.com/get-docker/');
    return;
  }

  const dbName = await question(colorize('Database name [msmebazaar]: ', 'yellow')) || 'msmebazaar';
  const dbUser = await question(colorize('Database user [msmebazaar_user]: ', 'yellow')) || 'msmebazaar_user';
  const dbPassword = await question(colorize('Database password [secure_password]: ', 'yellow')) || 'secure_password';
  const dbPort = await question(colorize('Database port [5432]: ', 'yellow')) || '5432';

  const databaseUrl = `postgresql://${dbUser}:${dbPassword}@localhost:${dbPort}/${dbName}`;

  // Create docker-compose.db.yml
  const dockerComposeContent = `version: '3.8'
services:
  postgres:
    image: postgres:15
    container_name: msmebazaar-postgres
    environment:
      POSTGRES_DB: ${dbName}
      POSTGRES_USER: ${dbUser}
      POSTGRES_PASSWORD: ${dbPassword}
    ports:
      - "${dbPort}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${dbUser} -d ${dbName}"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
`;

  fs.writeFileSync('docker-compose.db.yml', dockerComposeContent);
  updateEnvVariable('DATABASE_URL', databaseUrl);

  console.log(colorize('\n✅ Docker configuration created!', 'green'));
  console.log(colorize('\n📋 Next steps:', 'blue'));
  console.log('1. Start the database:');
  console.log('   docker-compose -f docker-compose.db.yml up -d');
  console.log('2. Run database migrations:');
  console.log('   npm run db:push');
  console.log('3. Stop the database when done:');
  console.log('   docker-compose -f docker-compose.db.yml down');
}

async function setupNeonDatabase() {
  console.log(colorize('\n⚡ Setting up Neon Database', 'blue'));
  console.log('=====================================\n');

  console.log('Neon provides serverless PostgreSQL with a generous free tier.');
  console.log('Free tier includes: 0.5GB storage, 10GB transfer, branching\n');

  console.log(colorize('📋 Setup steps:', 'blue'));
  console.log('1. Go to https://neon.tech/');
  console.log('2. Sign up with GitHub (recommended)');
  console.log('3. Create a new project');
  console.log('4. Copy the connection string');
  console.log('5. Paste it below\n');

  const databaseUrl = await question(colorize('Paste your Neon connection string: ', 'yellow'));

  if (databaseUrl && databaseUrl.includes('neon.tech')) {
    updateEnvVariable('DATABASE_URL', databaseUrl);
    console.log(colorize('✅ Neon database configured!', 'green'));
    
    console.log(colorize('\n📋 Next steps:', 'blue'));
    console.log('1. Test connection: npm run test:db');
    console.log('2. Run migrations: npm run db:push');
    console.log('3. Your app is ready to use Neon!');
  } else {
    console.log(colorize('❌ Invalid Neon connection string', 'red'));
  }
}

async function setupSupabaseDatabase() {
  console.log(colorize('\n🚀 Setting up Supabase Database', 'blue'));
  console.log('=====================================\n');

  console.log('Supabase provides PostgreSQL with built-in auth, real-time, and storage.');
  console.log('Free tier includes: 500MB storage, 2GB transfer, real-time subscriptions\n');

  console.log(colorize('📋 Setup steps:', 'blue'));
  console.log('1. Go to https://supabase.com/');
  console.log('2. Sign up and create a new project');
  console.log('3. Go to Settings → Database');
  console.log('4. Copy the connection string (URI format)');
  console.log('5. Paste it below\n');

  const databaseUrl = await question(colorize('Paste your Supabase connection string: ', 'yellow'));

  if (databaseUrl && databaseUrl.includes('supabase')) {
    updateEnvVariable('DATABASE_URL', databaseUrl);
    console.log(colorize('✅ Supabase database configured!', 'green'));
    
    console.log(colorize('\n📋 Next steps:', 'blue'));
    console.log('1. Test connection: npm run test:db');
    console.log('2. Run migrations: npm run db:push');
    console.log('3. Access Supabase dashboard for additional features');
  } else {
    console.log(colorize('❌ Invalid Supabase connection string', 'red'));
  }
}

async function setupRailwayDatabase() {
  console.log(colorize('\n🚄 Setting up Railway Database', 'blue'));
  console.log('=====================================\n');

  console.log('Railway provides simple PostgreSQL hosting with $5/month free credits.');
  console.log('Perfect for small to medium applications.\n');

  console.log(colorize('📋 Setup steps:', 'blue'));
  console.log('1. Go to https://railway.app/');
  console.log('2. Sign up with GitHub');
  console.log('3. Create new project → Add PostgreSQL');
  console.log('4. Go to PostgreSQL service → Variables');
  console.log('5. Copy DATABASE_URL value');
  console.log('6. Paste it below\n');

  const databaseUrl = await question(colorize('Paste your Railway DATABASE_URL: ', 'yellow'));

  if (databaseUrl && (databaseUrl.includes('railway') || databaseUrl.includes('postgres'))) {
    updateEnvVariable('DATABASE_URL', databaseUrl);
    console.log(colorize('✅ Railway database configured!', 'green'));
    
    console.log(colorize('\n📋 Next steps:', 'blue'));
    console.log('1. Test connection: npm run test:db');
    console.log('2. Run migrations: npm run db:push');
    console.log('3. Monitor usage in Railway dashboard');
  } else {
    console.log(colorize('❌ Invalid Railway connection string', 'red'));
  }
}

async function setupRenderDatabase() {
  console.log(colorize('\n🎨 Setting up Render Database', 'blue'));
  console.log('=====================================\n');

  console.log('Render provides managed PostgreSQL starting at $7/month.');
  console.log('Great for production applications with automatic backups.\n');

  console.log(colorize('📋 Setup steps:', 'blue'));
  console.log('1. Go to https://render.com/');
  console.log('2. Sign up and create new PostgreSQL database');
  console.log('3. Copy the Internal Database URL');
  console.log('4. Paste it below\n');

  const databaseUrl = await question(colorize('Paste your Render DATABASE_URL: ', 'yellow'));

  if (databaseUrl && (databaseUrl.includes('render') || databaseUrl.includes('postgres'))) {
    updateEnvVariable('DATABASE_URL', databaseUrl);
    console.log(colorize('✅ Render database configured!', 'green'));
    
    console.log(colorize('\n📋 Next steps:', 'blue'));
    console.log('1. Test connection: npm run test:db');
    console.log('2. Run migrations: npm run db:push');
    console.log('3. Configure automatic backups in Render dashboard');
  } else {
    console.log(colorize('❌ Invalid Render connection string', 'red'));
  }
}

function updateEnvVariable(key, value) {
  const envPath = path.join(__dirname, '.env');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  const regex = new RegExp(`^${key}=.*$`, 'm');
  const newLine = `${key}=${value}`;
  
  if (regex.test(envContent)) {
    envContent = envContent.replace(regex, newLine);
  } else {
    envContent += `\n${newLine}\n`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log(colorize(`✅ Updated ${key} in .env file`, 'green'));
}

// Handle errors
process.on('SIGINT', () => {
  console.log(colorize('\n\n👋 Setup cancelled by user', 'yellow'));
  rl.close();
  process.exit(0);
});

// Run the script
main().catch(error => {
  console.error(colorize('\n❌ Setup failed:', 'red'), error.message);
  rl.close();
  process.exit(1);
});