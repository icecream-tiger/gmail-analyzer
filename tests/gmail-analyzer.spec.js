const { test, expect } = require('@playwright/test');

test.describe('Gmail Storage Analyzer', () => {
  
  test.beforeEach(async ({ page }) => {
    // Serve the HTML file
    await page.goto('http://localhost:8000');
  });

  test('page loads successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Gmail Storage Analyzer/);
    await expect(page.locator('h1')).toContainText('Gmail Storage Analyzer');
  });

  test('sign in button is visible', async ({ page }) => {
    const signInButton = page.locator('button:has-text("Sign in with Google")');
    await expect(signInButton).toBeVisible();
  });

  test('demo data loads', async ({ page }) => {
    // Click sign in
    await page.locator('button:has-text("Sign in with Google")').click();
    
    // Handle alert
    page.on('dialog', dialog => dialog.accept());
    
    // Wait for main section
    await page.waitForSelector('#mainSection', { state: 'visible' });
    
    // Check if stats are visible
    await expect(page.locator('#totalEmails')).not.toHaveText('0');
  });

  test('analyze emails button works', async ({ page }) => {
    // Sign in (demo mode)
    await page.locator('button:has-text("Sign in with Google")').click();
    page.on('dialog', dialog => dialog.accept());
    await page.waitForSelector('#mainSection', { state: 'visible' });
    
    // Click analyze
    await page.locator('#loadBtn').click();
    
    // Wait for loading to complete
    await page.waitForSelector('#loading', { state: 'hidden', timeout: 10000 });
    
    // Check treemap rendered
    const treemapBlocks = page.locator('.treemap-block');
    await expect(treemapBlocks.first()).toBeVisible();
  });

  test('view switching works', async ({ page }) => {
    // Setup: load demo data
    await page.locator('button:has-text("Sign in with Google")').click();
    page.on('dialog', dialog => dialog.accept());
    await page.waitForSelector('#mainSection', { state: 'visible' });
    await page.locator('#loadBtn').click();
    await page.waitForSelector('#loading', { state: 'hidden', timeout: 10000 });
    
    // Test view switching
    const timeViewBtn = page.locator('button:has-text("By Time")');
    await timeViewBtn.click();
    await expect(timeViewBtn).toHaveClass(/active/);
    
    const yearViewBtn = page.locator('button:has-text("By Year")');
    await yearViewBtn.click();
    await expect(yearViewBtn).toHaveClass(/active/);
  });

  test('drill-down navigation works', async ({ page }) => {
    // Setup
    await page.locator('button:has-text("Sign in with Google")').click();
    page.on('dialog', dialog => dialog.accept());
    await page.waitForSelector('#mainSection', { state: 'visible' });
    await page.locator('#loadBtn').click();
    await page.waitForSelector('#loading', { state: 'hidden', timeout: 10000 });
    
    // Click first treemap block
    await page.locator('.treemap-block').first().click();
    
    // Check breadcrumb appears
    await expect(page.locator('#breadcrumb')).toBeVisible();
    
    // Check toolbar appears
    await expect(page.locator('#groupToolbar')).toBeVisible();
  });

  test('toolbar actions are present', async ({ page }) => {
    // Setup and drill down
    await page.locator('button:has-text("Sign in with Google")').click();
    page.on('dialog', dialog => dialog.accept());
    await page.waitForSelector('#mainSection', { state: 'visible' });
    await page.locator('#loadBtn').click();
    await page.waitForSelector('#loading', { state: 'hidden', timeout: 10000 });
    await page.locator('.treemap-block').first().click();
    
    // Check toolbar buttons exist
    await expect(page.locator('button:has-text("View All Emails")')).toBeVisible();
    await expect(page.locator('button:has-text("Open in Gmail")')).toBeVisible();
    await expect(page.locator('button:has-text("Export")')).toBeVisible();
  });

  test('export functionality works', async ({ page }) => {
    // Setup
    await page.locator('button:has-text("Sign in with Google")').click();
    page.on('dialog', dialog => dialog.accept());
    await page.waitForSelector('#mainSection', { state: 'visible' });
    await page.locator('#loadBtn').click();
    await page.waitForSelector('#loading', { state: 'hidden', timeout: 10000 });
    
    // Setup download listener
    const downloadPromise = page.waitForEvent('download');
    
    // Click export button
    await page.locator('button:has-text("Export CSV")').click();
    
    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/gmail_storage_analysis.*\.csv/);
  });

  test('treemap is scrollable', async ({ page }) => {
    // Setup
    await page.locator('button:has-text("Sign in with Google")').click();
    page.on('dialog', dialog => dialog.accept());
    await page.waitForSelector('#mainSection', { state: 'visible' });
    await page.locator('#loadBtn').click();
    await page.waitForSelector('#loading', { state: 'hidden', timeout: 10000 });
    
    // Check treemap container has overflow
    const container = page.locator('#treemapContainer');
    const overflow = await container.evaluate(el => 
      window.getComputedStyle(el).overflow
    );
    expect(overflow).toBe('auto');
  });

  test('year filter populates', async ({ page }) => {
    await page.locator('button:has-text("Sign in with Google")').click();
    page.on('dialog', dialog => dialog.accept());
    await page.waitForSelector('#mainSection', { state: 'visible' });
    
    // Check year dropdown has options
    const yearFilter = page.locator('#yearFilter');
    const optionCount = await yearFilter.locator('option').count();
    expect(optionCount).toBeGreaterThan(10); // Should have many years
  });

  test('no console errors on load', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('http://localhost:8000');
    await page.waitForLoadState('networkidle');
    
    // Filter out expected errors (like Sentry DSN warning)
    const criticalErrors = errors.filter(err => 
      !err.includes('YOUR_SENTRY_DSN') && 
      !err.includes('YOUR_CLIENT_ID')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});
