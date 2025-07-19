import { test, expect } from '@playwright/test'

test.describe('VyapaarMitra Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
  })

  test('should display dashboard header and title', async ({ page }) => {
    // Check if the main title is visible
    await expect(page.locator('h1')).toContainText('VyapaarMitra Admin Dashboard')
    await expect(page.locator('text=Business Intelligence & System Monitoring')).toBeVisible()
  })

  test('should load analytics overview cards', async ({ page }) => {
    // Wait for the analytics cards to load
    await expect(page.locator('text=Total Active MSMEs')).toBeVisible()
    await expect(page.locator('text=New Signups Today')).toBeVisible()
    await expect(page.locator('text=Total Transactions')).toBeVisible()
    await expect(page.locator('text=Pending Approvals')).toBeVisible()
    
    // Check if metric values are displayed (should be numbers)
    const metricCards = page.locator('[class*="metric-card"]')
    await expect(metricCards).toHaveCount(4)
  })

  test('should display key performance metrics', async ({ page }) => {
    await expect(page.locator('text=Key Performance Metrics')).toBeVisible()
    await expect(page.locator('text=Conversion Rate')).toBeVisible()
    await expect(page.locator('text=Successful Transactions')).toBeVisible()
    await expect(page.locator('text=Active Buyers')).toBeVisible()
    await expect(page.locator('text=Active Sellers')).toBeVisible()
    await expect(page.locator('text=Avg Deal Size')).toBeVisible()
  })

  test('should render charts section with tabs', async ({ page }) => {
    await expect(page.locator('text=Analytics & Trends')).toBeVisible()
    
    // Check chart tabs
    await expect(page.locator('button:has-text("Overview")')).toBeVisible()
    await expect(page.locator('button:has-text("Trends")')).toBeVisible()
    await expect(page.locator('button:has-text("Regional")')).toBeVisible()
    await expect(page.locator('button:has-text("Sectors")')).toBeVisible()
    
    // Check if charts are rendering
    await expect(page.locator('text=Weekly Signups')).toBeVisible()
    await expect(page.locator('text=Valuation Trends')).toBeVisible()
  })

  test('should switch between chart tabs', async ({ page }) => {
    // Click on Regional tab
    await page.click('button:has-text("Regional")')
    await expect(page.locator('text=MSME Distribution by Region')).toBeVisible()
    await expect(page.locator('text=Regional Statistics')).toBeVisible()
    
    // Click on Sectors tab
    await page.click('button:has-text("Sectors")')
    await expect(page.locator('text=Active Deals by Sector')).toBeVisible()
  })

  test('should display data tables with tabs', async ({ page }) => {
    // Check table tabs
    await expect(page.locator('button:has-text("Transactions")')).toBeVisible()
    await expect(page.locator('button:has-text("MSME Listings")')).toBeVisible()
    
    // Transactions table should be visible by default
    await expect(page.locator('text=Transaction Overview')).toBeVisible()
    await expect(page.locator('text=Export CSV')).toBeVisible()
    await expect(page.locator('text=Export Excel')).toBeVisible()
  })

  test('should enable search functionality in transaction table', async ({ page }) => {
    // Find search input
    const searchInput = page.locator('input[placeholder="Search transactions..."]')
    await expect(searchInput).toBeVisible()
    
    // Type in search box
    await searchInput.fill('Business')
    
    // Wait for debounced search to trigger
    await page.waitForTimeout(500)
  })

  test('should enable filtering in transaction table', async ({ page }) => {
    // Check filter dropdowns
    await expect(page.locator('select')).toHaveCount(2) // Region and Status filters
    
    // Test region filter
    await page.selectOption('select:has-option[value="Mumbai"]', 'Mumbai')
    
    // Test status filter  
    await page.selectOption('select:has-option[value="pending"]', 'pending')
  })

  test('should display system monitoring section', async ({ page }) => {
    await expect(page.locator('text=System Notifications')).toBeVisible()
    await expect(page.locator('text=System Health')).toBeVisible()
  })

  test('should display quick actions section', async ({ page }) => {
    await expect(page.locator('text=Quick Actions')).toBeVisible()
    await expect(page.locator('text=Export Reports')).toBeVisible()
    await expect(page.locator('text=Approve Pending')).toBeVisible()
    await expect(page.locator('text=System Health')).toBeVisible()
    await expect(page.locator('text=View Reports')).toBeVisible()
  })

  test('should toggle theme', async ({ page }) => {
    // Find theme toggle button
    const themeToggle = page.locator('button[aria-label="Toggle theme"]')
    await expect(themeToggle).toBeVisible()
    
    // Click to toggle theme
    await themeToggle.click()
    
    // Wait for theme change
    await page.waitForTimeout(300)
  })

  test('should change date filter', async ({ page }) => {
    // Find date filter
    const dateFilter = page.locator('button:has-text("This Week")')
    await expect(dateFilter).toBeVisible()
    
    // Click to open dropdown
    await dateFilter.click()
    
    // Select different option
    await page.click('button:has-text("This Month")')
    
    // Check if filter changed
    await expect(page.locator('button:has-text("This Month")')).toBeVisible()
  })

  test('should refresh data', async ({ page }) => {
    // Find refresh button
    const refreshButton = page.locator('button:has-text("Refresh")')
    await expect(refreshButton).toBeVisible()
    
    // Click refresh
    await refreshButton.click()
    
    // Button should show loading state briefly
    await expect(refreshButton.locator('.animate-spin')).toBeVisible()
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Check if main elements are still visible
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('text=Total Active MSMEs')).toBeVisible()
    
    // Cards should stack on mobile
    const cards = page.locator('[class*="metric-card"]')
    await expect(cards.first()).toBeVisible()
  })

  test('should handle error states gracefully', async ({ page }) => {
    // Simulate network error by intercepting API calls
    await page.route('**/admin/metrics*', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      })
    })
    
    await page.reload()
    
    // Check if error message is displayed
    await expect(page.locator('text=Failed to load dashboard data')).toBeVisible()
  })

  test('should display loading states', async ({ page }) => {
    // Intercept API calls to delay them
    await page.route('**/admin/metrics*', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000))
      route.continue()
    })
    
    await page.reload()
    
    // Check if skeleton loaders are visible
    await expect(page.locator('.skeleton')).toHaveCount(4, { timeout: 1000 })
  })

  test('should export data successfully', async ({ page }) => {
    // Set up download handling
    const downloadPromise = page.waitForEvent('download')
    
    // Click export CSV button
    await page.click('button:has-text("Export CSV")')
    
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('transactions.csv')
  })
})

test.describe('Dashboard Accessibility', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check heading structure
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('h2')).toHaveCount(5) // Section headings
  })

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Tab through interactive elements
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Check if focus is visible
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
  })

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check for aria-label on theme toggle
    await expect(page.locator('button[aria-label="Toggle theme"]')).toBeVisible()
  })
})