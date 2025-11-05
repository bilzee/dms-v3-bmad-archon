/**
 * Living Test System - Captures real-time fixes and evolves test cases automatically
 * 
 * This system bridges the gap between static test expectations and dynamic development reality.
 * It detects when developers manually fix functionality during development and captures
 * those fix patterns to automatically update test cases and prevent future regressions.
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright'
import { EventEmitter } from 'events'
import * as fs from 'fs/promises'
import * as path from 'path'
import { performance } from 'perf_hooks'

// ==================== Core Types ====================

export interface FixCapture {
  id: string
  timestamp: number
  description: string
  url: string
  selector: string
  beforeState: PageState
  afterState: PageState
  actions: UserAction[]
  context: DevelopmentContext
  validation: FixValidation
  generatedTest?: GeneratedTest
}

export interface PageState {
  url: string
  title: string
  elements: ElementSnapshot[]
  console: ConsoleEntry[]
  network: NetworkActivity[]
  errors: ErrorEntry[]
  formState?: FormState
  userRole?: string
  offlineStatus?: boolean
}

export interface UserAction {
  type: 'click' | 'type' | 'navigate' | 'scroll' | 'upload' | 'wait' | 'debug' | 'fix'
  timestamp: number
  selector?: string
  value?: string
  beforeState?: any
  afterState?: any
  debugInfo?: {
    originalValue: any
    fixedValue: any
    fixReason: string
  }
}

export interface DevelopmentContext {
  taskDescription?: string
  storyId?: string
  testThatWasExpected: string
  whatActuallyHappened: string
  manualFixDescription: string
  fixPattern: string[]
  environment: {
    nodeEnv: string
    testMode: boolean
    mockData: boolean
    browser: string
  }
}

interface FixValidation {
  isReproducible: boolean
  fixComprehensiveness: number // 0-100
  potentialSideEffects: string[]
  testCoverage: TestCoverage
}

interface GeneratedTest {
  type: 'e2e' | 'integration' | 'unit'
  framework: 'playwright' | 'vitest' | 'jest'
  code: string
  fileName: string
  path: string
  testId: string
  dependencies: string[]
  fixtures: string[]
}

interface FixPattern {
  name: string
  frequency: number
  contexts: string[]
  actions: UserAction[]
  generatedTests: string[]
  lastSeen: number
  effectiveness: number
}

interface LivingTestReport {
  timestamp: number
  fixesCaptured: FixCapture[]
  patternsIdentified: FixPattern[]
  testsGenerated: GeneratedTest[]
  coverageGap: CoverageGap[]
  recommendations: string[]
}

interface CoverageGap {
  feature: string
  expectedBehavior: string
  actualBehavior: string
  fixRequired: boolean
  automationPotential: number
}

// ==================== Living Test System Core ====================

export class LivingTestSystem extends EventEmitter {
  private browser: Browser | null = null
  private context: BrowserContext | null = null
  private page: Page | null = null
  private isCapturing = false
  private fixBuffer: FixCapture[] = []
  private patterns: Map<string, FixPattern> = new Map()
  private sessionData: SessionData = {
    startTime: Date.now(),
    fixes: [],
    testsGenerated: 0,
    patternsIdentified: 0
  }

  constructor(private config: LivingTestConfig) {
    super()
    this.loadExistingPatterns()
    this.setupEventHandlers()
  }

  // ==================== Core Methods ====================

  /**
   * Start a living test capture session
   * This monitors your development and captures fixes in real-time
   */
  async startCaptureSession(context: Partial<DevelopmentContext> = {}): Promise<void> {
    this.browser = await chromium.launch({ 
      headless: false,
      devtools: true // Keep devtools open for debugging
    })
    
    this.context = await this.browser.newContext({
      viewport: { width: 1400, height: 900 },
      // Capture all the data we need for fix detection
      permissions: ['geolocation', 'camera', 'notifications'],
      recordVideo: { dir: './living-test-captures', size: { width: 1400, height: 900 } },
      // Capture console and network activity
      ignoreHTTPSErrors: true
    })

    this.page = await this.context.newPage()
    this.isCapturing = true
    this.sessionData.startTime = Date.now()

    // Inject fix detection script
    await this.injectFixDetectionScript()

    // Setup comprehensive monitoring
    this.setupMonitoring()

    console.log('🔴 Living Test System - Capture Session Started')
    console.log('📝 Make your manual fixes now - I\'m watching and learning...')
    
    this.emit('session:started', { timestamp: Date.now(), context })
  }

  /**
   * Inject the fix detection script into the page
   * This detects when you're making manual fixes vs normal development
   */
  private async injectFixDetectionScript(): Promise<void> {
    if (!this.page) return

    const detectionScript = `
      (function() {
        let isDebugging = false;
        let lastKnownGoodState = {};
        let fixAttempts = [];

        // Detect when developer is debugging/fixing
        window.addEventListener('devtools-opened', () => {
          isDebugging = true;
          console.log('🔧 Fix detection: Developer tools opened');
        });

        window.addEventListener('devtools-closed', () => {
          if (isDebugging) {
            // Capture the fix that was just made
            window.captureFixAttempt();
          }
          isDebugging = false;
        });

        // Detect manual DOM manipulations (common fix pattern)
        const originalSetAttribute = Element.prototype.setAttribute;
        Element.prototype.setAttribute = function(name, value) {
          const result = originalSetAttribute.call(this, name, value);
          
          if (isDebugging && window.livingTestObserver) {
            window.livingTestObserver.recordDOMChange({
              element: this.tagName + (this.id ? '#' + this.id : '') + (this.className ? '.' + this.className.split(' ').join('.') : ''),
              attribute: name,
              oldValue: this.getAttribute(name),
              newValue: value,
              selector: generateSelector(this)
            });
          }
          
          return result;
        };

        // Detect style changes (visual fixes)
        const originalSetProperty = CSSStyleDeclaration.prototype.setProperty;
        CSSStyleDeclaration.prototype.setProperty = function(property, value, priority) {
          const result = originalSetProperty.call(this, property, value, priority);
          
          if (isDebugging && window.livingTestObserver) {
            window.livingTestObserver.recordStyleChange({
              element: this.parentRule?.parentStyleSheet?.ownerNode?.tagName || 'unknown',
              property: property,
              oldValue: this.getPropertyValue(property),
              newValue: value,
              selector: this.parentRule?.selectorText || 'inline'
            });
          }
          
          return result;
        };

        // Detect console.log/clear (debugging activities)
        const originalLog = console.log;
        const originalClear = console.clear;
        
        console.log = function(...args) {
          if (isDebugging && window.livingTestObserver) {
            window.livingTestObserver.recordDebugAction({
              type: 'console.log',
              args: args,
              timestamp: Date.now()
            });
          }
          return originalLog.apply(console, args);
        };

        console.clear = function() {
          if (isDebugging && window.livingTestObserver) {
            window.livingTestObserver.recordDebugAction({
              type: 'console.clear',
              timestamp: Date.now()
            });
          }
          return originalClear.apply(console);
        };

        // Helper to generate stable selectors
        function generateSelector(element) {
          if (element.id) return '#' + element.id;
          
          let path = [];
          while (element && element.nodeType === Node.ELEMENT_NODE) {
            let selector = element.nodeName.toLowerCase();
            if (element.className) {
              selector += '.' + element.className.split(' ').join('.');
            }
            path.unshift(selector);
            element = element.parentNode;
          }
          return path.join(' > ');
        }

        // Global capture function
        window.captureFixAttempt = function() {
          if (window.livingTestObserver) {
            window.livingTestObserver.captureCurrentFix();
          }
        };

        // Detect failed test expectations
        window.recordExpectationFailure = function(expected, actual, context) {
          if (window.livingTestObserver) {
            window.livingTestObserver.recordExpectationFailure({
              expected,
              actual,
              context,
              timestamp: Date.now()
            });
          }
        };

        console.log('🔧 Fix detection script injected');
      })();
    `

    await this.page.addInitScript(detectionScript)

    // Add the observer interface
    await this.page.exposeFunction('livingTestObserver', (method: string, ...args: any[]) => {
      switch (method) {
        case 'recordDOMChange':
          return this.recordDOMChange(args[0])
        case 'recordStyleChange':
          return this.recordStyleChange(args[0])
        case 'recordDebugAction':
          return this.recordDebugAction(args[0])
        case 'captureCurrentFix':
          return this.captureCurrentFix()
        case 'recordExpectationFailure':
          return this.recordExpectationFailure(args[0])
        default:
          console.warn(`Unknown method: ${method}`)
      }
    })
  }

  /**
   * Setup comprehensive monitoring of page activity
   */
  private async setupMonitoring(): Promise<void> {
    if (!this.page) return

    // Monitor console for errors and debugging
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.recordError({
          message: msg.text(),
          type: 'console.error',
          timestamp: Date.now(),
          location: msg.location()
        })
      } else if (msg.type() === 'log' && msg.text().includes('🔧')) {
        // Detect our debug markers
        this.recordDebugAction({
          type: 'debug.log',
          message: msg.text(),
          timestamp: Date.now()
        })
      }
    })

    // Monitor network requests for API fixes
    this.page.on('request', request => {
      if (request.url().includes('/api/')) {
        this.recordNetworkActivity({
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
          timestamp: Date.now(),
          type: 'request'
        })
      }
    })

    // Monitor responses for API fixes
    this.page.on('response', response => {
      if (response.url().includes('/api/')) {
        this.recordNetworkActivity({
          url: response.url(),
          status: response.status(),
          headers: response.headers(),
          timestamp: Date.now(),
          type: 'response'
        })
      }
    })

    // Monitor page errors
    this.page.on('pageerror', error => {
      this.recordError({
        message: error.message,
        stack: error.stack,
        type: 'runtime.error',
        timestamp: Date.now()
      })
    })
  }

  // ==================== Fix Detection Methods ====================

  private recordDOMChange(change: any): void {
    if (!this.isCapturing) return
    
    console.log(`🔧 DOM Change detected: ${change.element} ${change.attribute} = ${change.newValue}`)
    this.addToCurrentFix({
      type: 'fix',
      timestamp: Date.now(),
      selector: change.selector,
      debugInfo: {
        originalValue: change.oldValue,
        fixedValue: change.newValue,
        fixReason: `DOM attribute ${change.attribute} was manually changed`
      }
    })
  }

  private recordStyleChange(change: any): void {
    if (!this.isCapturing) return
    
    console.log(`🎨 Style Change detected: ${change.selector} { ${change.property}: ${change.newValue} }`)
    this.addToCurrentFix({
      type: 'fix',
      timestamp: Date.now(),
      selector: change.selector,
      debugInfo: {
        originalValue: change.oldValue,
        fixedValue: change.newValue,
        fixReason: `CSS style ${change.property} was manually adjusted`
      }
    })
  }

  private recordDebugAction(action: any): void {
    if (!this.isCapturing) return
    
    console.log(`🐛 Debug action: ${action.type}`)
    this.addToCurrentFix({
      type: 'debug',
      timestamp: Date.now(),
      value: action.message || action.type,
      debugInfo: action
    })
  }

  private recordError(error: any): void {
    if (!this.isCapturing) return
    
    console.log(`❌ Error detected: ${error.message}`)
    // Errors often precede fixes, so we note them
    this.emit('error:detected', error)
  }

  private recordNetworkActivity(activity: any): void {
    if (!this.isCapturing) return
    
    // Note API calls that might be fixes
    if (activity.type === 'response' && activity.status >= 400) {
      console.log(`🌐 API error that might need fixing: ${activity.url} - ${activity.status}`)
    }
  }

  private recordExpectationFailure(failure: any): void {
    if (!this.isCapturing) return
    
    console.log(`⚠️ Test expectation failed: Expected ${failure.expected}, got ${failure.actual}`)
    
    // This is a key moment - a test expectation failed, now we watch for the manual fix
    this.emit('expectation:failed', failure)
  }

  private currentFix: UserAction[] = []

  private addToCurrentFix(action: UserAction): void {
    this.currentFix.push(action)
    
    // If this looks like a complete fix, offer to capture it
    if (this.currentFix.length >= 3) {
      console.log('🎯 Fix pattern detected! Should I capture this as a test case?')
      console.log('   Actions:', this.currentFix.map(a => a.type).join(' → '))
      
      // Auto-capture after a short delay if no more actions
      setTimeout(() => {
        if (this.currentFix.length > 0) {
          this.captureCurrentFix()
        }
      }, 5000)
    }
  }

  /**
   * Capture the current fix and generate test cases
   */
  private async captureCurrentFix(): Promise<void> {
    if (!this.page || this.currentFix.length === 0) return

    try {
      const currentState = await this.capturePageState()
      const fixCapture: FixCapture = {
        id: `fix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        description: this.generateFixDescription(this.currentFix),
        url: this.page.url(),
        selector: this.currentFix[this.currentFix.length - 1]?.selector || '',
        beforeState: currentState, // In real implementation, this would be captured before the fix
        afterState: currentState,
        actions: this.currentFix,
        context: this.inferDevelopmentContext(),
        validation: await this.validateFix(this.currentFix)
      }

      // Generate test case from the fix
      fixCapture.generatedTest = await this.generateTestCase(fixCapture)

      // Store the fix
      this.fixBuffer.push(fixCapture)
      this.sessionData.fixes.push(fixCapture)

      // Analyze for patterns
      await this.analyzeFixPatterns(fixCapture)

      // Clear current fix
      this.currentFix = []

      console.log(`✅ Fix captured: ${fixCapture.description}`)
      console.log(`📝 Generated test: ${fixCapture.generatedTest?.fileName}`)
      
      this.emit('fix:captured', fixCapture)

      // Immediately write the generated test
      if (fixCapture.generatedTest) {
        await this.writeGeneratedTest(fixCapture.generatedTest)
      }

    } catch (error) {
      console.error('❌ Failed to capture fix:', error)
    }
  }

  private generateFixDescription(actions: UserAction[]): string {
    const fixActions = actions.filter(a => a.type === 'fix')
    const debugActions = actions.filter(a => a.type === 'debug')
    
    if (fixActions.length > 0) {
      return `Manual fix of ${fixActions.length} element(s): ${fixActions.map(a => a.selector).join(', ')}`
    }
    
    if (debugActions.length > 0) {
      return `Debugging session: ${debugActions.map(a => a.value).join(' → ')}`
    }
    
    return `Manual intervention during development`
  }

  private inferDevelopmentContext(): DevelopmentContext {
    // This would be enhanced to infer from git, branch name, etc.
    return {
      taskDescription: 'Manual feature fix during development',
      testThatWasExpected: 'Test expected certain behavior',
      whatActuallyHappened: 'Behavior did not match test expectations',
      manualFixDescription: this.generateFixDescription(this.currentFix),
      fixPattern: this.currentFix.map(a => a.type),
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        testMode: false,
        mockData: false,
        browser: 'chromium'
      }
    }
  }

  private async validateFix(actions: UserAction[]): Promise<FixValidation> {
    // Analyze the fix to determine its quality and comprehensiveness
    return {
      isReproducible: actions.length > 1, // Multiple actions suggest a deliberate fix
      fixComprehensiveness: Math.min(actions.length * 20, 100), // Simple scoring
      potentialSideEffects: [], // Would be analyzed more deeply
      testCoverage: {
        features: [this.inferFeatureFromActions(actions)],
        scenarios: ['manual-fix'],
        environments: ['development']
      }
    }
  }

  private inferFeatureFromActions(actions: UserAction[]): string {
    // Simple heuristic to infer what feature is being fixed
    const selectors = actions.map(a => a.selector || '').join(' ')
    
    if (selectors.includes('delivery')) return 'delivery-workflow'
    if (selectors.includes('auth') || selectors.includes('login')) return 'authentication'
    if (selectors.includes('gps') || selectors.includes('location')) return 'gps-capture'
    if (selectors.includes('media') || selectors.includes('photo')) return 'media-upload'
    
    return 'unknown-feature'
  }

  // ==================== Test Generation ====================

  private async generateTestCase(fix: FixCapture): Promise<GeneratedTest> {
    const feature = this.inferFeatureFromActions(fix.actions)
    const testCode = this.generatePlaywrightTest(fix, feature)
    
    return {
      type: 'e2e',
      framework: 'playwright',
      code: testCode,
      fileName: `living-test-${feature}-${Date.now()}.spec.ts`,
      path: `tests/e2e/living-tests/`,
      testId: `living_${fix.id}`,
      dependencies: ['@playwright/test'],
      fixtures: this.extractFixtures(fix)
    }
  }

  private generatePlaywrightTest(fix: FixCapture, feature: string): string {
    const actions = fix.actions.filter(a => a.type === 'fix')
    const testDescription = `Living test: ${fix.description}`
    
    let testCode = `import { test, expect } from '@playwright/test'

test('${testDescription}', async ({ page }) => {
  // This test was automatically generated from a manual fix
  // Original issue: ${fix.context.whatActuallyHappened}
  // Manual fix: ${fix.context.manualFixDescription}
  
  // Navigate to the problematic page
  await page.goto('${fix.url}')
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle')
`

    // Convert each fix action to test code
    actions.forEach((action, index) => {
      if (action.selector && action.debugInfo) {
        testCode += `
  // Fix action ${index + 1}: ${action.debugInfo.fixReason}
  await expect(page.locator('${action.selector}')).toBeVisible()
  
  // Verify the fix is applied
  const element = page.locator('${action.selector}')
  await expect(element).toHaveAttribute('${action.debugInfo.originalValue?.split('=')[0] || 'value'}', '${action.debugInfo.fixedValue}')`
      }
    })

    testCode += `
  
  // Verify the fix works - this should pass now
  console.log('✅ Living test verification complete')
})
`

    return testCode
  }

  private extractFixtures(fix: FixCapture): string[] {
    // Extract any data fixtures needed for the test
    const fixtures: string[] = []
    
    if (fix.beforeState.userRole) {
      fixtures.push(`mock-user-${fix.beforeState.userRole}`)
    }
    
    return fixtures
  }

  private async writeGeneratedTest(test: GeneratedTest): Promise<void> {
    const fullPath = path.join(process.cwd(), test.path, test.fileName)
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    
    // Write the test file
    await fs.writeFile(fullPath, test.code, 'utf-8')
    
    console.log(`📝 Living test written: ${fullPath}`)
    this.sessionData.testsGenerated++
  }

  // ==================== Pattern Analysis ====================

  private async analyzeFixPatterns(fix: FixCapture): Promise<void> {
    // Analyze the fix for recurring patterns
    const patternKey = this.extractPatternKey(fix.actions)
    
    if (!this.patterns.has(patternKey)) {
      this.patterns.set(patternKey, {
        name: patternKey,
        frequency: 0,
        contexts: [],
        actions: fix.actions,
        generatedTests: [],
        lastSeen: Date.now(),
        effectiveness: 0
      })
    }
    
    const pattern = this.patterns.get(patternKey)!
    pattern.frequency++
    pattern.contexts.push(fix.context.taskDescription || 'unknown')
    pattern.lastSeen = Date.now()
    
    if (fix.generatedTest) {
      pattern.generatedTests.push(fix.generatedTest.testId)
    }
    
    console.log(`🔍 Pattern identified: ${patternKey} (seen ${pattern.frequency} times)`)
    this.sessionData.patternsIdentified++
  }

  private extractPatternKey(actions: UserAction[]): string {
    // Create a pattern key from the sequence of actions
    return actions
      .filter(a => a.type === 'fix')
      .map(a => `${a.type}:${a.selector?.split(' ')[0] || 'unknown'}`)
      .slice(0, 3) // First 3 actions define the pattern
      .join(' → ')
  }

  // ==================== Session Management ====================

  async stopCaptureSession(): Promise<LivingTestReport> {
    if (!this.isCapturing) return this.generateReport()

    this.isCapturing = false
    
    // Finalize any pending fixes
    if (this.currentFix.length > 0) {
      await this.captureCurrentFix()
    }

    // Cleanup
    if (this.context) await this.context.close()
    if (this.browser) await this.browser.close()
    
    const report = this.generateReport()
    
    console.log('🔴 Living Test System - Capture Session Ended')
    console.log(`📊 Summary: ${report.fixesCaptured.length} fixes, ${report.testsGenerated.length} tests generated`)
    
    this.emit('session:ended', report)
    
    return report
  }

  private generateReport(): LivingTestReport {
    return {
      timestamp: Date.now(),
      fixesCaptured: this.fixBuffer,
      patternsIdentified: Array.from(this.patterns.values()),
      testsGenerated: this.fixBuffer.filter(f => f.generatedTest).map(f => f.generatedTest!),
      coverageGap: [], // Would be computed based on existing tests
      recommendations: this.generateRecommendations()
    }
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = []
    
    // Analyze patterns for recommendations
    this.patterns.forEach((pattern, key) => {
      if (pattern.frequency >= 3) {
        recommendations.push(`🔄 Consider automating the recurring fix pattern: ${key}`)
      }
    })
    
    // Check for fix gaps
    const featuresWithFixes = new Set(this.fixBuffer.map(f => this.inferFeatureFromActions(f.actions)))
    recommendations.push(`📈 Focus on these features that needed manual fixes: ${Array.from(featuresWithFixes).join(', ')}`)
    
    return recommendations
  }

  // ==================== Utility Methods ====================

  private async capturePageState(): Promise<PageState> {
    if (!this.page) throw new Error('No page available')

    return {
      url: this.page.url(),
      title: await this.page.title(),
      elements: await this.captureElementSnapshots(),
      console: [], // Would be captured from console logs
      network: [], // Would be captured from network activity
      errors: [], // Would be captured from errors
      formState: await this.captureFormState(),
      userRole: await this.detectUserRole(),
      offlineStatus: await this.isOfflineMode()
    }
  }

  private async captureElementSnapshots(): Promise<ElementSnapshot[]> {
    // Capture current state of relevant elements
    return [] // Implementation would snapshot key elements
  }

  private async captureFormState(): Promise<FormState | undefined> {
    // Capture current form values
    return undefined // Implementation would capture form data
  }

  private async detectUserRole(): Promise<string> {
    // Detect current user role from UI
    return 'unknown' // Implementation would detect from page content
  }

  private async isOfflineMode(): Promise<boolean> {
    // Detect if app is in offline mode
    return false // Implementation would check PWA status
  }

  private async loadExistingPatterns(): Promise<void> {
    // Load existing patterns from storage
    try {
      const patternsPath = path.join(process.cwd(), '.living-test-patterns.json')
      const data = await fs.readFile(patternsPath, 'utf-8')
      const patterns = JSON.parse(data)
      patterns.forEach((pattern: FixPattern) => {
        this.patterns.set(pattern.name, pattern)
      })
    } catch {
      // No existing patterns, that's fine
    }
  }

  private setupEventHandlers(): void {
    this.on('fix:captured', (fix: FixCapture) => {
      console.log(`🎯 Fix captured automatically!`)
    })
    
    this.on('expectation:failed', (failure: any) => {
      console.log(`⚠️ Watching for manual fix of failed expectation...`)
    })
  }
}

// ==================== Supporting Types ====================

interface LivingTestConfig {
  captureDir?: string
  autoGenerateTests?: boolean
  patternThreshold?: number
  enableVideoCapture?: boolean
}

interface SessionData {
  startTime: number
  fixes: FixCapture[]
  testsGenerated: number
  patternsIdentified: number
}

interface ElementSnapshot {
  selector: string
  visible: boolean
  text: string
  attributes: Record<string, string>
}

interface ConsoleEntry {
  type: string
  message: string
  timestamp: number
}

interface NetworkActivity {
  url: string
  method?: string
  status?: number
  timestamp: number
  type: 'request' | 'response'
}

interface ErrorEntry {
  message: string
  type: string
  timestamp: number
  location?: any
}

interface FormState {
  [key: string]: any
}

interface TestCoverage {
  features: string[]
  scenarios: string[]
  environments: string[]
}

// ==================== CLI Interface ====================

export async function startLivingTestSystem(config: LivingTestConfig = {}): Promise<LivingTestSystem> {
  const system = new LivingTestSystem({
    captureDir: './living-test-captures',
    autoGenerateTests: true,
    patternThreshold: 3,
    enableVideoCapture: true,
    ...config
  })

  await system.startCaptureSession()
  return system
}

// Example usage:
// const livingTest = await startLivingTestSystem()
// // Do your development - the system watches and learns
// // When done:
// const report = await livingTest.stopCaptureSession()
// console.log(report)