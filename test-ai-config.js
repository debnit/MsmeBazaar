#!/usr/bin/env node

/**
 * 🧪 AI Configuration Test Script
 * 
 * This script tests your OpenAI and Pinecone API configurations
 * to ensure they're working properly.
 */

import fs from 'fs';
import path from 'path';
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
    throw new Error('.env file not found. Please run setup-ai.js first.');
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

async function testOpenAI() {
  console.log(colorize('\n🔍 Testing OpenAI Configuration...', 'blue'));
  
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.log(colorize('❌ OpenAI API key not found', 'red'));
    return false;
  }

  if (!apiKey.startsWith('sk-')) {
    console.log(colorize('⚠️  OpenAI API key format may be incorrect (should start with sk-)', 'yellow'));
  }

  try {
    // Test API key by making a simple request
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      console.log(colorize('✅ OpenAI API key is valid and working', 'green'));
      const data = await response.json();
      const modelCount = data.data ? data.data.length : 0;
      console.log(colorize(`   📊 Available models: ${modelCount}`, 'cyan'));
      
      // Check for specific models
      if (data.data) {
        const hasGPT4 = data.data.some(model => model.id.includes('gpt-4'));
        const hasGPT35 = data.data.some(model => model.id.includes('gpt-3.5'));
        
        if (hasGPT4) console.log(colorize('   ✅ GPT-4 models available', 'green'));
        if (hasGPT35) console.log(colorize('   ✅ GPT-3.5 models available', 'green'));
      }
      
      return true;
    } else {
      const error = await response.text();
      console.log(colorize(`❌ OpenAI API key test failed: ${response.status}`, 'red'));
      console.log(colorize(`   Error: ${error}`, 'red'));
      return false;
    }
  } catch (error) {
    console.log(colorize(`❌ OpenAI API test failed: ${error.message}`, 'red'));
    return false;
  }
}

async function testPinecone() {
  console.log(colorize('\n🔍 Testing Pinecone Configuration...', 'blue'));
  
  const apiKey = process.env.PINECONE_API_KEY;
  const environment = process.env.PINECONE_ENVIRONMENT || 'us-east1-gcp';
  
  if (!apiKey) {
    console.log(colorize('❌ Pinecone API key not found', 'red'));
    return false;
  }

  try {
    // Test Pinecone API connection
    const response = await fetch(`https://controller.${environment}.pinecone.io/databases`, {
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      console.log(colorize('✅ Pinecone API key is valid and working', 'green'));
      const data = await response.json();
      
      if (data && Array.isArray(data)) {
        console.log(colorize(`   📊 Available indexes: ${data.length}`, 'cyan'));
        
        const indexName = process.env.PINECONE_INDEX_NAME || 'msmebazaar-vectors';
        const hasIndex = data.some(index => index.name === indexName);
        
        if (hasIndex) {
          console.log(colorize(`   ✅ Index "${indexName}" exists`, 'green'));
        } else {
          console.log(colorize(`   ⚠️  Index "${indexName}" not found`, 'yellow'));
          console.log(colorize(`   💡 You may need to create the index in Pinecone dashboard`, 'cyan'));
        }
      }
      
      return true;
    } else {
      const error = await response.text();
      console.log(colorize(`❌ Pinecone API test failed: ${response.status}`, 'red'));
      console.log(colorize(`   Error: ${error}`, 'red'));
      return false;
    }
  } catch (error) {
    console.log(colorize(`❌ Pinecone API test failed: ${error.message}`, 'red'));
    return false;
  }
}

async function testConfiguration() {
  console.log(colorize('\n🧪 AI Configuration Test', 'cyan'));
  console.log(colorize('========================\n', 'cyan'));

  try {
    // Load environment variables
    const envVars = await loadEnvVariables();
    console.log(colorize('✅ Environment variables loaded', 'green'));

    // Test OpenAI
    const openaiWorking = await testOpenAI();

    // Test Pinecone
    const pineconeWorking = await testPinecone();

    // Summary
    console.log(colorize('\n📋 Test Summary', 'blue'));
    console.log('================');
    
    if (openaiWorking) {
      console.log(colorize('✅ OpenAI: Ready for AI features', 'green'));
    } else {
      console.log(colorize('❌ OpenAI: Not configured or invalid', 'red'));
    }

    if (pineconeWorking) {
      console.log(colorize('✅ Pinecone: Ready for vector search', 'green'));
    } else {
      console.log(colorize('❌ Pinecone: Not configured or invalid', 'red'));
    }

    if (openaiWorking || pineconeWorking) {
      console.log(colorize('\n🎉 Some AI services are working!', 'green'));
      console.log('You can now start your application with: npm start');
    } else {
      console.log(colorize('\n⚠️  No AI services configured', 'yellow'));
      console.log('Run setup-ai.js to configure your API keys');
    }

    // Show enabled features
    console.log(colorize('\n🚀 Enabled Features:', 'blue'));
    
    if (openaiWorking) {
      console.log('  ✅ Smart Business Valuation');
      console.log('  ✅ AI-powered Matchmaking');
      console.log('  ✅ Smart Assistant Chat');
      console.log('  ✅ Document Analysis');
    }
    
    if (pineconeWorking) {
      console.log('  ✅ Semantic Search');
      console.log('  ✅ Vector-based Recommendations');
      console.log('  ✅ Knowledge Base Search');
    }

    if (!openaiWorking && !pineconeWorking) {
      console.log('  ⚪ All AI features disabled (app will still work)');
    }

  } catch (error) {
    console.error(colorize('\n❌ Test failed:', 'red'), error.message);
    process.exit(1);
  }
}

// Run the test
testConfiguration();