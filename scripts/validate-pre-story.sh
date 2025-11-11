#!/bin/bash

# Pre-Story Validation Script for DMS v3
# Catches testing framework issues before story implementation

set -e

echo "🔍 Pre-Story Validation for DMS v3 Stories"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track validation results
VALIDATION_ERRORS=0
VALIDATION_WARNINGS=0

# Function to log error
error() {
    echo -e "${RED}❌ $1${NC}"
    ((VALIDATION_ERRORS++))
}

# Function to log warning
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((VALIDATION_WARNINGS++))
}

# Function to log success
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to log info
info() {
    echo "ℹ️  $1"
}

echo ""
echo "📋 Step 1: Framework Consistency Validation"
echo "--------------------------------------------"

# Check for Vitest contamination (should not exist in Jest project)
info "Checking for Vitest syntax contamination..."
VITEST_FILES=$(grep -r "vi\.mock\|vi\.describe\|vi\.it\|vi\.test\|from.*vitest" tests/ 2>/dev/null || true)
if [[ -n "$VITEST_FILES" ]]; then
    error "Vitest syntax found in Jest project:"
    echo "$VITEST_FILES"
    echo ""
    info "Replace vi.mock() with jest.mock() and remove Vitest imports"
else
    success "No Vitest contamination found"
fi

# Check for proper Jest usage
info "Checking for proper Jest mock patterns..."
JEST_MOCKS=$(grep -r "jest\.mock" tests/ 2>/dev/null | wc -l)
if [[ $JEST_MOCKS -gt 0 ]]; then
    success "Found $JEST_MOCKS Jest mock(s) - framework consistency OK"
else
    warning "No Jest mocks found - ensure mocks use jest.mock() pattern"
fi

echo ""
echo "📋 Step 2: Component Mock Validation"
echo "--------------------------------------"

# Check React Hook Form mock support
info "Checking React Hook Form mock support..."
RHFFIELD_SUPPORT=$(grep -r "\\.\\.\\.field\|\\.\\.\\.props" tests/setup.ts 2>/dev/null || true)
if [[ -n "$RHFFIELD_SUPPORT" ]]; then
    success "React Hook Form field prop support found in setup"
else
    error "React Hook Form field prop support missing from tests/setup.ts"
    info "Add props spreading to UI component mocks: {...field}, {...props}"
fi

# Check Radix UI Select mocking
info "Checking Radix UI Select component mocks..."
RADIX_MOCKS=$(grep -r "radix-ui/react-select" tests/setup.ts 2>/dev/null || true)
if [[ -n "$RADIX_MOCKS" ]]; then
    success "Radix UI Select mocks found"
else
    warning "Radix UI Select mocks missing - tests may fail for Select components"
fi

echo ""
echo "📋 Step 3: Test Structure Validation"
echo "--------------------------------------"

# Check for test files following project patterns
info "Validating test file structure..."
UNIT_TESTS=$(find tests/unit -name "*.test.tsx" -o -name "*.test.ts" 2>/dev/null | wc -l)
E2E_TESTS=$(find tests/e2e -name "*.test.ts" 2>/dev/null | wc -l)
INTEGRATION_TESTS=$(find tests/integration -name "*.test.ts" 2>/dev/null | wc -l)

info "Found $UNIT_TESTS unit test(s), $INTEGRATION_TESTS integration test(s), $E2E_TESTS E2E test(s)"

if [[ $UNIT_TESTS -eq 0 && $INTEGRATION_TESTS -eq 0 && $E2E_TESTS -eq 0 ]]; then
    warning "No test files found - ensure tests follow project naming convention"
else
    success "Test files found following project structure"
fi

echo ""
echo "📋 Step 4: Configuration Validation"
echo "-------------------------------------"

# Check Jest configuration
info "Validating Jest configuration..."
if [[ -f "jest.config.js" ]]; then
    success "jest.config.js found"
    
    # Check for critical Jest settings
    if grep -q "testEnvironment.*jsdom" jest.config.js; then
        success "Jest jsdom environment configured"
    else
        error "Jest jsdom environment missing from jest.config.js"
    fi
    
    if grep -q "setupFilesAfterEnv.*jest.setup" jest.config.js; then
        success "Jest setup file configured"
    else
        warning "Jest setup file may not be configured"
    fi
else
    error "jest.config.js not found"
fi

# Check package.json test scripts
info "Validating package.json test scripts..."
if [[ -f "package.json" ]]; then
    if grep -q "\"test:unit\"" package.json; then
        success "Unit test script found"
    else
        warning "Unit test script not found in package.json"
    fi
    
    if grep -q "\"test:e2e\"" package.json; then
        success "E2E test script found"
    else
        warning "E2E test script not found in package.json"
    fi
else
    error "package.json not found"
fi

echo ""
echo "📋 Step 5: Schema Validation"
echo "------------------------------"

# Check schema validation script
info "Checking schema validation..."
if [[ -f "package.json" ]] && grep -q "validate:schema" package.json; then
    success "Schema validation script found"
    
    # Run schema validation if available
    if npm run validate:schema >/dev/null 2>&1; then
        success "Schema validation passes"
    else
        warning "Schema validation has issues - check schema references"
    fi
else
    warning "Schema validation script not found"
fi

echo ""
echo "📋 Step 6: Documentation Context Validation"
echo "--------------------------------------------"

# Check if testing standards are loaded in dev config
info "Checking if testing standards are in dev load list..."
if [[ -f ".bmad-core/core-config.yaml" ]]; then
    if grep -q "05-testing.md" .bmad-core/core-config.yaml; then
        success "Testing standards in dev load list"
    else
        error "Testing standards missing from .bmad-core/core-config.yaml devLoadAlwaysFiles"
    fi
else
    error ".bmad-core/core-config.yaml not found"
fi

echo ""
echo "📋 Step 7: React Import Validation"
echo "-----------------------------------"

# Check for missing React imports in components (common issue)
info "Checking for missing React imports in components..."
MISSING_REACT_IMPORTS=$(find src/components -name "*.tsx" -exec grep -L "import React" {} \; 2>/dev/null || true)
if [[ -n "$MISSING_REACT_IMPORTS" ]]; then
    error "Components missing React import:"
    echo "$MISSING_REACT_IMPORTS"
    info "Add 'import React from 'react';' to these components"
else
    success "No missing React imports found"
fi

echo ""
echo "📊 Validation Summary"
echo "====================="

if [[ $VALIDATION_ERRORS -eq 0 ]]; then
    success "All critical validations passed! ✨"
    if [[ $VALIDATION_WARNINGS -eq 0 ]]; then
        echo -e "${GREEN}🎉 Ready for story implementation!${NC}"
        EXIT_CODE=0
    else
        echo -e "${YELLOW}⚠️  $VALIDATION_WARNINGS warning(s) - review before implementation${NC}"
        EXIT_CODE=1
    fi
else
    error -e "$VALIDATION_ERRORS error(s) found - fix before story implementation"
    echo ""
    echo "🔧 Common Fixes:"
    echo "  • Replace vi.mock() with jest.mock() in test files"
    echo "  • Add {...field} props support to UI component mocks in tests/setup.ts"
    echo "  • Add 'import React' to React components"
    echo "  • Ensure Jest configuration matches project standards"
    echo "  • Add 05-testing.md to .bmad-core/core-config.yaml devLoadAlwaysFiles"
    EXIT_CODE=2
fi

echo ""
echo "📚 Pre-Story Checklist:"
echo "  ☑️  Review docs/architecture/coding-standards/05-testing.md"
echo "  ☑️  Reload testing standards when context is compacted"
echo "  ☑️  Use jest.mock() patterns, not vi.mock()"
echo "  ☑️  Ensure UI mocks support React Hook Form field props"
echo "  ☑️  Test form validation with user interactions"
echo "  ☑️  Run npm run test:unit and npm run test:e2e after implementation"

exit $EXIT_CODE