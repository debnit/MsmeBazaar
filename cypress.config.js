const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    // Base URL for the application under test
    baseUrl: 'http://localhost:3000',
    
    // Environment variables
    env: {
      // Enable the Cursor AI visual overlay plugin
      cursorAI: true,
      
      // Cursor AI configuration options
      cursorAI_showTrail: true,        // Show cursor trail (default: true)
      cursorAI_showLabels: true,       // Show action labels (default: true)
      cursorAI_cursorSize: 24,         // Cursor size in pixels (default: 24)
      cursorAI_trailLength: 3,         // Number of trail elements (default: 3)
      
      // Application-specific environment variables
      apiUrl: 'http://localhost:8000',
      mlApiUrl: 'http://localhost:8001',
      
      // Test user credentials (use environment variables in CI)
      testUser: {
        email: 'test@msmebazaar.com',
        password: 'testpassword123'
      },
      
      // Feature flags for testing
      enableRecommendations: true,
      enableMLPredictions: true,
      enableAnalytics: true
    },
    
    // Test files pattern
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    
    // Support file
    supportFile: 'cypress/support/e2e.js',
    
    // Viewport settings
    viewportWidth: 1280,
    viewportHeight: 720,
    
    // Video recording settings
    video: true,
    videoCompression: 32,
    videosFolder: 'cypress/videos',
    
    // Screenshot settings
    screenshotOnRunFailure: true,
    screenshotsFolder: 'cypress/screenshots',
    
    // Timeouts
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    pageLoadTimeout: 60000,
    
    // Test isolation
    testIsolation: true,
    
    // Browser settings
    chromeWebSecurity: false,
    
    // Retry settings
    retries: {
      runMode: 2,
      openMode: 0
    },
    
    // Node event listeners
    setupNodeEvents(on, config) {
      // implement node event listeners here
      
      // Task for custom logging
      on('task', {
        log(message) {
          console.log(message);
          return null;
        },
        
        // Task for database seeding/cleanup
        seedDatabase() {
          // Add database seeding logic here
          console.log('Seeding test database...');
          return null;
        },
        
        // Task for clearing test data
        clearDatabase() {
          // Add database cleanup logic here
          console.log('Clearing test database...');
          return null;
        }
      });
      
      // Before run hook
      on('before:run', (details) => {
        console.log('Starting Cypress tests with Cursor AI enabled');
        return null;
      });
      
      // After run hook
      on('after:run', (results) => {
        console.log('Cypress tests completed');
        return null;
      });
      
      // Configure environment variables based on CI/CD environment
      if (config.env.CI) {
        // CI-specific configuration
        config.video = true;
        config.screenshotOnRunFailure = true;
        configcd.cursorAI = true; // Always enable cursor overlay in CI
      }
      
      return config;
    },
  },
  
  // Component testing configuration (if needed)
  component: {
    devServer: {
      framework: 'react',
      bundler: 'webpack',
    },
    
    // Component test files pattern
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    
    // Support file for component tests
    supportFile: 'cypress/support/component.js',
    
    // Environment variables for component tests
    env: {
      cursorAI: false, // Disable cursor overlay for component tests
    }
  },
  
  // Reporter configuration
  reporter: 'spec',
  reporterOptions: {
    // Add reporter options here
  },
  
  // Additional configuration
  watchForFileChanges: false,
  numTestsKeptInMemory: 50,
  
  // Experimental features
  experimentalStudio: false,
  experimentalWebKitSupport: false,
  
  // Include/exclude patterns
  excludeSpecPattern: [
    '**/*.skip.cy.{js,jsx,ts,tsx}',
    '**/examples/**/*'
  ],
  
  // File server options
  fileServerFolder: '.',
  fixturesFolder: 'cypress/fixtures',
  
  // Download settings
  downloadsFolder: 'cypress/downloads',
  
  // User agent override
  userAgent: 'MSMEBazaar-Cypress-Tests/1.0.0',
  
  // Additional browser launch arguments
  browsers: [
    {
      name: 'chrome',
      family: 'chromium',
      channel: 'stable',
      displayName: 'Chrome',
      version: '',
      path: '',
      majorVersion: ''
    }
  ]
});