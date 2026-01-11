/**
 * Living Test System API Routes
 * 
 * These endpoints provide the backend API for the Living Test Dashboard
 * and other tools that need to interact with the living test system.
 */

import { NextRequest, NextResponse } from 'next/server'
import { LivingTestSystem } from '@/lib/testing/living-test-system'
import { FixValidator } from '@/lib/testing/fix-validator'
import * as fs from 'fs/promises'
import * as path from 'path'

// Global instance for the active capture session
let activeSession: LivingTestSystem | null = null

// ==================== Status Endpoint ====================

export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), '.living-test-data.json')
    const patternsPath = path.join(process.cwd(), '.living-test-patterns.json')
    
    let data: any = { fixes: [], testsGenerated: 0, patternsIdentified: 0 }
    let patterns: any[] = []
    
    // Load existing data
    try {
      const rawData = await fs.readFile(dataPath, 'utf-8')
      data = JSON.parse(rawData)
    } catch {
      // No existing data, use defaults
    }
    
    // Load patterns
    try {
      const rawPatterns = await fs.readFile(patternsPath, 'utf-8')
      patterns = JSON.parse(rawPatterns)
    } catch {
      // No existing patterns
    }
    
    // Generate coverage analysis
    const coverage = await generateCoverageAnalysis(data.fixes || [])
    
    // Calculate stats
    const stats = {
      totalFixes: data.fixes?.length || 0,
      testsGenerated: data.testsGenerated || 0,
      patternsIdentified: patterns.length,
      coverageGap: calculateCoverageGap(coverage),
      qualityScore: calculateAverageQuality(data.fixes || []),
      regressionRisk: calculateRegressionRisk(data.fixes || [], patterns),
      activeSession: activeSession !== null
    }
    
    return NextResponse.json({
      stats,
      fixes: (data.fixes || []).slice(-10), // Last 10 fixes
      patterns: patterns.slice(-10), // Last 10 patterns
      coverage,
      lastUpdate: Date.now()
    })
    
  } catch (error) {
    console.error('Error in living-tests status endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to load living test data' },
      { status: 500 }
    )
  }
}

// ==================== Start Capture Session ====================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url = 'http://localhost:3006', context } = body
    
    if (activeSession) {
      return NextResponse.json(
        { error: 'Capture session already active' },
        { status: 400 }
      )
    }
    
    // Start new capture session
    activeSession = new LivingTestSystem({
      captureDir: './living-test-captures',
      autoGenerateTests: true,
      patternThreshold: 3,
      enableVideoCapture: true
    })
    
    await activeSession.startCaptureSession({ taskDescription: context })
    
    // Setup event handlers to capture data
    activeSession.on('fix:captured', async (fix) => {
      await saveFixToStorage(fix)
    })
    
    activeSession.on('session:ended', async (report) => {
      await saveReportToStorage(report)
      activeSession = null
    })
    
    return NextResponse.json({
      success: true,
      message: 'Capture session started',
      sessionId: `session_${Date.now()}`
    })
    
  } catch (error) {
    console.error('Error starting capture session:', error)
    return NextResponse.json(
      { error: 'Failed to start capture session' },
      { status: 500 }
    )
  }
}

// ==================== Stop Capture Session ====================

export async function DELETE() {
  try {
    if (!activeSession) {
      return NextResponse.json(
        { error: 'No active capture session' },
        { status: 400 }
      )
    }
    
    const report = await activeSession.stopCaptureSession()
    activeSession = null
    
    return NextResponse.json({
      success: true,
      message: 'Capture session stopped',
      report
    })
    
  } catch (error) {
    console.error('Error stopping capture session:', error)
    return NextResponse.json(
      { error: 'Failed to stop capture session' },
      { status: 500 }
    )
  }
}

// ==================== Helper Functions ====================

async function saveFixToStorage(fix: any): Promise<void> {
  const dataPath = path.join(process.cwd(), '.living-test-data.json')
  
  let data: any = { fixes: [], testsGenerated: 0, patternsIdentified: 0 }
  
  try {
    const rawData = await fs.readFile(dataPath, 'utf-8')
    data = JSON.parse(rawData)
  } catch {
    // File doesn't exist, use defaults
  }
  
  // Add the new fix
  data.fixes = data.fixes || []
  data.fixes.push({
    id: fix.id,
    timestamp: fix.timestamp,
    description: fix.description,
    feature: inferFeatureFromFix(fix),
    severity: inferSeverityFromFix(fix),
    testGenerated: !!fix.generatedTest,
    patternMatched: false, // Would be determined by pattern matching
    qualityScore: fix.validation?.fixComprehensiveness || 0
  })
  
  // Update counters
  if (fix.generatedTest) {
    data.testsGenerated = (data.testsGenerated || 0) + 1
  }
  
  data.lastCapture = Date.now()
  
  // Save back to file
  await fs.writeFile(dataPath, JSON.stringify(data, null, 2))
}

async function saveReportToStorage(report: any): Promise<void> {
  const reportsPath = path.join(process.cwd(), '.living-test-reports.json')
  
  let reports: any[] = []
  
  try {
    const rawData = await fs.readFile(reportsPath, 'utf-8')
    reports = JSON.parse(rawData)
  } catch {
    // File doesn't exist, create new array
  }
  
  reports.push({
    timestamp: Date.now(),
    ...report
  })
  
  // Keep only last 10 reports
  if (reports.length > 10) {
    reports = reports.slice(-10)
  }
  
  await fs.writeFile(reportsPath, JSON.stringify(reports, null, 2))
}

async function generateCoverageAnalysis(fixes: any[]): Promise<any[]> {
  // This would analyze the gap between test expectations and reality
  const coverage: any[] = []
  
  // Group fixes by feature
  const fixesByFeature = fixes.reduce((acc, fix) => {
    const feature = inferFeatureFromFix(fix)
    if (!acc[feature]) acc[feature] = []
    acc[feature].push(fix)
    return acc
  }, {} as Record<string, any[]>)
  
  // Generate coverage analysis for each feature
  for (const [feature, featureFixes] of Object.entries(fixesByFeature)) {
    const fixes = featureFixes as any[];
    coverage.push({
      feature,
      expectedBehavior: getExpectedBehavior(feature),
      actualBehavior: getActualBehavior(feature, fixes),
      testPasses: true, // Assume tests pass (that's the problem we're solving)
      actuallyWorks: fixes.length < 3, // If many fixes needed, probably broken
      gap: fixes.length > 5 ? 'complete' : fixes.length > 2 ? 'partial' : 'none',
      fixRequired: fixes.length > 2,
      automationPotential: Math.min(fixes.length * 20, 90)
    })
  }
  
  return coverage
}

function calculateCoverageGap(coverage: any[]): number {
  if (coverage.length === 0) return 0
  
  const totalGap = coverage.reduce((sum, item) => {
    switch (item.gap) {
      case 'complete': return sum + 100
      case 'partial': return sum + 50
      case 'none': return sum + 0
      default: return sum
    }
  }, 0)
  
  return Math.round(totalGap / coverage.length)
}

function calculateAverageQuality(fixes: any[]): number {
  if (fixes.length === 0) return 100
  
  const totalQuality = fixes.reduce((sum, fix) => {
    return sum + (fix.validation?.fixComprehensiveness || 0)
  }, 0)
  
  return Math.round(totalQuality / fixes.length)
}

function calculateRegressionRisk(fixes: any[], patterns: any[]): number {
  let risk = 20 // Base risk
  
  // More fixes = higher risk
  risk += Math.min(fixes.length * 2, 40)
  
  // More patterns = higher complexity
  risk += Math.min(patterns.length * 5, 30)
  
  // Recent fixes increase risk
  const recentFixes = fixes.filter(f => Date.now() - f.timestamp < 24 * 60 * 60 * 1000)
  risk += Math.min(recentFixes.length * 3, 10)
  
  return Math.min(risk, 100)
}

function inferFeatureFromFix(fix: any): string {
  const description = (fix.description || '').toLowerCase()
  const url = (fix.url || '').toLowerCase()
  
  if (description.includes('delivery') || url.includes('delivery')) return 'delivery-workflow'
  if (description.includes('auth') || url.includes('auth')) return 'authentication'
  if (description.includes('planning') || url.includes('planning')) return 'response-planning'
  if (description.includes('dashboard') || url.includes('dashboard')) return 'dashboard'
  if (description.includes('gps') || description.includes('location')) return 'gps-capture'
  if (description.includes('media') || description.includes('photo')) return 'media-upload'
  
  return 'unknown-feature'
}

function inferSeverityFromFix(fix: any): 'low' | 'medium' | 'high' | 'critical' {
  const description = (fix.description || '').toLowerCase()
  const actionsCount = fix.actions?.length || 0
  
  if (description.includes('critical') || description.includes('security') || description.includes('data loss')) {
    return 'critical'
  }
  
  if (description.includes('high') || description.includes('urgent') || actionsCount > 10) {
    return 'high'
  }
  
  if (description.includes('medium') || actionsCount > 5) {
    return 'medium'
  }
  
  return 'low'
}

function getExpectedBehavior(feature: string): string {
  const behaviors: Record<string, string> = {
    'delivery-workflow': 'Delivery confirmation should work seamlessly online and offline',
    'authentication': 'Users should be able to login and switch roles without issues',
    'response-planning': 'Response planning forms should validate and save correctly',
    'dashboard': 'Dashboard should display current data and allow navigation',
    'gps-capture': 'GPS location should be captured accurately and quickly',
    'media-upload': 'Photos and media should upload and validate properly'
  }
  
  return behaviors[feature] || 'Feature should work as expected'
}

function getActualBehavior(feature: string, fixes: any[]): string {
  if (fixes.length === 0) return 'Works as expected'
  
  // Analyze the fixes to determine actual behavior
  const issues = fixes.map(f => f.description).slice(-3) // Last 3 issues
  
  if (issues.length === 1) return `Issue: ${issues[0]}`
  if (issues.length === 2) return `Issues: ${issues.join(' and ')}`
  return `Multiple issues: ${issues.slice(0, 2).join(', ')} and ${issues.length - 2} more`
}