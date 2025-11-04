#!/usr/bin/env node

// Regression Prevention - Development Validator
// Real-time validation system for development changes

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

class DevelopmentValidator {
  constructor() {
    this.validationResults = [];
    this.warnings = [];
    this.errors = [];
  }

  async validateChange(filePath, change = null) {
    colorLog('cyan', `🔍 Validating change: ${filePath}`);
    
    this.validationResults = [];
    this.warnings = [];
    this.errors = [];

    try {
      // Read file content
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Analyze impact
      const impact = await this.analyzeImpact(filePath, content);
      
      // Run validation checks based on impact
      await this.runValidationChecks(filePath, content, impact);
      
      // Generate report
      this.generateValidationReport();
      
      return {
        success: this.errors.length === 0,
        warnings: this.warnings,
        errors: this.errors,
        results: this.validationResults
      };
      
    } catch (error) {
      colorLog('red', `❌ Error validating ${filePath}: ${error.message}`);
      return {
        success: false,
        error: error.message,
        warnings: this.warnings,
        errors: [...this.errors, error.message]
      };
    }
  }

  async analyzeImpact(filePath, content) {
    const impact = {
      affectsAuthentication: false,
      affectsAPIRoutes: false,
      affectsDatabase: false,
      affectsRoles: false,
      affectsComponents: false,
      affectsTypes: false,
      fileCategory: this.categorizeFile(filePath)
    };

    // Check for authentication impact
    if (content.includes('withAuth') || 
        content.includes('requireRole') || 
        content.includes('AuthService') ||
        content.includes('getServerSession') ||
        filePath.includes('auth')) {
      impact.affectsAuthentication = true;
    }

    // Check for API route impact
    if (filePath.includes('api/') || content.includes('export async function')) {
      impact.affectsAPIRoutes = true;
    }

    // Check for database impact
    if (content.includes('prisma.') || 
        content.includes('PrismaClient') ||
        filePath.includes('prisma/')) {
      impact.affectsDatabase = true;
    }

    // Check for role impact
    const roles = ['ASSESSOR', 'COORDINATOR', 'RESPONDER', 'DONOR', 'ADMIN'];
    if (roles.some(role => content.includes(role))) {
      impact.affectsRoles = true;
    }

    // Check for component impact
    if (filePath.includes('components/') || 
        filePath.includes('pages/') || 
        filePath.includes('app/') ||
        content.includes('React.') ||
        content.includes('export function') ||
        content.includes('export const')) {
      impact.affectsComponents = true;
    }

    // Check for type impact
    if (filePath.includes('types/') || 
        content.includes('interface ') ||
        content.includes('type ') ||
        content.includes('export type')) {
      impact.affectsTypes = true;
    }

    return impact;
  }

  categorizeFile(filePath) {
    if (filePath.includes('api/')) return 'API';
    if (filePath.includes('components/')) return 'COMPONENT';
    if (filePath.includes('lib/')) return 'LIBRARY';
    if (filePath.includes('types/')) return 'TYPES';
    if (filePath.includes('app/')) return 'PAGE';
    if (filePath.includes('prisma/')) return 'DATABASE';
    if (filePath.includes('hooks/')) return 'HOOKS';
    if (filePath.includes('utils/')) return 'UTILS';
    return 'OTHER';
  }

  async runValidationChecks(filePath, content, impact) {
    colorLog('blue', `🔧 Running validation checks for ${impact.fileCategory} file...`);

    // 1. TypeScript Compilation Check
    await this.checkTypeScriptCompilation(filePath);

    // 2. Import/Export Validation
    await this.validateImportsExports(filePath, content);

    // 3. Category-specific checks
    if (impact.affectsAuthentication) {
      await this.validateAuthenticationWorkflows(filePath, content);
    }

    if (impact.affectsAPIRoutes) {
      await this.validateAPIEndpoints(filePath, content);
    }

    if (impact.affectsDatabase) {
      await this.validateDatabaseOperations(filePath, content);
    }

    if (impact.affectsRoles) {
      await this.validateRoleBasedAccess(filePath, content);
    }

    if (impact.affectsComponents) {
      await this.validateComponents(filePath, content);
    }

    if (impact.affectsTypes) {
      await this.validateTypes(filePath, content);
    }

    // 4. Security checks
    await this.validateSecurity(filePath, content);

    // 5. Performance checks
    await this.validatePerformance(filePath, content);
  }

  async checkTypeScriptCompilation(filePath) {
    try {
      execSync(`npx tsc --noEmit --skipLibCheck ${filePath}`, { stdio: 'pipe' });
      this.validationResults.push({
        check: 'TypeScript Compilation',
        status: 'PASS',
        message: 'No TypeScript errors found'
      });
    } catch (error) {
      const errors = error.stdout ? error.stdout.toString() : error.message;
      this.errors.push(`TypeScript compilation failed: ${errors}`);
      this.validationResults.push({
        check: 'TypeScript Compilation',
        status: 'FAIL',
        message: errors
      });
    }
  }

  async validateImportsExports(filePath, content) {
    const imports = content.match(/import.*from\s+['"][^'"]+['"]/g) || [];
    const exports = content.match(/export\s+(default\s+)?(function|const|let|var|class|interface|type)/g) || [];
    
    // Check for missing imports
    const missingImports = [];
    for (const importStmt of imports) {
      const importPath = importStmt.match(/from\s+['"][^'"]+['"]/)[0].replace(/from\s+['"]|['"]/g, '');
      
      if (importPath.startsWith('@/')) {
        const fullPath = path.join(process.cwd(), 'src', importPath.slice(2));
        if (!fs.existsSync(fullPath) && !fs.existsSync(fullPath + '.ts') && !fs.existsSync(fullPath + '.tsx')) {
          missingImports.push(importPath);
        }
      }
    }

    if (missingImports.length === 0) {
      this.validationResults.push({
        check: 'Import/Export Validation',
        status: 'PASS',
        message: 'All imports resolved correctly'
      });
    } else {
      this.errors.push(`Missing imports: ${missingImports.join(', ')}`);
      this.validationResults.push({
        check: 'Import/Export Validation',
        status: 'FAIL',
        message: `Missing imports: ${missingImports.join(', ')}`
      });
    }
  }

  async validateAuthenticationWorkflows(filePath, content) {
    const checks = [];

    // Check for proper error handling in authentication
    if (content.includes('withAuth') || content.includes('requireRole')) {
      if (content.includes('try') && content.includes('catch')) {
        checks.push('Authentication error handling found');
      } else {
        this.warnings.push('Authentication logic should include proper error handling');
        checks.push('Missing authentication error handling');
      }
    }

    // Check for role validation
    const roles = ['ASSESSOR', 'COORDINATOR', 'RESPONDER', 'DONOR', 'ADMIN'];
    const foundRoles = roles.filter(role => content.includes(role));
    
    if (foundRoles.length > 0) {
      checks.push(`Role validation for: ${foundRoles.join(', ')}`);
      
      // Check if roles are properly validated
      if (content.includes('requireRole') || content.includes('user.role')) {
        checks.push('Role validation implementation found');
      } else {
        this.warnings.push('Roles found but no validation logic detected');
      }
    }

    this.validationResults.push({
      check: 'Authentication Workflow Validation',
      status: this.warnings.length === 0 ? 'PASS' : 'WARN',
      message: checks.join('; ') || 'No authentication-specific validations needed'
    });
  }

  async validateAPIEndpoints(filePath, content) {
    const checks = [];

    // Check for HTTP method exports
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    const foundMethods = methods.filter(method => 
      content.includes(`export async function ${method}`) || 
      content.includes(`export function ${method}`)
    );

    if (foundMethods.length > 0) {
      checks.push(`HTTP methods implemented: ${foundMethods.join(', ')}`);

      // Check for request validation
      if (content.includes('z.') || content.includes('joi') || content.includes('validation')) {
        checks.push('Request validation found');
      } else {
        this.warnings.push('API endpoints should include request validation');
      }

      // Check for error handling
      if (content.includes('try') && content.includes('catch')) {
        checks.push('Error handling found');
      } else {
        this.warnings.push('API endpoints should include proper error handling');
      }

      // Check for authentication middleware
      if (content.includes('withAuth') || content.includes('requireRole')) {
        checks.push('Authentication middleware found');
      } else {
        this.warnings.push('API endpoints should include authentication');
      }

      // Check for proper response format
      if (content.includes('NextResponse.json') || content.includes('Response.json')) {
        checks.push('Proper JSON response format');
      } else {
        this.warnings.push('API endpoints should return JSON responses');
      }
    }

    this.validationResults.push({
      check: 'API Endpoint Validation',
      status: this.warnings.length === 0 ? 'PASS' : 'WARN',
      message: checks.join('; ') || 'No API endpoints detected'
    });
  }

  async validateDatabaseOperations(filePath, content) {
    const checks = [];

    // Check for Prisma usage
    if (content.includes('prisma.')) {
      checks.push('Prisma client usage detected');

      // Check for error handling
      if (content.includes('try') && content.includes('catch')) {
        checks.push('Database error handling found');
      } else {
        this.warnings.push('Database operations should include error handling');
      }

      // Check for transaction usage when appropriate
      if (content.includes('create') && content.includes('update')) {
        if (content.includes('$transaction')) {
          checks.push('Database transaction usage found');
        } else {
          this.warnings.push('Multiple database operations should use transactions');
        }
      }

      // Check for proper connection handling
      if (content.includes('PrismaClient')) {
        checks.push('Proper Prisma client usage');
      }
    }

    this.validationResults.push({
      check: 'Database Operation Validation',
      status: this.warnings.length === 0 ? 'PASS' : 'WARN',
      message: checks.join('; ') || 'No database operations detected'
    });
  }

  async validateRoleBasedAccess(filePath, content) {
    const checks = [];
    const roles = ['ASSESSOR', 'COORDINATOR', 'RESPONDER', 'DONOR', 'ADMIN'];
    const foundRoles = roles.filter(role => content.includes(role));

    if (foundRoles.length > 0) {
      checks.push(`Roles referenced: ${foundRoles.join(', ')}`);

      // Check for proper role validation
      if (content.includes('requireRole') || content.includes('hasRole') || content.includes('user.role')) {
        checks.push('Role validation logic found');
      } else {
        this.warnings.push('Role references found but no validation logic');
      }

      // Check for role-based conditional rendering (for components)
      if (content.includes('&&') && foundRoles.some(role => content.includes(role))) {
        checks.push('Role-based conditional logic found');
      }
    }

    this.validationResults.push({
      check: 'Role-Based Access Validation',
      status: this.warnings.length === 0 ? 'PASS' : 'WARN',
      message: checks.join('; ') || 'No role-based access logic detected'
    });
  }

  async validateComponents(filePath, content) {
    const checks = [];

    // Check for React component patterns
    if (content.includes('React.FC') || content.includes('function') && content.includes('return')) {
      checks.push('React component structure found');

      // Check for prop types
      if (content.includes('interface') || content.includes('type')) {
        checks.push('Component props defined');
      } else {
        this.warnings.push('Components should have defined prop types');
      }

      // Check for default exports
      if (content.includes('export default')) {
        checks.push('Default export found');
      } else {
        this.warnings.push('Components should use default export');
      }

      // Check for error boundaries (optional but good practice)
      if (content.includes('ErrorBoundary') || content.includes('componentDidCatch')) {
        checks.push('Error boundary handling found');
      }
    }

    // Check for accessibility
    if (content.includes('aria-') || content.includes('alt=') || content.includes('htmlFor=')) {
      checks.push('Accessibility attributes found');
    } else {
      this.warnings.push('Consider adding accessibility attributes');
    }

    this.validationResults.push({
      check: 'Component Validation',
      status: this.warnings.length === 0 ? 'PASS' : 'WARN',
      message: checks.join('; ') || 'No React component detected'
    });
  }

  async validateTypes(filePath, content) {
    const checks = [];

    // Check for type definitions
    if (content.includes('interface ') || content.includes('type ')) {
      checks.push('Type definitions found');

      // Check for export
      if (content.includes('export interface') || content.includes('export type')) {
        checks.push('Types properly exported');
      } else {
        this.warnings.push('Consider exporting types for reuse');
      }

      // Check for proper naming conventions
      const interfaces = content.match(/interface\s+(\w+)/g) || [];
      const types = content.match(/type\s+(\w+)/g) || [];
      
      if (interfaces.length > 0) {
        const pascalCaseInterfaces = interfaces.filter(iface => 
          iface.replace('interface ', '').match(/^[A-Z][a-zA-Z0-9]*$/)
        );
        
        if (pascalCaseInterfaces.length === interfaces.length) {
          checks.push('Proper interface naming (PascalCase)');
        } else {
          this.warnings.push('Interfaces should use PascalCase naming');
        }
      }
    }

    this.validationResults.push({
      check: 'Type Definition Validation',
      status: this.warnings.length === 0 ? 'PASS' : 'WARN',
      message: checks.join('; ') || 'No type definitions found'
    });
  }

  async validateSecurity(filePath, content) {
    const checks = [];
    const securityIssues = [];

    // Check for hardcoded secrets
    const secretPatterns = [
      /password\s*=\s*['"][^'"]+['"]/i,
      /api_key\s*=\s*['"][^'"]+['"]/i,
      /secret\s*=\s*['"][^'"]+['"]/i,
      /token\s*=\s*['"][^'"]+['"]/i
    ];

    for (const pattern of secretPatterns) {
      if (pattern.test(content)) {
        securityIssues.push('Potential hardcoded secret detected');
      }
    }

    // Check for SQL injection vulnerabilities
    if (content.includes('prisma.') && content.includes('$queryRaw') || content.includes('sql`')) {
      securityIssues.push('Raw SQL query detected - ensure proper parameterization');
    }

    // Check for XSS vulnerabilities
    if (content.includes('dangerouslySetInnerHTML')) {
      securityIssues.push('dangerouslySetInnerHTML detected - ensure proper sanitization');
    }

    // Check for eval usage
    if (content.includes('eval(')) {
      securityIssues.push('eval() detected - avoid using eval()');
    }

    if (securityIssues.length === 0) {
      checks.push('No obvious security vulnerabilities detected');
    } else {
      this.errors.push(...securityIssues);
    }

    this.validationResults.push({
      check: 'Security Validation',
      status: securityIssues.length === 0 ? 'PASS' : 'FAIL',
      message: checks.join('; ') || securityIssues.join('; ')
    });
  }

  async validatePerformance(filePath, content) {
    const checks = [];
    const performanceIssues = [];

    // Check for potential performance issues
    if (content.includes('useState') && content.includes('useEffect') && !content.includes('useCallback') && !content.includes('useMemo')) {
      performanceIssues.push('Consider using useCallback/useMemo for expensive operations');
    }

    // Check for large JSON operations
    if (content.includes('JSON.parse') || content.includes('JSON.stringify')) {
      performanceIssues.push('JSON operations detected - consider performance impact');
    }

    // Check for database queries in loops
    if (content.includes('prisma.') && (content.includes('for(') || content.includes('map(') || content.includes('forEach('))) {
      performanceIssues.push('Database operations in loops detected - consider batching');
    }

    // Check for missing loading states
    if (content.includes('fetch(') || content.includes('axios.')) {
      if (content.includes('loading') || content.includes('isLoading')) {
        checks.push('Loading states found');
      } else {
        this.warnings.push('Async operations should include loading states');
      }
    }

    if (performanceIssues.length === 0) {
      checks.push('No obvious performance issues detected');
    } else {
      this.warnings.push(...performanceIssues);
    }

    this.validationResults.push({
      check: 'Performance Validation',
      status: performanceIssues.length === 0 ? 'PASS' : 'WARN',
      message: checks.join('; ') || performanceIssues.join('; ')
    });
  }

  generateValidationReport() {
    console.log('\n' + '='.repeat(50));
    colorLog('cyan', '📋 DEVELOPMENT VALIDATION REPORT');
    console.log('='.repeat(50));

    // Summary
    const totalChecks = this.validationResults.length;
    const passedChecks = this.validationResults.filter(r => r.status === 'PASS').length;
    const warningChecks = this.validationResults.filter(r => r.status === 'WARN').length;
    const failedChecks = this.validationResults.filter(r => r.status === 'FAIL').length;

    console.log(`\n📊 Summary: ${passedChecks} passed, ${warningChecks} warnings, ${failedChecks} failed`);

    // Detailed results
    console.log('\n🔍 Detailed Results:');
    this.validationResults.forEach((result, index) => {
      const statusColor = result.status === 'PASS' ? 'green' : 
                         result.status === 'WARN' ? 'yellow' : 'red';
      console.log(`\n${index + 1}. ${colors[statusColor]}[${result.status}]${colors.reset} ${result.check}`);
      console.log(`   ${result.message}`);
    });

    // Warnings
    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }

    // Errors
    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    console.log('\n' + '='.repeat(50));

    // Overall status
    if (this.errors.length === 0) {
      if (this.warnings.length === 0) {
        colorLog('green', '\n✅ All validations passed! File is ready for commit.');
      } else {
        colorLog('yellow', `\n⚠️  Validations passed with ${this.warnings.length} warning(s). Review before committing.`);
      }
    } else {
      colorLog('red', `\n❌ Validations failed with ${this.errors.length} error(s). Fix issues before committing.`);
    }
  }

  async validateAllChanges(files) {
    colorLog('cyan', `🔍 Validating ${files.length} files...`);
    
    const allResults = [];
    let totalErrors = 0;
    let totalWarnings = 0;

    for (const file of files) {
      if (fs.existsSync(file)) {
        const result = await this.validateChange(file);
        allResults.push({ file, ...result });
        totalErrors += result.errors.length;
        totalWarnings += result.warnings.length;
      } else {
        colorLog('yellow', `⚠️  File not found: ${file}`);
      }
    }

    // Generate summary report
    console.log('\n' + '='.repeat(60));
    colorLog('cyan', '📊 BATCH VALIDATION SUMMARY');
    console.log('='.repeat(60));
    
    const successCount = allResults.filter(r => r.success).length;
    console.log(`\n📁 Files analyzed: ${files.length}`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${files.length - successCount}`);
    console.log(`⚠️  Total warnings: ${totalWarnings}`);
    console.log(`🚨 Total errors: ${totalErrors}`);

    if (totalErrors === 0) {
      if (totalWarnings === 0) {
        colorLog('green', '\n🎉 All files passed validation!');
      } else {
        colorLog('yellow', `\n⚠️  All files passed with ${totalWarnings} total warning(s).`);
      }
    } else {
      colorLog('red', `\n❌ Validation failed with ${totalErrors} total error(s).`);
    }

    return {
      totalFiles: files.length,
      successCount,
      totalErrors,
      totalWarnings,
      results: allResults
    };
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    colorLog('red', '❌ File path is required');
    console.log('Usage: node development-validator.js <file-path> [file2 file3 ...]');
    console.log('Example: node development-validator.js src/api/v1/responses/route.ts');
    process.exit(1);
  }

  const validator = new DevelopmentValidator();
  
  if (args.length === 1) {
    // Single file validation
    const result = await validator.validateChange(args[0]);
    process.exit(result.success ? 0 : 1);
  } else {
    // Multiple files validation
    const result = await validator.validateAllChanges(args);
    process.exit(result.totalErrors === 0 ? 0 : 1);
  }
}

// Export for use as module
module.exports = DevelopmentValidator;

// Run if called directly
if (require.main === module) {
  main();
}