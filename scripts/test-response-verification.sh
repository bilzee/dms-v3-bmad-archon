#!/bin/bash

# Response Verification Test Runner
# This script runs all tests related to the response verification system

set -e

echo "🔍 Response Verification Test Suite"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the root of the project directory"
    exit 1
fi

# Function to run a specific test suite
run_test_suite() {
    local test_name=$1
    local test_pattern=$2
    
    print_status "Running $test_name tests..."
    
    if npm run test:unit -- --testNamePattern="$test_pattern" --verbose; then
        print_success "$test_name tests passed"
        return 0
    else
        print_error "$test_name tests failed"
        return 1
    fi
}

# Function to run integration tests
run_integration_tests() {
    local test_name=$1
    local test_path=$2
    
    print_status "Running $test_name integration tests..."
    
    if npm run test:integration -- --testPathPattern="$test_path" --verbose; then
        print_success "$test_name integration tests passed"
        return 0
    else
        print_error "$test_name integration tests failed"
        return 1
    fi
}

# Track overall success
OVERALL_SUCCESS=true

# Test Categories
print_status "Starting Response Verification Test Suite..."
echo

# 1. API Unit Tests
print_status "📡 API Unit Tests"
run_test_suite "Response Verification API" "response-verification-api" || OVERALL_SUCCESS=false
echo

# 2. Component Tests
print_status "🎨 Component Tests"
run_test_suite "ResponseVerificationQueue Component" "ResponseVerificationQueue" || OVERALL_SUCCESS=false
run_test_suite "VerifiedBadge Component" "VerifiedBadge" || OVERALL_SUCCESS=false
echo

# 3. Integration Tests
print_status "🔗 Integration Tests"
run_integration_tests "Response Verification Workflow" "response-verification-workflow" || OVERALL_SUCCESS=false
echo

# 4. E2E Tests (if requested)
if [ "$1" = "--include-e2e" ]; then
    print_status "🌐 E2E Tests"
    print_status "Running Response Verification E2E tests..."
    
    if npm run test:e2e -- response-verification-workflow.test.ts; then
        print_success "E2E tests passed"
    else
        print_error "E2E tests failed"
        OVERALL_SUCCESS=false
    fi
    echo
fi

# 5. Coverage Report
print_status "📊 Generating Coverage Report..."
if npm run test:unit:coverage -- --testNamePattern="response-verification|ResponseVerificationQueue|VerifiedBadge"; then
    print_success "Coverage report generated successfully"
    print_status "Coverage report available at: coverage/lcov-report/index.html"
else
    print_warning "Coverage report generation failed"
fi
echo

# Summary
if [ "$OVERALL_SUCCESS" = true ]; then
    print_success "🎉 All Response Verification tests passed!"
    echo
    print_status "Test Summary:"
    echo "  ✅ API Unit Tests"
    echo "  ✅ Component Tests" 
    echo "  ✅ Integration Tests"
    if [ "$1" = "--include-e2e" ]; then
        echo "  ✅ E2E Tests"
    fi
    echo "  ✅ Coverage Report"
    exit 0
else
    print_error "❌ Some tests failed!"
    echo
    print_status "Failed Test Summary:"
    echo "  Check the error messages above for details"
    echo "  Fix failing tests and re-run this script"
    exit 1
fi