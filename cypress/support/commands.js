// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// -- Custom Commands for MSMEBazaar Testing --

/**
 * Login command for MSMEBazaar authentication
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {Object} options - Additional options
 */
Cypress.Commands.add('login', (email, password, options = {}) => {
  const { remember = false, redirect = '/dashboard' } = options;
  
  cy.visit('/login');
  cy.get('[data-cy=email-input]').type(email);
  cy.get('[data-cy=password-input]').type(password);
  
  if (remember) {
    cy.get('[data-cy=remember-checkbox]').check();
  }
  
  cy.get('[data-cy=login-button]').click();
  
  // Wait for redirect
  cy.url().should('include', redirect);
  cy.get('[data-cy=user-avatar]').should('be.visible');
});

/**
 * Logout command
 */
Cypress.Commands.add('logout', () => {
  cy.get('[data-cy=user-menu]').click();
  cy.get('[data-cy=logout-button]').click();
  cy.url().should('include', '/login');
});

/**
 * Navigate to specific section of the application
 * @param {string} section - The section to navigate to
 */
Cypress.Commands.add('navigateTo', (section) => {
  const routes = {
    dashboard: '/dashboard',
    products: '/products',
    services: '/services',
    recommendations: '/recommendations',
    profile: '/profile',
    settings: '/settings',
    analytics: '/analytics'
  };
  
  if (routes[section]) {
    cy.visit(routes[section]);
  } else {
    throw new Error(`Unknown section: ${section}`);
  }
});

/**
 * Search for products or services
 * @param {string} query - Search query
 * @param {Object} options - Search options
 */
Cypress.Commands.add('search', (query, options = {}) => {
  const { category = 'all', location = 'all', priceRange = 'all' } = options;
  
  cy.get('[data-cy=search-input]').type(query);
  
  if (category !== 'all') {
    cy.get('[data-cy=category-filter]').select(category);
  }
  
  if (location !== 'all') {
    cy.get('[data-cy=location-filter]').select(location);
  }
  
  if (priceRange !== 'all') {
    cy.get('[data-cy=price-filter]').select(priceRange);
  }
  
  cy.get('[data-cy=search-button]').click();
  cy.get('[data-cy=search-results]').should('be.visible');
});

/**
 * Add item to favorites/wishlist
 * @param {number} itemId - Item ID to add to favorites
 */
Cypress.Commands.add('addToFavorites', (itemId) => {
  cy.get(`[data-cy=item-${itemId}]`).within(() => {
    cy.get('[data-cy=favorite-button]').click();
  });
  
  // Verify the item was added
  cy.get(`[data-cy=item-${itemId}] [data-cy=favorite-button]`)
    .should('have.class', 'favorited');
});

/**
 * Provide feedback on recommendations
 * @param {number} recommendationId - Recommendation ID
 * @param {string} feedback - 'like' or 'dislike'
 * @param {string} reason - Optional reason for feedback
 */
Cypress.Commands.add('provideFeedback', (recommendationId, feedback, reason = '') => {
  cy.get(`[data-cy=recommendation-${recommendationId}]`).within(() => {
    cy.get(`[data-cy=${feedback}-button]`).click();
    
    if (reason) {
      cy.get('[data-cy=feedback-reason]').type(reason);
      cy.get('[data-cy=submit-feedback]').click();
    }
  });
  
  // Verify feedback was recorded
  cy.get(`[data-cy=recommendation-${recommendationId}] [data-cy=${feedback}-button]`)
    .should('have.class', 'active');
});

/**
 * Wait for recommendations to load
 * @param {number} timeout - Timeout in milliseconds
 */
Cypress.Commands.add('waitForRecommendations', (timeout = 10000) => {
  cy.get('[data-cy=recommendations-container]', { timeout })
    .should('be.visible')
    .and('not.have.class', 'loading');
  
  cy.get('[data-cy=recommendation-item]').should('have.length.greaterThan', 0);
});

/**
 * Test responsive behavior
 * @param {Array} viewports - Array of viewport sizes to test
 * @param {Function} testFn - Test function to run for each viewport
 */
Cypress.Commands.add('testResponsive', (viewports, testFn) => {
  viewports.forEach(viewport => {
    cy.viewport(viewport.width, viewport.height);
    cy.log(`Testing viewport: ${viewport.width}x${viewport.height}`);
    testFn(viewport);
  });
});

/**
 * Check accessibility compliance
 * @param {Object} options - Accessibility check options
 */
Cypress.Commands.add('checkA11y', (options = {}) => {
  const defaultOptions = {
    tags: ['wcag2a', 'wcag2aa'],
    includedImpacts: ['minor', 'moderate', 'serious', 'critical']
  };
  
  const checkOptions = { ...defaultOptions, ...options };
  
  // This would integrate with cypress-axe if installed
  // cy.injectAxe();
  // cy.checkA11y(null, checkOptions);
  
  // For now, perform basic accessibility checks
  cy.get('img').each($img => {
    expect($img).to.have.attr('alt');
  });
  
  cy.get('button, input, select, textarea').each($el => {
    const hasLabel = $el.attr('aria-label') || 
                    $el.attr('aria-labelledby') || 
                    $el.closest('label').length > 0;
    expect(hasLabel).to.be.true;
  });
});

/**
 * Mock API responses for testing
 * @param {string} endpoint - API endpoint to mock
 * @param {Object} response - Mock response data
 * @param {number} statusCode - HTTP status code
 */
Cypress.Commands.add('mockAPI', (endpoint, response, statusCode = 200) => {
  cy.intercept('GET', endpoint, {
    statusCode,
    body: response
  }).as(`mock${endpoint.replace(/[^a-zA-Z0-9]/g, '')}`);
});

/**
 * Wait for ML model predictions to load
 * @param {number} timeout - Timeout in milliseconds
 */
Cypress.Commands.add('waitForMLPredictions', (timeout = 15000) => {
  cy.get('[data-cy=ml-predictions]', { timeout })
    .should('be.visible')
    .and('not.have.class', 'loading');
  
  // Verify predictions are displayed
  cy.get('[data-cy=prediction-item]').should('have.length.greaterThan', 0);
});

/**
 * Simulate user interaction patterns for recommendation testing
 * @param {Array} interactions - Array of user interactions
 */
Cypress.Commands.add('simulateUserBehavior', (interactions) => {
  interactions.forEach(interaction => {
    switch (interaction.type) {
      case 'view':
        cy.get(`[data-cy=item-${interaction.itemId}]`).scrollIntoView();
        cy.wait(interaction.duration || 2000);
        break;
      case 'click':
        cy.get(`[data-cy=item-${interaction.itemId}]`).click();
        break;
      case 'search':
        cy.search(interaction.query, interaction.options);
        break;
      case 'filter':
        cy.get(`[data-cy=${interaction.filter}-filter]`).select(interaction.value);
        break;
      default:
        cy.log(`Unknown interaction type: ${interaction.type}`);
    }
  });
});

// -- Overwrite existing commands for better cursor tracking --

/**
 * Enhanced click command with cursor tracking
 */
Cypress.Commands.overwrite('click', (originalFn, element, options) => {
  // Log the click action for cursor tracking
  cy.log('Clicking element');
  
  return originalFn(element, options);
});

/**
 * Enhanced type command with cursor tracking
 */
Cypress.Commands.overwrite('type', (originalFn, element, text, options) => {
  // Log the type action for cursor tracking
  cy.log(`Typing: ${text}`);
  
  return originalFn(element, text, options);
});

/**
 * Enhanced hover command with cursor tracking
 */
Cypress.Commands.overwrite('hover', (originalFn, element, options) => {
  // Log the hover action for cursor tracking
  cy.log('Hovering over element');
  
  return originalFn(element, options);
});

// -- Type definitions for TypeScript support --

// Uncomment if using TypeScript
/*
declare namespace Cypress {
  interface Chainable {
    login(email: string, password: string, options?: { remember?: boolean; redirect?: string }): Chainable<Element>
    logout(): Chainable<Element>
    navigateTo(section: string): Chainable<Element>
    search(query: string, options?: { category?: string; location?: string; priceRange?: string }): Chainable<Element>
    addToFavorites(itemId: number): Chainable<Element>
    provideFeedback(recommendationId: number, feedback: 'like' | 'dislike', reason?: string): Chainable<Element>
    waitForRecommendations(timeout?: number): Chainable<Element>
    testResponsive(viewports: Array<{width: number, height: number}>, testFn: Function): Chainable<Element>
    checkA11y(options?: Object): Chainable<Element>
    mockAPI(endpoint: string, response: Object, statusCode?: number): Chainable<Element>
    waitForMLPredictions(timeout?: number): Chainable<Element>
    simulateUserBehavior(interactions: Array<Object>): Chainable<Element>
  }
}
*/