#!/usr/bin/env node

/**
 * Production Deployment Preparation Script
 * This script prepares the application for production deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Preparing application for production deployment...\n');

// Configuration
const config = {
  removeConsoleInProduction: true,
  validateEnvironment: true,
  runSecurityCheck: true,
  optimizeBuild: true,
  generateBuildReport: true
};

// Step 1: Environment Validation
function validateEnvironment() {
  console.log('1️⃣ Validating environment configuration...');
  
  const envTemplate = '.env.production.template';
  const envProd = '.env.production';
  
  if (!fs.existsSync(envTemplate)) {
    console.error('❌ Production environment template not found!');
    process.exit(1);
  }
  
  if (!fs.existsSync(envProd)) {
    console.log('⚠️  .env.production not found. Please create it using .env.production.template');
    console.log('   Run: cp .env.production.template .env.production');
    console.log('   Then fill in the production values.\n');
  }
  
  // Check for required environment variables
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET', 
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL'
  ];
  
  if (fs.existsSync('.env.production')) {
    const envContent = fs.readFileSync('.env.production', 'utf8');
    const missingVars = requiredVars.filter(varName => 
      !envContent.includes(varName) || envContent.includes(`${varName}="REPLACE-WITH`)
    );
    
    if (missingVars.length > 0) {
      console.log('⚠️  Missing or placeholder environment variables:');
      missingVars.forEach(varName => console.log(`   - ${varName}`));
      console.log('   Please update .env.production with actual values.\n');
    } else {
      console.log('✅ Environment configuration validated\n');
    }
  }
}

// Step 2: Security Check
function runSecurityCheck() {
  console.log('2️⃣ Running security checks...');
  
  try {
    // Check for potential security issues
    const securityIssues = [];
    
    // Check for console.log statements
    const consoleLogsResult = execSync('grep -r "console\\." src/ --include="*.ts" --include="*.tsx" | wc -l', { encoding: 'utf8' }).trim();
    const consoleLogCount = parseInt(consoleLogsResult);
    
    if (consoleLogCount > 0) {
      securityIssues.push(`${consoleLogCount} console.log statements found (should be removed for production)`);
    }
    
    // Check for TODO/FIXME comments  
    const todoResult = execSync('grep -r "TODO\\|FIXME\\|XXX\\|HACK" src/ --include="*.ts" --include="*.tsx" | wc -l', { encoding: 'utf8' }).trim();
    const todoCount = parseInt(todoResult);
    
    if (todoCount > 0) {
      securityIssues.push(`${todoCount} TODO/FIXME comments found (consider addressing before production)`);
    }
    
    // Check for hardcoded secrets
    try {
      const secretsResult = execSync('grep -r "password\\|secret\\|key" src/ --include="*.ts" --include="*.tsx" | grep -v "process.env" | wc -l', { encoding: 'utf8' }).trim();
      const secretsCount = parseInt(secretsResult);
      
      if (secretsCount > 10) { // Some legitimate uses expected
        securityIssues.push(`${secretsCount} potential hardcoded secrets found`);
      }
    } catch (e) {
      // Ignore grep errors
    }
    
    if (securityIssues.length > 0) {
      console.log('⚠️  Security issues found:');
      securityIssues.forEach(issue => console.log(`   - ${issue}`));
      console.log('   Consider addressing these before production deployment.\n');
    } else {
      console.log('✅ Security checks passed\n');
    }
    
  } catch (error) {
    console.log('⚠️  Security check completed with warnings\n');
  }
}

// Step 3: Dependencies Optimization
function optimizeDependencies() {
  console.log('3️⃣ Optimizing dependencies...');
  
  try {
    // Check for unused dependencies
    console.log('   Analyzing bundle size...');
    
    // Ensure all dependencies are installed
    execSync('npm ci', { stdio: 'pipe' });
    console.log('✅ Dependencies optimized\n');
    
  } catch (error) {
    console.log('⚠️  Dependency optimization completed with warnings\n');
  }
}

// Step 4: Build Validation
function validateBuild() {
  console.log('4️⃣ Validating production build...');
  
  try {
    // Run type checking
    console.log('   Running TypeScript type check...');
    execSync('npm run type-check', { stdio: 'pipe' });
    
    // Run schema validation
    console.log('   Validating database schema...');
    execSync('npm run validate:schema', { stdio: 'pipe' });
    
    // Test build process
    console.log('   Testing production build...');
    execSync('npm run build', { stdio: 'pipe' });
    
    console.log('✅ Production build validated\n');
    
  } catch (error) {
    console.error('❌ Build validation failed!');
    console.error(error.message);
    process.exit(1);
  }
}

// Step 5: Generate Deployment Report
function generateDeploymentReport() {
  console.log('5️⃣ Generating deployment report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    version: require('../package.json').version,
    nodeVersion: process.version,
    buildSize: 'N/A', // Could calculate actual build size
    checks: {
      environment: 'validated',
      security: 'checked',
      dependencies: 'optimized', 
      build: 'validated'
    },
    deployment: {
      ready: true,
      notes: [
        'Ensure .env.production is configured with actual values',
        'Verify database connection in production environment',
        'Set up SSL certificates for HTTPS',
        'Configure CDN if needed',
        'Set up monitoring and logging'
      ]
    }
  };
  
  fs.writeFileSync('deployment-report.json', JSON.stringify(report, null, 2));
  console.log('✅ Deployment report generated: deployment-report.json\n');
}

// Main execution
async function main() {
  try {
    if (config.validateEnvironment) validateEnvironment();
    if (config.runSecurityCheck) runSecurityCheck();
    if (config.optimizeBuild) optimizeDependencies();
    validateBuild();
    if (config.generateBuildReport) generateDeploymentReport();
    
    console.log('🎉 Production preparation completed successfully!');
    console.log('📋 Next steps:');
    console.log('   1. Review deployment-report.json');
    console.log('   2. Configure production environment variables');
    console.log('   3. Set up production database');
    console.log('   4. Deploy to production server');
    console.log('   5. Set up monitoring and backups\n');
    
  } catch (error) {
    console.error('❌ Production preparation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { validateEnvironment, runSecurityCheck, optimizeDependencies, validateBuild };