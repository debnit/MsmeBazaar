#!/usr/bin/env node

/**
 * 🔍 Server Verification Script
 * Tests all critical endpoints and services after server startup
 */

import http from 'http';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

class ServerVerifier {
  constructor(baseUrl = 'http://localhost:5000') {
    this.baseUrl = baseUrl;
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  // Make HTTP request with timeout
  async makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}${path}`;
      const timeout = options.timeout || 5000;
      
      const req = http.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data,
            success: res.statusCode >= 200 && res.statusCode < 300
          });
        });
      });

      req.setTimeout(timeout, () => {
        req.destroy();
        reject(new Error(`Request timeout after ${timeout}ms`));
      });

      req.on('error', reject);
    });
  }

  // Run a single test
  async runTest(name, testFn) {
    console.log(`🧪 Testing: ${name}`);
    try {
      const result = await testFn();
      if (result.success) {
        console.log(`✅ PASS: ${name}`);
        this.results.passed++;
      } else {
        console.log(`❌ FAIL: ${name} - ${result.message}`);
        this.results.failed++;
      }
      this.results.tests.push({ name, ...result });
    } catch (error) {
      console.log(`❌ ERROR: ${name} - ${error.message}`);
      this.results.failed++;
      this.results.tests.push({ 
        name, 
        success: false, 
        message: error.message,
        error: true 
      });
    }
  }

  // Test health check endpoint
  async testHealthCheck() {
    return this.runTest('Health Check Endpoint', async () => {
      const response = await this.makeRequest('/health');
      return {
        success: response.success && response.statusCode === 200,
        message: response.success ? 'Health check passed' : `Status: ${response.statusCode}`,
        statusCode: response.statusCode,
        data: response.data
      };
    });
  }

  // Test API status endpoint
  async testApiStatus() {
    return this.runTest('API Status Endpoint', async () => {
      const response = await this.makeRequest('/api/status');
      return {
        success: response.success,
        message: response.success ? 'API status accessible' : `Status: ${response.statusCode}`,
        statusCode: response.statusCode
      };
    });
  }

  // Test database connectivity (through API)
  async testDatabaseConnectivity() {
    return this.runTest('Database Connectivity', async () => {
      const response = await this.makeRequest('/api/health/db');
      return {
        success: response.success,
        message: response.success ? 'Database connection healthy' : `Database check failed: ${response.statusCode}`,
        statusCode: response.statusCode,
        data: response.data
      };
    });
  }

  // Test authentication endpoints
  async testAuthEndpoints() {
    return this.runTest('Authentication Endpoints', async () => {
      // Test if auth endpoints are accessible (should return 401 or proper error)
      const response = await this.makeRequest('/api/auth/me');
      return {
        success: response.statusCode === 401 || response.statusCode === 200,
        message: response.statusCode === 401 ? 
          'Auth endpoint properly protected' : 
          `Unexpected auth response: ${response.statusCode}`,
        statusCode: response.statusCode
      };
    });
  }

  // Test static file serving
  async testStaticFiles() {
    return this.runTest('Static File Serving', async () => {
      const response = await this.makeRequest('/');
      return {
        success: response.success && response.data.includes('<html'),
        message: response.success && response.data.includes('<html') ? 
          'Static files served correctly' : 
          'Static file serving issue',
        statusCode: response.statusCode
      };
    });
  }

  // Test API documentation
  async testApiDocs() {
    return this.runTest('API Documentation', async () => {
      const response = await this.makeRequest('/docs');
      return {
        success: response.statusCode === 200 || response.statusCode === 302,
        message: response.success ? 'API docs accessible' : `Docs not available: ${response.statusCode}`,
        statusCode: response.statusCode
      };
    });
  }

  // Wait for server to be ready
  async waitForServer(maxAttempts = 10) {
    console.log('🔄 Waiting for server to be ready...');
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.makeRequest('/health', { timeout: 2000 });
        if (response.success) {
          console.log('✅ Server is ready!');
          return true;
        }
      } catch (error) {
        console.log(`⏳ Attempt ${attempt}/${maxAttempts} - Server not ready yet...`);
      }
      
      if (attempt < maxAttempts) {
        await sleep(2000); // Wait 2 seconds between attempts
      }
    }
    
    throw new Error('Server failed to start within timeout period');
  }

  // Run all verification tests
  async runAllTests() {
    console.log('🚀 Starting Server Verification Tests...\n');
    
    try {
      // Wait for server to be ready
      await this.waitForServer();
      
      console.log('\n📋 Running comprehensive endpoint tests...\n');
      
      // Run all tests
      await this.testHealthCheck();
      await this.testApiStatus();
      await this.testDatabaseConnectivity();
      await this.testAuthEndpoints();
      await this.testStaticFiles();
      await this.testApiDocs();
      
      // Print summary
      this.printSummary();
      
    } catch (error) {
      console.log(`💥 Server verification failed: ${error.message}`);
      process.exit(1);
    }
  }

  // Print test results summary
  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 SERVER VERIFICATION SUMMARY');
    console.log('='.repeat(50));
    
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📊 Total:  ${this.results.passed + this.results.failed}`);
    
    if (this.results.failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Server is fully operational.');
    } else {
      console.log('\n⚠️  Some tests failed. Check the details above.');
      
      // List failed tests
      const failedTests = this.results.tests.filter(test => !test.success);
      if (failedTests.length > 0) {
        console.log('\n❌ Failed Tests:');
        failedTests.forEach(test => {
          console.log(`   - ${test.name}: ${test.message}`);
        });
      }
    }
    
    console.log('='.repeat(50));
    
    // Exit with appropriate code
    process.exit(this.results.failed === 0 ? 0 : 1);
  }
}

// Run verification if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const verifier = new ServerVerifier();
  verifier.runAllTests().catch(console.error);
}

export default ServerVerifier;