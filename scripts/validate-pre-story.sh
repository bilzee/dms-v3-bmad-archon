#!/bin/bash

# Enhanced Pre-Story Validation Script for Disaster Management PWA
# Validates system health and testing framework consistency before story implementation

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[VALIDATE]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# Track overall validation result
VALIDATION_PASSED=true

print_status "Starting enhanced pre-story validation..."

# 1. Check if required directories exist
print_status "Checking project structure..."

required_dirs=("tests" "tests/unit" "tests/integration" "tests/e2e" "tests/templates" "docs/architecture/coding-standards")
for dir in "${required_dirs[@]}"; do
    if [ -d "$dir" ]; then
        print_success "✓ Directory exists: $dir"
    else
        print_error "✗ Missing directory: $dir"
        VALIDATION_PASSED=false
    fi
done

# 2. Validate testing framework consistency
print_status "Checking testing framework consistency..."

# Check for forbidden Vitest syntax
if grep -r "vi\.mock" tests/ 2>/dev/null; then
    print_error "✗ Found Vitest syntax (vi.mock) - this project uses Jest only"
    print_warning "  Run: grep -r \"vi\.mock\" tests/ to find all instances"
    print_warning "  Replace with: jest.mock()"
    VALIDATION_PASSED=false
else
    print_success "✓ No Vitest syntax found"
fi

# Check for other Vitest patterns
if grep -r "vi\." tests/ 2>/dev/null | grep -v ".git"; then
    print_warning "⚠ Found potential Vitest patterns:"
    grep -r "vi\." tests/ 2>/dev/null | grep -v ".git" | head -5
    print_warning "  Please ensure these are valid Jest patterns"
fi

# Check for correct Jest imports
if grep -r "from.*vitest" tests/ 2>/dev/null; then
    print_error "✗ Found Vitest imports - this project uses Jest only"
    print_warning "  Replace @testing-library/react/vitest with @testing-library/react"
    VALIDATION_PASSED=false
else
    print_success "✓ No Vitest imports found"
fi

# 3. Validate package.json testing scripts
print_status "Checking package.json test scripts..."

if [ -f "package.json" ]; then
    if grep -q '"test:unit"' package.json && grep -q '"test:e2e"' package.json; then
        print_success "✓ Required test scripts found in package.json"
    else
        print_warning "⚠ Test scripts not found in package.json"
        print_warning "  Ensure you have: \"test:unit\" and \"test:e2e\" scripts"
    fi
    
    if grep -q '"validate:schema"' package.json; then
        print_success "✓ Schema validation script found"
    else
        print_warning "⚠ Schema validation script not found"
    fi
else
    print_error "✗ package.json not found"
    VALIDATION_PASSED=false
fi

# 4. Check Jest configuration
print_status "Checking Jest configuration..."

if [ -f "jest.config.js" ] || [ -f "jest.config.json" ] || grep -q "jestConfig" package.json; then
    print_success "✓ Jest configuration found"
else
    print_warning "⚠ No Jest configuration found - using Next.js defaults"
fi

if [ -f "jest.setup.js" ]; then
    print_success "✓ Jest setup file found"
else
    print_warning "⚠ No jest.setup.js found - testing library setup may be missing"
fi

# 5. Validate ESLint configuration for framework consistency
print_status "Checking ESLint framework validation rules..."

if [ -f ".eslintrc.json" ] || [ -f ".eslintrc.js" ]; then
    if grep -q "no-restricted-imports" .eslintrc* 2>/dev/null; then
        print_success "✓ ESLint framework validation rules found"
    else
        print_warning "⚠ ESLint framework validation rules not found"
        print_warning "  Consider adding vitest import restrictions to prevent framework mixing"
    fi
else
    print_warning "⚠ No ESLint configuration found"
fi

# 6. Check test templates are available
print_status "Checking test templates..."

template_files=(
    "tests/templates/unit-component.template.test.tsx"
    "tests/templates/integration-api.template.test.ts"
    "tests/templates/e2e-workflow.template.spec.ts"
    "tests/templates/README.md"
)

for template in "${template_files[@]}"; do
    if [ -f "$template" ]; then
        print_success "✓ Template available: $template"
    else
        print_warning "⚠ Template missing: $template"
    fi
done

# 7. Validate Prisma schema
print_status "Validating Prisma schema..."

if command -v npm &> /dev/null; then
    if npm run validate:schema &> /dev/null; then
        print_success "✓ Prisma schema validation passed"
    else
        print_error "✗ Prisma schema validation failed"
        print_warning "  Run: npm run validate:schema to fix schema issues"
        VALIDATION_PASSED=false
    fi
else
    print_warning "⚠ npm not available - skipping schema validation"
fi

# 8. Check for testing dependencies
print_status "Checking testing dependencies..."

if [ -f "package.json" ]; then
    testing_deps=(
        "@testing-library/react"
        "@testing-library/jest-dom"
        "@testing-library/user-event"
        "jest"
        "@playwright/test"
    )
    
    for dep in "${testing_deps[@]}"; do
        if grep -q "\"$dep\"" package.json; then
            print_success "✓ Testing dependency found: $dep"
        else
            print_warning "⚠ Testing dependency missing: $dep"
        fi
    done
fi

# 9. Validate consolidated testing guide
print_status "Checking consolidated testing standards..."

if [ -f "docs/architecture/coding-standards/testing-guide.md" ]; then
    print_success "✓ Consolidated testing guide found"
else
    print_warning "⚠ Consolidated testing guide not found"
    print_warning "  Expected at: docs/architecture/coding-standards/testing-guide.md"
fi

# 10. Environment and node modules check
print_status "Checking development environment..."

if [ -d "node_modules" ] && [ -d ".next" ]; then
    print_success "✓ Node modules and build artifacts present"
else
    print_warning "⚠ Node modules or build artifacts missing"
    print_warning "  Run: npm install && npm run build (if needed)"
fi

# 11. Git status check (optional)
if command -v git &> /dev/null && [ -d ".git" ]; then
    if git diff --quiet HEAD 2>/dev/null; then
        print_success "✓ No uncommitted changes"
    else
        print_warning "⚠ Uncommitted changes detected"
        print_warning "  Consider committing or stashing changes before story implementation"
    fi
fi

# Summary
echo ""
echo "=========================================="
if [ "$VALIDATION_PASSED" = true ]; then
    print_success "🎉 PRE-STORY VALIDATION PASSED"
    echo ""
    echo "You're ready to start story implementation!"
    echo ""
    echo "Next Steps:"
    echo "1. Follow the consolidated testing guide: docs/architecture/coding-standards/testing-guide.md"
    echo "2. Use test templates from: tests/templates/"
    echo "3. Focus on Jest syntax only (NO Vitest)"
    echo "4. Run 'npm run test:unit' and 'npm run test:e2e' after implementation"
    echo "=========================================="
    exit 0
else
    print_error "❌ PRE-STORY VALIDATION FAILED"
    echo ""
    echo "Please fix the issues above before implementing the story."
    echo "The validation script will help prevent framework mixing issues"
    echo "and reduce post-implementation test fixing time."
    echo ""
    echo "Common fixes:"
    echo "• Replace vi.mock() with jest.mock()"
    echo "• Update Vitest imports to Jest equivalents"
    echo "• Install missing testing dependencies"
    echo "• Run npm run validate:schema"
    echo "=========================================="
    exit 1
fi