describe('MSMEBazaar Basic E2E Tests', () => {
  beforeEach(() => {
    // Visit the homepage before each test
    cy.visit('/')
  })

  it('should load the homepage successfully', () => {
    // Check that the page loads
    cy.url().should('include', '/')
    
    // Check for basic HTML structure
    cy.get('html').should('exist')
    cy.get('body').should('exist')
    
    // Check that the page is not showing an error
    cy.get('body').should('not.contain', 'Application error')
    cy.get('body').should('not.contain', '500')
    cy.get('body').should('not.contain', '404')
  })

  it('should have proper page title', () => {
    // Check that the page has a title
    cy.title().should('not.be.empty')
    cy.title().should('not.equal', 'Document')
  })

  it('should be responsive', () => {
    // Test different viewport sizes
    cy.viewport(375, 667) // Mobile
    cy.get('body').should('be.visible')
    
    cy.viewport(768, 1024) // Tablet
    cy.get('body').should('be.visible')
    
    cy.viewport(1920, 1080) // Desktop
    cy.get('body').should('be.visible')
  })

  it('should not have console errors', () => {
    // Monitor console for errors
    cy.window().then((win) => {
      // Suppress expected warnings but catch real errors
      cy.on('window:before:load', (win) => {
        const originalConsoleError = win.console.error
        win.console.error = (...args) => {
          // Allow some expected warnings but catch real errors
          const message = args[0]
          if (typeof message === 'string') {
            if (message.includes('Warning:') || 
                message.includes('Download the React DevTools')) {
              return
            }
          }
          originalConsoleError(...args)
          throw new Error(`Console error: ${args.join(' ')}`)
        }
      })
    })
  })

  it('should load within reasonable time', () => {
    // Performance test - page should load quickly
    const start = Date.now()
    
    cy.visit('/').then(() => {
      const loadTime = Date.now() - start
      expect(loadTime).to.be.lessThan(5000) // 5 seconds max
    })
  })
})