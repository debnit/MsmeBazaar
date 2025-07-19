describe('MSMEBazaar Critical User Journeys', () => {
  beforeEach(() => {
    // Set up test environment
    cy.visit('/');
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  describe('User Authentication Flow', () => {
    it('should allow user registration with complete profile', () => {
      cy.visit('/auth/register');
      
      // Fill registration form
      cy.get('[data-testid="company-name"]').type('Test MSME Company');
      cy.get('[data-testid="email"]').type('test@msmebazaar.com');
      cy.get('[data-testid="password"]').type('SecurePassword123!');
      cy.get('[data-testid="confirm-password"]').type('SecurePassword123!');
      cy.get('[data-testid="business-type"]').select('Manufacturing');
      cy.get('[data-testid="industry"]').select('Technology');
      cy.get('[data-testid="phone"]').type('+919876543210');
      cy.get('[data-testid="city"]').type('Bhubaneswar');
      cy.get('[data-testid="state"]').select('Odisha');
      
      // Accept terms
      cy.get('[data-testid="accept-terms"]').check();
      
      // Submit registration
      cy.get('[data-testid="register-button"]').click();
      
      // Verify OTP screen appears
      cy.get('[data-testid="otp-verification"]').should('be.visible');
      cy.contains('We have sent an OTP to your phone number').should('be.visible');
      
      // Mock OTP verification
      cy.get('[data-testid="otp-input"]').type('123456');
      cy.get('[data-testid="verify-otp"]').click();
      
      // Should redirect to dashboard
      cy.url().should('include', '/dashboard');
      cy.get('[data-testid="welcome-message"]').should('contain', 'Welcome to MSMEBazaar');
    });

    it('should handle login with email and password', () => {
      cy.visit('/auth/login');
      
      cy.get('[data-testid="email"]').type('test@msmebazaar.com');
      cy.get('[data-testid="password"]').type('SecurePassword123!');
      cy.get('[data-testid="remember-me"]').check();
      cy.get('[data-testid="login-button"]').click();
      
      // Should redirect to dashboard
      cy.url().should('include', '/dashboard');
      cy.get('[data-testid="user-profile"]').should('be.visible');
    });

    it('should handle forgot password flow', () => {
      cy.visit('/auth/login');
      cy.get('[data-testid="forgot-password"]').click();
      
      cy.url().should('include', '/auth/forgot-password');
      cy.get('[data-testid="email"]').type('test@msmebazaar.com');
      cy.get('[data-testid="reset-password"]').click();
      
      cy.get('[data-testid="success-message"]').should('contain', 'Password reset link sent');
    });

    it('should logout successfully', () => {
      // Login first
      cy.login('test@msmebazaar.com', 'SecurePassword123!');
      
      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="logout"]').click();
      
      // Should redirect to landing page
      cy.url().should('eq', Cypress.config().baseUrl + '/');
      cy.get('[data-testid="login-button"]').should('be.visible');
    });
  });

  describe('MSME Listing and Management', () => {
    beforeEach(() => {
      cy.login('test@msmebazaar.com', 'SecurePassword123!');
    });

    it('should create a new MSME listing', () => {
      cy.visit('/seller/create-listing');
      
      // Fill MSME details
      cy.get('[data-testid="company-name"]').type('TechStart Manufacturing');
      cy.get('[data-testid="business-type"]').select('Manufacturing');
      cy.get('[data-testid="industry"]').select('Electronics');
      cy.get('[data-testid="sub-industry"]').type('Consumer Electronics');
      cy.get('[data-testid="description"]').type('Leading manufacturer of smart home devices and IoT solutions');
      
      // Financial details
      cy.get('[data-testid="annual-revenue"]').type('50000000');
      cy.get('[data-testid="employee-count"]').type('150');
      cy.get('[data-testid="establishment-year"]').type('2015');
      cy.get('[data-testid="asking-price"]').type('200000000');
      
      // Location details
      cy.get('[data-testid="address"]').type('Technology Park, Infocity');
      cy.get('[data-testid="city"]').type('Bhubaneswar');
      cy.get('[data-testid="state"]').select('Odisha');
      cy.get('[data-testid="pincode"]').type('751024');
      
      // Upload documents
      cy.get('[data-testid="file-upload-gst"]').selectFile('cypress/fixtures/sample-gst.pdf');
      cy.get('[data-testid="file-upload-financials"]').selectFile('cypress/fixtures/sample-financials.pdf');
      cy.get('[data-testid="file-upload-registration"]').selectFile('cypress/fixtures/sample-registration.pdf');
      
      // Submit listing
      cy.get('[data-testid="submit-listing"]').click();
      
      // Verify success
      cy.get('[data-testid="success-message"]').should('contain', 'MSME listing created successfully');
      cy.url().should('include', '/seller/dashboard');
      
      // Verify listing appears in dashboard
      cy.get('[data-testid="listing-card"]').should('contain', 'TechStart Manufacturing');
      cy.get('[data-testid="listing-status"]').should('contain', 'Under Review');
    });

    it('should edit an existing MSME listing', () => {
      cy.visit('/seller/dashboard');
      
      // Click edit on first listing
      cy.get('[data-testid="edit-listing"]').first().click();
      
      // Update description
      cy.get('[data-testid="description"]').clear().type('Updated: Leading manufacturer of smart home devices and IoT solutions with global reach');
      cy.get('[data-testid="annual-revenue"]').clear().type('75000000');
      
      // Save changes
      cy.get('[data-testid="save-changes"]').click();
      
      // Verify success
      cy.get('[data-testid="success-message"]').should('contain', 'Listing updated successfully');
    });

    it('should handle document upload and management', () => {
      cy.visit('/seller/dashboard');
      cy.get('[data-testid="manage-documents"]').first().click();
      
      // Upload additional document
      cy.get('[data-testid="add-document"]').click();
      cy.get('[data-testid="document-type"]').select('License');
      cy.get('[data-testid="file-upload"]').selectFile('cypress/fixtures/sample-license.pdf');
      cy.get('[data-testid="upload-document"]').click();
      
      // Verify document appears
      cy.get('[data-testid="document-list"]').should('contain', 'License');
      
      // Delete document
      cy.get('[data-testid="delete-document"]').last().click();
      cy.get('[data-testid="confirm-delete"]').click();
      
      cy.get('[data-testid="success-message"]').should('contain', 'Document deleted successfully');
    });
  });

  describe('Business Discovery and Search', () => {
    it('should search and filter MSME listings', () => {
      cy.visit('/buyer/browse');
      
      // Use search functionality
      cy.get('[data-testid="search-input"]').type('manufacturing');
      cy.get('[data-testid="search-button"]').click();
      
      // Apply filters
      cy.get('[data-testid="industry-filter"]').select('Manufacturing');
      cy.get('[data-testid="location-filter"]').select('Odisha');
      cy.get('[data-testid="revenue-min"]').type('10000000');
      cy.get('[data-testid="revenue-max"]').type('100000000');
      cy.get('[data-testid="apply-filters"]').click();
      
      // Verify results
      cy.get('[data-testid="listing-results"]').should('be.visible');
      cy.get('[data-testid="listing-card"]').should('have.length.at.least', 1);
      
      // Click on a listing to view details
      cy.get('[data-testid="view-details"]').first().click();
      
      // Verify detail page
      cy.url().should('include', '/listing/');
      cy.get('[data-testid="listing-details"]').should('be.visible');
      cy.get('[data-testid="contact-seller"]').should('be.visible');
    });

    it('should handle advanced search with multiple criteria', () => {
      cy.visit('/buyer/browse');
      
      // Open advanced search
      cy.get('[data-testid="advanced-search"]').click();
      
      // Set multiple criteria
      cy.get('[data-testid="business-type"]').select('Manufacturing');
      cy.get('[data-testid="employee-range"]').select('100-500');
      cy.get('[data-testid="establishment-year-min"]').type('2010');
      cy.get('[data-testid="certification"]').select('ISO 9001');
      
      cy.get('[data-testid="search-advanced"]').click();
      
      // Verify filtered results
      cy.get('[data-testid="results-count"]').should('be.visible');
      cy.get('[data-testid="filter-tags"]').should('contain', 'Manufacturing');
    });

    it('should save and manage favorite listings', () => {
      cy.login('test@msmebazaar.com', 'SecurePassword123!');
      cy.visit('/buyer/browse');
      
      // Add to favorites
      cy.get('[data-testid="favorite-button"]').first().click();
      cy.get('[data-testid="success-message"]').should('contain', 'Added to favorites');
      
      // View favorites
      cy.visit('/buyer/favorites');
      cy.get('[data-testid="favorite-listings"]').should('have.length.at.least', 1);
      
      // Remove from favorites
      cy.get('[data-testid="remove-favorite"]').first().click();
      cy.get('[data-testid="confirm-remove"]').click();
      cy.get('[data-testid="success-message"]').should('contain', 'Removed from favorites');
    });
  });

  describe('Business Valuation Process', () => {
    beforeEach(() => {
      cy.login('test@msmebazaar.com', 'SecurePassword123!');
    });

    it('should request business valuation', () => {
      cy.visit('/valuation/request');
      
      // Fill valuation request form
      cy.get('[data-testid="msme-select"]').select('TechStart Manufacturing');
      cy.get('[data-testid="valuation-purpose"]').select('Sale');
      cy.get('[data-testid="urgency"]').select('Standard');
      cy.get('[data-testid="additional-info"]').type('Planning to sell the business to strategic investor');
      
      // Upload required documents
      cy.get('[data-testid="upload-financials"]').selectFile('cypress/fixtures/financial-statements.pdf');
      cy.get('[data-testid="upload-tax-returns"]').selectFile('cypress/fixtures/tax-returns.pdf');
      cy.get('[data-testid="upload-asset-list"]').selectFile('cypress/fixtures/asset-list.pdf');
      
      // Submit request
      cy.get('[data-testid="submit-request"]').click();
      
      // Verify confirmation
      cy.get('[data-testid="confirmation-message"]').should('contain', 'Valuation request submitted');
      cy.get('[data-testid="request-id"]').should('be.visible');
      
      // Verify request appears in dashboard
      cy.visit('/dashboard');
      cy.get('[data-testid="valuation-requests"]').should('contain', 'TechStart Manufacturing');
    });

    it('should track valuation progress', () => {
      cy.visit('/valuation/requests');
      
      // View request details
      cy.get('[data-testid="view-request"]').first().click();
      
      // Verify progress tracking
      cy.get('[data-testid="progress-tracker"]').should('be.visible');
      cy.get('[data-testid="status-submitted"]').should('have.class', 'completed');
      cy.get('[data-testid="estimated-completion"]').should('be.visible');
      
      // Check communication section
      cy.get('[data-testid="messages"]').should('be.visible');
      cy.get('[data-testid="send-message"]').type('When can I expect the preliminary report?');
      cy.get('[data-testid="submit-message"]').click();
      
      cy.get('[data-testid="success-message"]').should('contain', 'Message sent');
    });
  });

  describe('Loan Application Process', () => {
    beforeEach(() => {
      cy.login('test@msmebazaar.com', 'SecurePassword123!');
    });

    it('should complete loan application', () => {
      cy.visit('/loans/apply');
      
      // Basic information
      cy.get('[data-testid="loan-type"]').select('Business Expansion');
      cy.get('[data-testid="loan-amount"]').type('5000000');
      cy.get('[data-testid="loan-purpose"]').type('Expanding manufacturing capacity and upgrading equipment');
      cy.get('[data-testid="repayment-period"]').select('5 years');
      
      // Business details
      cy.get('[data-testid="msme-select"]').select('TechStart Manufacturing');
      cy.get('[data-testid="monthly-revenue"]').type('4000000');
      cy.get('[data-testid="monthly-expenses"]').type('3200000');
      cy.get('[data-testid="existing-loans"]').type('1000000');
      
      // Documents upload
      cy.get('[data-testid="upload-business-plan"]').selectFile('cypress/fixtures/business-plan.pdf');
      cy.get('[data-testid="upload-financial-projections"]').selectFile('cypress/fixtures/projections.pdf');
      cy.get('[data-testid="upload-bank-statements"]').selectFile('cypress/fixtures/bank-statements.pdf');
      
      // Collateral information
      cy.get('[data-testid="collateral-type"]').select('Property');
      cy.get('[data-testid="collateral-value"]').type('8000000');
      cy.get('[data-testid="collateral-description"]').type('Commercial property in Technology Park');
      
      // Submit application
      cy.get('[data-testid="submit-application"]').click();
      
      // Verify submission
      cy.get('[data-testid="application-success"]').should('be.visible');
      cy.get('[data-testid="application-id"]').should('be.visible');
      
      // Should redirect to tracking page
      cy.url().should('include', '/loans/track');
    });

    it('should browse available NBFC partners', () => {
      cy.visit('/loans/nbfcs');
      
      // Browse NBFC list
      cy.get('[data-testid="nbfc-list"]').should('be.visible');
      cy.get('[data-testid="nbfc-card"]').should('have.length.at.least', 1);
      
      // Filter NBFCs
      cy.get('[data-testid="loan-type-filter"]').select('Working Capital');
      cy.get('[data-testid="min-amount-filter"]').type('1000000');
      cy.get('[data-testid="apply-filters"]').click();
      
      // View NBFC details
      cy.get('[data-testid="view-nbfc"]').first().click();
      
      cy.get('[data-testid="nbfc-details"]').should('be.visible');
      cy.get('[data-testid="interest-rates"]').should('be.visible');
      cy.get('[data-testid="apply-loan"]').should('be.visible');
    });
  });

  describe('Admin Dashboard and Management', () => {
    beforeEach(() => {
      cy.login('admin@msmebazaar.com', 'AdminPassword123!');
    });

    it('should manage MSME listing approvals', () => {
      cy.visit('/admin/listings');
      
      // View pending listings
      cy.get('[data-testid="pending-listings"]').should('be.visible');
      cy.get('[data-testid="listing-card"]').should('have.length.at.least', 1);
      
      // Review listing details
      cy.get('[data-testid="review-listing"]').first().click();
      
      cy.get('[data-testid="listing-details"]').should('be.visible');
      cy.get('[data-testid="documents-section"]').should('be.visible');
      
      // Approve listing
      cy.get('[data-testid="approval-notes"]').type('All documents verified. Approved for listing.');
      cy.get('[data-testid="approve-listing"]').click();
      
      cy.get('[data-testid="success-message"]').should('contain', 'Listing approved successfully');
    });

    it('should manage user accounts', () => {
      cy.visit('/admin/users');
      
      // Search for user
      cy.get('[data-testid="user-search"]').type('test@msmebazaar.com');
      cy.get('[data-testid="search-users"]').click();
      
      // View user details
      cy.get('[data-testid="view-user"]').first().click();
      
      cy.get('[data-testid="user-profile"]').should('be.visible');
      cy.get('[data-testid="user-activity"]').should('be.visible');
      
      // Update user status
      cy.get('[data-testid="user-status"]').select('Active');
      cy.get('[data-testid="save-user"]').click();
      
      cy.get('[data-testid="success-message"]').should('contain', 'User updated successfully');
    });

    it('should view analytics and reports', () => {
      cy.visit('/admin/analytics');
      
      // Verify dashboard widgets
      cy.get('[data-testid="total-users"]').should('be.visible');
      cy.get('[data-testid="total-listings"]').should('be.visible');
      cy.get('[data-testid="total-transactions"]').should('be.visible');
      cy.get('[data-testid="revenue-chart"]').should('be.visible');
      
      // Generate custom report
      cy.get('[data-testid="generate-report"]').click();
      cy.get('[data-testid="report-type"]').select('Monthly Summary');
      cy.get('[data-testid="date-range"]').type('2024-01-01');
      cy.get('[data-testid="download-report"]').click();
      
      // Verify download
      cy.readFile('cypress/downloads/monthly-summary.pdf').should('exist');
    });
  });

  describe('Performance and Accessibility', () => {
    it('should load pages within acceptable time', () => {
      const startTime = Date.now();
      
      cy.visit('/');
      
      cy.get('[data-testid="main-content"]').should('be.visible').then(() => {
        const loadTime = Date.now() - startTime;
        expect(loadTime).to.be.lessThan(3000); // 3 seconds max
      });
    });

    it('should be accessible with keyboard navigation', () => {
      cy.visit('/');
      
      // Tab through navigation
      cy.get('body').tab();
      cy.focused().should('have.attr', 'data-testid', 'logo-link');
      
      cy.focused().tab();
      cy.focused().should('contain', 'Sell Business');
      
      cy.focused().tab();
      cy.focused().should('contain', 'Buy Business');
      
      // Test modal accessibility
      cy.get('[data-testid="open-search"]').click();
      cy.get('[data-testid="search-modal"]').should('be.visible');
      cy.get('[data-testid="search-input"]').should('be.focused');
      
      // Escape should close modal
      cy.get('body').type('{esc}');
      cy.get('[data-testid="search-modal"]').should('not.exist');
    });

    it('should work on mobile viewport', () => {
      cy.viewport('iphone-x');
      cy.visit('/');
      
      // Test mobile navigation
      cy.get('[data-testid="mobile-menu-button"]').should('be.visible');
      cy.get('[data-testid="mobile-menu-button"]').click();
      cy.get('[data-testid="mobile-menu"]').should('be.visible');
      
      // Test responsive forms
      cy.visit('/auth/register');
      cy.get('[data-testid="registration-form"]').should('be.visible');
      cy.get('[data-testid="company-name"]').should('be.visible');
    });
  });
});

// Custom Cypress commands
declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      dataCy(value: string): Chainable<JQuery<HTMLElement>>;
    }
  }
}

// Login command
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.visit('/auth/login');
    cy.get('[data-testid="email"]').type(email);
    cy.get('[data-testid="password"]').type(password);
    cy.get('[data-testid="login-button"]').click();
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="user-profile"]').should('be.visible');
  });
});

// Data attribute selector command
Cypress.Commands.add('dataCy', (value: string) => {
  return cy.get(`[data-testid="${value}"]`);
});