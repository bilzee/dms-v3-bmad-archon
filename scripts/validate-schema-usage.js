#!/usr/bin/env node
/**
 * Schema Usage Validation Script
 * Validates that Prisma schema fields used in code actually exist
 * Part of BMAD workflow to prevent schema hallucination
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse Prisma schema to extract model fields
function parseSchema() {
  const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  
  const models = {};
  const modelMatches = schemaContent.match(/model\s+(\w+)\s*\{([^}]+)\}/g) || [];
  
  for (const modelMatch of modelMatches) {
    const [, modelName] = modelMatch.match(/model\s+(\w+)\s*\{/) || [];
    if (!modelName) continue;
    
    const fields = [];
    const fieldMatches = modelMatch.match(/^\s*(\w+)\s+/gm) || [];
    
    for (const fieldMatch of fieldMatches) {
      const [, fieldName] = fieldMatch.match(/^\s*(\w+)\s+/) || [];
      if (fieldName && !fieldName.startsWith('@@') && fieldName !== 'model') {
        fields.push(fieldName);
      }
    }
    
    models[modelName] = fields;
  }
  
  return models;
}

// Find Prisma queries in TypeScript files
function findPrismaUsage(dir = 'src') {
  const files = [];
  
  function scanDir(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        scanDir(fullPath);
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
  }
  
  scanDir(dir);
  return files;
}

// Validate field usage in code
function validateFieldUsage(models) {
  const files = findPrismaUsage();
  const errors = [];
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    
    // Look for prisma queries
    const prismaMatches = content.match(/prisma\.(\w+)\.(findFirst|findMany|create|update|upsert|delete)\({([^}]+)}/g) || [];
    
    for (const match of prismaMatches) {
      const [, modelName] = match.match(/prisma\.(\w+)\./) || [];
      if (!modelName || !models[modelName]) continue;
      
      // Extract field references from where clauses, data objects, etc.
      const fieldMatches = match.match(/(\w+):\s*[^,}]+/g) || [];
      
      for (const fieldMatch of fieldMatches) {
        const [, fieldName] = fieldMatch.match(/(\w+):\s*/) || [];
        if (fieldName && !models[modelName].includes(fieldName)) {
          errors.push({
            file: file.replace(process.cwd(), '.'),
            model: modelName,
            field: fieldName,
            line: content.substring(0, content.indexOf(match)).split('\n').length
          });
        }
      }
    }
  }
  
  return errors;
}

// Generate schema documentation
function generateSchemaDocs(models) {
  let docs = '# Prisma Schema Reference\n\n';
  docs += '_Auto-generated on ' + new Date().toISOString() + '_\n\n';
  
  for (const [modelName, fields] of Object.entries(models)) {
    docs += `## ${modelName}\n\n`;
    docs += '**Fields:**\n';
    for (const field of fields) {
      docs += `- \`${field}\`\n`;
    }
    docs += '\n';
  }
  
  return docs;
}

// Main execution
function main() {
  console.log('🔍 Validating Prisma schema usage...\n');
  
  try {
    const models = parseSchema();
    console.log(`📊 Found ${Object.keys(models).length} models in schema`);
    
    const errors = validateFieldUsage(models);
    
    if (errors.length === 0) {
      console.log('✅ No schema validation errors found!');
    } else {
      console.log(`❌ Found ${errors.length} schema validation errors:\n`);
      
      for (const error of errors) {
        console.log(`  ${error.file}:${error.line}`);
        console.log(`    Model '${error.model}' does not have field '${error.field}'`);
      }
      
      process.exit(1);
    }
    
    // Generate documentation
    const docs = generateSchemaDocs(models);
    fs.writeFileSync('docs/schema-reference.md', docs);
    console.log('📚 Generated docs/schema-reference.md');
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}