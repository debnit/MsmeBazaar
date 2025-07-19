// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Import the Cursor AI plugin for visual test cursor overlay
// This enhances test visibility for debugging and CI/CD video reviews
import './plugins/cursor.ai';

// Alternatively, you can use CommonJS syntax:
// require('./commands')
// require('./plugins/cursor.ai')

// Global configuration for better test stability
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false here prevents Cypress from failing the test
  // on uncaught exceptions from the application under test
  
  // You can customize this behavior based on your needs
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  
  if (err.message.includes('Non-Error promise rejection captured')) {
    return false;
  }
  
  // Let other exceptions fail the test
  return true;
});

// Configure viewport for consistent testing
beforeEach(() => {
  // Set consistent viewport for all tests
  cy.viewport(1280, 720);
  
  // Add custom commands or global setup here
  // For example, you might want to add authentication headers
  // or configure API interceptors
});

// Global cleanup after each test
afterEach(() => {
  // Clean up any test artifacts
  // This is handled automatically by the cursor.ai plugin
  // but you can add additional cleanup here if needed
});