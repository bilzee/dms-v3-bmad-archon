// Quick verification script for test-ids
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('🔍 Verifying test-ids...');
    
    // Login
    await page.goto('http://127.0.0.1:3004/login');
    await page.fill('input[name="email"]', 'coordinator@test.com');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Navigate to verification
    await page.click('a[href="/coordinator/verification"]');
    await page.waitForURL('**/coordinator/verification');
    
    // Click on Responses tab
    await page.click('button[data-tab="responses"]');
    await page.waitForTimeout(2000);
    
    console.log('✅ Responses tab clicked successfully');
    
    // Check for all required test-ids
    const testIds = [
      'response-verification-queue',
      'verification-filters', 
      'status-filter',
      'response-queue-table',
      'response-metrics-summary',
      'total-pending-responses',
      'total-verified-responses', 
      'total-rejected-responses',
      'verification-rate',
      'average-processing-time',
      'response-breakdown-by-type',
      'processing-time-chart',
      'response-row'
    ];
    
    const results = {};
    
    for (const testId of testIds) {
      try {
        const element = await page.locator(`[data-testid="${testId}"]`);
        const isVisible = await element.first().isVisible();
        results[testId] = isVisible ? '✅' : '❌';
        console.log(`${results[testId]} ${testId}: ${isVisible ? 'Found' : 'Not found'}`);
      } catch (error) {
        results[testId] = '❌';
        console.log(`❌ ${testId}: Error - ${error.message}`);
      }
    }
    
    console.log('\n📊 Summary:');
    const success = Object.values(results).filter(r => r === '✅').length;
    const total = testIds.length;
    console.log(`${success}/${total} test-ids found (${Math.round(success/total*100)}%)`);
    
    // Take screenshot for reference
    await page.screenshot({ path: 'test-ids-verification.png', fullPage: true });
    console.log('📸 Screenshot saved as test-ids-verification.png');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
})();