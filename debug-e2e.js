// Simple diagnostic script to check what's on the verification page
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('🔍 Starting diagnostic...');
    
    // Login
    await page.goto('http://127.0.0.1:3004/login');
    await page.fill('input[name="email"]', 'coordinator@test.com');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    console.log('✅ Login successful');

    // Navigate to verification
    await page.click('a[href="/coordinator/verification"]');
    await page.waitForURL('**/coordinator/verification');
    console.log('✅ Navigated to verification page');

    // Wait a moment for the page to load
    await page.waitForTimeout(2000);

    // Check what tabs exist
    const tabs = await page.$$eval('button', buttons => 
      buttons.map(btn => ({
        text: btn.textContent?.trim(),
        attributes: Object.fromEntries(Array.from(btn.attributes).map(attr => [attr.name, attr.value]))
      }))
    );
    
    console.log('🔍 Found buttons:', tabs);

    // Check specifically for tab-related buttons
    const tabButtons = tabs.filter(btn => 
      btn.text?.includes('Overview') || 
      btn.text?.includes('Responses') || 
      btn.text?.includes('Analytics') ||
      btn.text?.includes('Queue')
    );
    
    console.log('📋 Tab buttons:', tabButtons);
    
    // Try to click the Responses tab to load the component
    try {
      await page.click('button[data-tab="responses"]');
      await page.waitForTimeout(3000); // Wait for component to load
      console.log('✅ Clicked Responses tab successfully');
      
      // Check for test-ids
      const testIds = [
        'response-verification-queue',
        'verification-filters', 
        'status-filter',
        'response-queue-table',
        'response-metrics-summary'
      ];
      
      for (const testId of testIds) {
        const element = await page.locator(`[data-testid="${testId}"]`);
        const count = await element.count();
        console.log(`🔍 Test-id "${testId}": ${count > 0 ? '✅ Found' : '❌ Not found'} (${count} elements)`);
      }
      
      // Also check for loading state
      const loadingElements = await page.locator('.animate-pulse').count();
      console.log(`⏳ Loading elements: ${loadingElements}`);
      
      // Check for error messages
      const errorElements = await page.locator('[data-testid*="error"]').count();
      console.log(`❌ Error elements: ${errorElements}`);
      
      // Check network response
      const responseText = await page.locator('[data-testid="response-verification-queue"]').textContent();
      console.log(`📄 Queue content preview: ${responseText?.substring(0, 200)}...`);
      
    } catch (error) {
      console.log('❌ Failed to click Responses tab:', error.message);
    }

    // Take a screenshot
    await page.screenshot({ path: 'verification-page-debug.png', fullPage: true });
    console.log('📸 Screenshot saved as verification-page-debug.png');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
})();