#!/usr/bin/env node

// Regression Prevention - Feature Impact Analyzer
// Analyzes the potential impact of new features on existing functionality

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

class FeatureImpactAnalyzer {
  constructor(storyId, changedFiles = []) {
    this.storyId = storyId;
    this.changedFiles = changedFiles;
    this.impact = {
      storyId,
      affectedModules: [],
      apiEndpoints: [],
      databaseModels: [],
      roleWorkflows: [],
      criticalPaths: [],
      regressionRisk: 'LOW',
      recommendations: []
    };
  }

  async analyzeImpact() {
    colorLog('cyan', `🔍 Analyzing impact for Story ${this.storyId}`);
    console.log('='.repeat(50));

    // Get changed files if not provided
    if (this.changedFiles.length === 0) {
      this.changedFiles = this.getChangedFiles();
    }

    colorLog('blue', `📁 Analyzing ${this.changedFiles.length} changed files...`);

    for (const file of this.changedFiles) {
      await this.analyzeFile(file);
    }

    this.calculateRegressionRisk();
    this.generateRecommendations();
    
    return this.impact;
  }

  getChangedFiles() {
    try {
      // Get files changed in current branch compared to main
      const output = execSync('git diff --name-only main...HEAD', { encoding: 'utf8' });
      return output.trim().split('\n').filter(file => file.length > 0);
    } catch (error) {
      colorLog('yellow', '⚠️  Could not get git diff, analyzing all source files');
      // Fallback to analyzing all source files
      return this.getAllSourceFiles();
    }
  }

  getAllSourceFiles() {
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    const sourceDir = 'src';
    const files = [];

    function scanDirectory(dir) {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scanDirectory(fullPath);
        } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    }

    if (fs.existsSync(sourceDir)) {
      scanDirectory(sourceDir);
    }

    return files;
  }

  async analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(process.cwd(), filePath);

      // Determine file type and analyze accordingly
      if (filePath.includes('api/')) {
        this.analyzeApiFile(relativePath, content);
      } else if (filePath.includes('prisma/') || filePath.includes('schema.prisma')) {
        this.analyzeDatabaseFile(relativePath, content);
      } else if (filePath.includes('components/') || filePath.includes('pages/') || filePath.includes('app/')) {
        this.analyzeComponentFile(relativePath, content);
      } else if (filePath.includes('lib/') || filePath.includes('services/')) {
        this.analyzeServiceFile(relativePath, content);
      } else if (filePath.includes('types/')) {
        this.analyzeTypeFile(relativePath, content);
      }

      // Check for role-related changes
      this.analyzeRoleImpact(relativePath, content);

    } catch (error) {
      colorLog('yellow', `⚠️  Could not analyze file: ${filePath}`);
    }
  }

  analyzeApiFile(filePath, content) {
    colorLog('blue', `🔗 Analyzing API file: ${filePath}`);

    // Extract API endpoint paths
    const routeMatches = content.match(/\/api\/v[0-9]+\/[^\s'"`]+/g) || [];
    this.impact.apiEndpoints.push(...routeMatches);

    // Check for authentication/authorization
    if (content.includes('withAuth') || content.includes('requireRole') || content.includes('requirePermission')) {
      this.impact.roleWorkflows.push('AUTHENTICATION_CHANGED');
    }

    // Check for database operations
    if (content.includes('prisma.') || content.includes('db.')) {
      this.impact.databaseModels.push('DATABASE_OPERATIONS');
    }

    this.impact.affectedModules.push(filePath);
  }

  analyzeDatabaseFile(filePath, content) {
    colorLog('magenta', `🗄️  Analyzing database file: ${filePath}`);

    // Extract model names
    const modelMatches = content.match(/model\s+(\w+)/g) || [];
    const models = modelMatches.map(match => match.replace('model ', ''));
    this.impact.databaseModels.push(...models);

    // Check for schema changes
    if (content.includes('@update') || content.includes('@delete') || content.includes('@@map')) {
      this.impact.criticalPaths.push('SCHEMA_MODIFICATION');
    }

    this.impact.affectedModules.push(filePath);
  }

  analyzeComponentFile(filePath, content) {
    colorLog('green', `⚛️  Analyzing component file: ${filePath}`);

    // Check for shared components
    if (filePath.includes('shared/') || filePath.includes('common/')) {
      this.impact.criticalPaths.push('SHARED_COMPONENT_MODIFIED');
    }

    // Check for authentication usage
    if (content.includes('useAuth') || content.includes('AuthContext') || content.includes('getServerSession')) {
      this.impact.roleWorkflows.push('AUTH_COMPONENT_MODIFIED');
    }

    // Check for role-based rendering
    const roleMatches = content.match(/ASSESSOR|COORDINATOR|RESPONDER|DONOR|ADMIN/g) || [];
    if (roleMatches.length > 0) {
      this.impact.roleWorkflows.push(...roleMatches);
    }

    // Check for API calls
    const apiMatches = content.match(/\/api\/v[0-9]+\/[^\s'"`]+/g) || [];
    if (apiMatches.length > 0) {
      this.impact.apiEndpoints.push(...apiMatches);
    }

    this.impact.affectedModules.push(filePath);
  }

  analyzeServiceFile(filePath, content) {
    colorLog('yellow', `⚙️  Analyzing service file: ${filePath}`);

    // Check for authentication service
    if (filePath.includes('auth') || content.includes('AuthService')) {
      this.impact.roleWorkflows.push('AUTH_SERVICE_MODIFIED');
      this.impact.criticalPaths.push('AUTHENTICATION_CHANGED');
    }

    // Check for database services
    if (content.includes('prisma.') || content.includes('PrismaClient')) {
      this.impact.databaseModels.push('SERVICE_DATABASE_ACCESS');
    }

    // Check for role-based logic
    const roleMatches = content.match(/ASSESSOR|COORDINATOR|RESPONDER|DONOR|ADMIN/g) || [];
    if (roleMatches.length > 0) {
      this.impact.roleWorkflows.push(...roleMatches);
    }

    this.impact.affectedModules.push(filePath);
  }

  analyzeTypeFile(filePath, content) {
    colorLog('cyan', `📝 Analyzing type file: ${filePath}`);

    // Check for shared types
    if (content.includes('export') && (content.includes('interface') || content.includes('type'))) {
      this.impact.criticalPaths.push('SHARED_TYPES_MODIFIED');
    }

    this.impact.affectedModules.push(filePath);
  }

  analyzeRoleImpact(filePath, content) {
    // Check for role-specific changes
    const roles = ['ASSESSOR', 'COORDINATOR', 'RESPONDER', 'DONOR', 'ADMIN'];
    for (const role of roles) {
      if (content.includes(role) && !this.impact.roleWorkflows.includes(role)) {
        this.impact.roleWorkflows.push(role);
      }
    }
  }

  calculateRegressionRisk() {
    let riskScore = 0;

    // Database changes = high risk
    if (this.impact.databaseModels.length > 0) {
      riskScore += 30;
    }

    // Authentication changes = high risk
    if (this.impact.roleWorkflows.includes('AUTH_SERVICE_MODIFIED') || 
        this.impact.roleWorkflows.includes('AUTHENTICATION_CHANGED')) {
      riskScore += 25;
    }

    // API endpoint changes = medium risk
    if (this.impact.apiEndpoints.length > 0) {
      riskScore += 20;
    }

    // Shared component changes = medium risk
    if (this.impact.criticalPaths.includes('SHARED_COMPONENT_MODIFIED')) {
      riskScore += 15;
    }

    // Role workflow changes = medium risk
    if (this.impact.roleWorkflows.length > 2) {
      riskScore += 10;
    }

    // Type changes = low risk
    if (this.impact.criticalPaths.includes('SHARED_TYPES_MODIFIED')) {
      riskScore += 5;
    }

    // Determine risk level
    if (riskScore >= 40) {
      this.impact.regressionRisk = 'HIGH';
    } else if (riskScore >= 20) {
      this.impact.regressionRisk = 'MEDIUM';
    } else {
      this.impact.regressionRisk = 'LOW';
    }
  }

  generateRecommendations() {
    const recommendations = [];

    if (this.impact.databaseModels.length > 0) {
      recommendations.push({
        type: 'DATABASE',
        priority: 'HIGH',
        message: 'Database schema detected. Create migration scripts and test data integrity.',
        action: 'Create database migration tests and verify existing queries still work.'
      });
    }

    if (this.impact.roleWorkflows.includes('AUTH_SERVICE_MODIFIED') || 
        this.impact.roleWorkflows.includes('AUTHENTICATION_CHANGED')) {
      recommendations.push({
        type: 'AUTHENTICATION',
        priority: 'HIGH',
        message: 'Authentication system modified. Test all role-based workflows.',
        action: 'Run comprehensive authentication tests for all user roles.'
      });
    }

    if (this.impact.apiEndpoints.length > 0) {
      recommendations.push({
        type: 'API',
        priority: 'MEDIUM',
        message: 'API endpoints modified. Test endpoint compatibility.',
        action: 'Create integration tests for modified endpoints and check existing consumers.'
      });
    }

    if (this.impact.criticalPaths.includes('SHARED_COMPONENT_MODIFIED')) {
      recommendations.push({
        type: 'COMPONENTS',
        priority: 'MEDIUM',
        message: 'Shared components modified. Test all component usages.',
        action: 'Run component tests and verify all consuming components still work.'
      });
    }

    if (this.impact.roleWorkflows.length > 2) {
      recommendations.push({
        type: 'ROLES',
        priority: 'MEDIUM',
        message: 'Multiple role workflows affected. Test role-based access control.',
        action: 'Test all user roles and ensure permissions are correctly enforced.'
      });
    }

    if (this.impact.criticalPaths.includes('SHARED_TYPES_MODIFIED')) {
      recommendations.push({
        type: 'TYPES',
        priority: 'LOW',
        message: 'Shared types modified. Check for type compatibility.',
        action: 'Run TypeScript compilation and check for type errors in dependent modules.'
      });
    }

    // Add general recommendations based on risk level
    if (this.impact.regressionRisk === 'HIGH') {
      recommendations.push({
        type: 'GENERAL',
        priority: 'HIGH',
        message: 'High regression risk detected. Comprehensive testing required.',
        action: 'Create full regression test suite and run all tests before deployment.'
      });
    } else if (this.impact.regressionRisk === 'MEDIUM') {
      recommendations.push({
        type: 'GENERAL',
        priority: 'MEDIUM',
        message: 'Medium regression risk. Targeted testing recommended.',
        action: 'Focus tests on affected modules and critical user journeys.'
      });
    } else {
      recommendations.push({
        type: 'GENERAL',
        priority: 'LOW',
        message: 'Low regression risk. Standard testing procedures apply.',
        action: 'Run standard test suite and verify basic functionality.'
      });
    }

    this.impact.recommendations = recommendations;
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    colorLog('cyan', `📊 FEATURE IMPACT ANALYSIS REPORT`);
    console.log('='.repeat(60));
    
    console.log(`\n🎯 Story ID: ${this.storyId}`);
    console.log(`⚠️  Regression Risk: ${this.getRiskColor()}${this.impact.regressionRisk}${colors.reset}`);
    
    if (this.impact.affectedModules.length > 0) {
      console.log(`\n📁 Affected Modules (${this.impact.affectedModules.length}):`);
      this.impact.affectedModules.forEach(module => {
        console.log(`   • ${module}`);
      });
    }

    if (this.impact.apiEndpoints.length > 0) {
      console.log(`\n🔗 API Endpoints (${this.impact.apiEndpoints.length}):`);
      [...new Set(this.impact.apiEndpoints)].forEach(endpoint => {
        console.log(`   • ${endpoint}`);
      });
    }

    if (this.impact.databaseModels.length > 0) {
      console.log(`\n🗄️  Database Models/Operations (${this.impact.databaseModels.length}):`);
      [...new Set(this.impact.databaseModels)].forEach(model => {
        console.log(`   • ${model}`);
      });
    }

    if (this.impact.roleWorkflows.length > 0) {
      console.log(`\n👥 Role Workflows Affected (${this.impact.roleWorkflows.length}):`);
      [...new Set(this.impact.roleWorkflows)].forEach(workflow => {
        console.log(`   • ${workflow}`);
      });
    }

    if (this.impact.criticalPaths.length > 0) {
      console.log(`\n⚡ Critical Paths (${this.impact.criticalPaths.length}):`);
      [...new Set(this.impact.criticalPaths)].forEach(path => {
        console.log(`   • ${path}`);
      });
    }

    if (this.impact.recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`);
      this.impact.recommendations.forEach((rec, index) => {
        const priorityColor = rec.priority === 'HIGH' ? 'red' : 
                             rec.priority === 'MEDIUM' ? 'yellow' : 'green';
        console.log(`\n${index + 1}. ${colors[priorityColor]}[${rec.priority}]${colors.reset} ${rec.message}`);
        console.log(`   Action: ${rec.action}`);
      });
    }

    console.log('\n' + '='.repeat(60));
  }

  getRiskColor() {
    switch (this.impact.regressionRisk) {
      case 'HIGH': return colors.red;
      case 'MEDIUM': return colors.yellow;
      case 'LOW': return colors.green;
      default: return colors.reset;
    }
  }

  saveReport() {
    const reportDir = 'reports/feature-impact';
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(reportDir, `${this.storyId}-impact-${timestamp}.json`);
    
    fs.writeFileSync(reportPath, JSON.stringify(this.impact, null, 2));
    colorLog('green', `📄 Report saved to: ${reportPath}`);
    
    return reportPath;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    colorLog('red', '❌ Story ID is required');
    console.log('Usage: node feature-impact-analyzer.js <story-id> [file1 file2 ...]');
    console.log('Example: node feature-impact-analyzer.js 4.2 src/api/v1/responses/route.ts src/components/DeliveryForm.tsx');
    process.exit(1);
  }

  const storyId = args[0];
  const changedFiles = args.slice(1);

  const analyzer = new FeatureImpactAnalyzer(storyId, changedFiles);
  
  try {
    const impact = await analyzer.analyzeImpact();
    analyzer.generateReport();
    analyzer.saveReport();
    
    // Exit with appropriate code based on risk
    if (impact.regressionRisk === 'HIGH') {
      colorLog('red', '\n🚨 High regression risk detected. Please review recommendations before proceeding.');
      process.exit(1);
    } else if (impact.regressionRisk === 'MEDIUM') {
      colorLog('yellow', '\n⚠️  Medium regression risk. Review recommendations and proceed with caution.');
      process.exit(0);
    } else {
      colorLog('green', '\n✅ Low regression risk. Proceed with standard development procedures.');
      process.exit(0);
    }
  } catch (error) {
    colorLog('red', `❌ Error during analysis: ${error.message}`);
    process.exit(1);
  }
}

// Export for use as module
module.exports = FeatureImpactAnalyzer;

// Run if called directly
if (require.main === module) {
  main();
}