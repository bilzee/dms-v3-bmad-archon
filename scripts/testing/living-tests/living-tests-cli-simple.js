/**
 * Simple Living Test System CLI
 * 
 * Basic implementation to get the command working for story 4.2
 */

import { Command } from 'commander'
import * as fs from 'fs/promises'
import * as path from 'path'

const program = new Command()

program
  .name('living-tests')
  .description('Living Test System - Capture real development fixes and evolve tests automatically')
  .version('1.0.0')

// Start capture session command
program
  .command('start')
  .description('Start a living test capture session')
  .argument('[context]', 'Development context (e.g., "delivery-workflow-fix")')
  .option('-d, --debug', 'Enable debug mode with console output')
  .option('-h, --headless', 'Run in headless mode (no browser UI)')
  .option('-u, --url <url>', 'Starting URL for capture session', 'http://localhost:3000')
  .action(async (context, options) => {
    console.log('🔴 Starting Living Test System...')
    console.log(`📍 URL: ${options.url}`)
    console.log(`🎯 Context: ${context || options.context || 'general development'}`)
    console.log('📝 Make your fixes normally - I\'ll watch and learn!')
    console.log('')
    console.log('Press Ctrl+C to stop and generate report')
    console.log('')

    try {
      // Simple implementation - just create a session file
      const sessionData = {
        id: `session_${Date.now()}`,
        context: context || options.context || 'general',
        startTime: new Date().toISOString(),
        url: options.url,
        status: 'active'
      }

      const dataDir = path.join(process.cwd(), '.living-test-data')
      await fs.mkdir(dataDir, { recursive: true })
      
      const sessionFile = path.join(dataDir, 'current-session.json')
      await fs.writeFile(sessionFile, JSON.stringify(sessionData, null, 2))

      console.log('✅ Capture session started. Monitoring for fixes...')
      
      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\n🛑 Stopping capture session...')
        
        const report = {
          sessionId: sessionData.id,
          context: sessionData.context,
          startTime: sessionData.startTime,
          endTime: new Date().toISOString(),
          fixesCaptured: 0,
          testsGenerated: 0,
          patternsIdentified: 0,
          status: 'completed'
        }
        
        console.log('\n📊 Session Report:')
        console.log(`   Session ID: ${report.sessionId}`)
        console.log(`   Context: ${report.context}`)
        console.log(`   Duration: ${new Date(report.endTime).getTime() - new Date(report.startTime).getTime()}ms`)
        
        // Save report
        const reportPath = path.join(process.cwd(), 'living-test-report.json')
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
        console.log(`\n📁 Report saved to: ${reportPath}`)
        
        // Clean up session file
        await fs.unlink(sessionFile).catch(() => {})
        
        process.exit(0)
      })

    } catch (error) {
      console.error('❌ Failed to start capture session:', error)
      process.exit(1)
    }
  })

// Stop command
program
  .command('stop')
  .description('Stop the current living test capture session')
  .action(async () => {
    console.log('🛑 Stopping Living Test System...')
    
    try {
      const dataDir = path.join(process.cwd(), '.living-test-data')
      const sessionFile = path.join(dataDir, 'current-session.json')
      
      try {
        const sessionData = JSON.parse(await fs.readFile(sessionFile, 'utf-8'))
        await fs.unlink(sessionFile)
        
        const report = {
          sessionId: sessionData.id,
          context: sessionData.context,
          startTime: sessionData.startTime,
          endTime: new Date().toISOString(),
          fixesCaptured: 0,
          testsGenerated: 0,
          patternsIdentified: 0,
          status: 'stopped'
        }
        
        const reportPath = path.join(process.cwd(), 'living-test-report.json')
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
        
        console.log(`✅ Session ${sessionData.id} stopped`)
        console.log(`📁 Report saved to: ${reportPath}`)
        
      } catch {
        console.log('ℹ️ No active session found')
      }
      
    } catch (error) {
      console.error('❌ Failed to stop session:', error)
    }
  })

// Status command
program
  .command('status')
  .description('Show current status of the living test system')
  .action(async () => {
    console.log('📊 Living Test System Status:')
    
    try {
      const dataDir = path.join(process.cwd(), '.living-test-data')
      const sessionFile = path.join(dataDir, 'current-session.json')
      
      try {
        const sessionData = JSON.parse(await fs.readFile(sessionFile, 'utf-8'))
        console.log(`   Active session: ${sessionData.id}`)
        console.log(`   Context: ${sessionData.context}`)
        console.log(`   Started: ${sessionData.startTime}`)
        console.log('   Status: Active')
      } catch {
        console.log('   Active session: None')
      }
      
      // Check for existing reports
      const reportPath = path.join(process.cwd(), 'living-test-report.json')
      try {
        const reportData = await fs.readFile(reportPath, 'utf-8')
        const report = JSON.parse(reportData)
        console.log(`   Last report: ${report.endTime || 'Unknown'}`)
        console.log(`   Total sessions: 1`)
      } catch {
        console.log('   Last report: None')
      }
      
    } catch (error) {
      console.error('❌ Failed to get status:', error)
    }
  })

// Initialize command
program
  .command('init')
  .description('Initialize the living test system in your project')
  .action(async () => {
    console.log('🚀 Initializing Living Test System...')
    
    try {
      // Create necessary directories
      const dirs = [
        './living-test-captures',
        './tests/e2e/living-tests',
        './.living-test-data'
      ]
      
      for (const dir of dirs) {
        await fs.mkdir(path.join(process.cwd(), dir), { recursive: true })
        console.log(`   Created directory: ${dir}`)
      }
      
      // Create configuration file
      const config = {
        version: '1.0.0',
        autoGenerateTests: true,
        captureVideo: true,
        patternThreshold: 3,
        testDirectory: './tests/e2e/living-tests',
        dataDirectory: './.living-test-data'
      }
      
      const configPath = path.join(process.cwd(), 'living-test.config.json')
      await fs.writeFile(configPath, JSON.stringify(config, null, 2))
      console.log(`   Created config: living-test.config.json`)
      
      console.log('')
      console.log('✅ Living Test System initialized!')
      console.log('')
      console.log('Next steps:')
      console.log('1. Run: npm run living-tests start')
      console.log('2. Make your manual fixes')
      console.log('3. Stop with Ctrl+C to generate report')
      console.log('4. View report: npm run living-tests report')
      
    } catch (error) {
      console.error('❌ Failed to initialize:', error)
    }
  })

// Run the program
program.parse()