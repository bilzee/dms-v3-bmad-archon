#!/bin/bash

# Response Planning Test Suite Runner
# This script runs all tests related to response planning functionality

set -e

echo "🚀 Starting Response Planning Test Suite..."
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to run tests with colored output
run_tests() {
    local test_type=$1
    local test_command=$2
    local description=$3
    
    echo -e "\n${BLUE}Running $description Tests...${NC}"
    echo "Command: $test_command"
    echo "----------------------------------------"
    
    if eval $test_command; then
        echo -e "${GREEN}✅ $description tests passed!${NC}"
    else
        echo -e "${RED}❌ $description tests failed!${NC}"
        return 1
    fi
}

# Check if required dependencies are installed
check_dependencies() {
    echo -e "${YELLOW}🔍 Checking dependencies...${NC}"
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed${NC}"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm is not installed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Dependencies check passed${NC}"
}

# Install dependencies if needed
install_dependencies() {
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm ci
}

# Build project for testing
build_project() {
    echo -e "${YELLOW}🔨 Building project for testing...${NC}"
    NODE_ENV=test npm run build:test
}

# Run all test suites
run_all_tests() {
    local failed_tests=0
    
    # Unit Tests
    if ! run_tests "unit" "npm run test:unit -- tests/unit/services/response-planning.test.ts tests/unit/components/" "Unit"; then
        ((failed_tests++))
    fi
    
    # Integration Tests
    if ! run_tests "integration" "npm run test:unit -- tests/integration/response-planning/" "Integration"; then
        ((failed_tests++))
    fi
    
    # E2E Tests
    if ! run_tests "e2e" "npm run test:e2e tests/e2e/response-planning-workflow.test.ts" "End-to-End"; then
        ((failed_tests++))
    fi
    
    # Coverage Report
    echo -e "\n${BLUE}Generating coverage report...${NC}"
    echo "----------------------------------------"
    if npm run test:unit:coverage -- tests/unit/services/response-planning.test.ts tests/unit/components/ResponsePlanningForm.test.tsx; then
        echo -e "${GREEN}✅ Coverage report generated${NC}"
        echo "📊 Coverage report available at: coverage/lcov-report/index.html"
    else
        echo -e "${YELLOW}⚠️ Coverage generation had issues${NC}"
    fi
    
    return $failed_tests
}

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}🧹 Cleaning up...${NC}"
    # Clean up any test databases, temporary files, etc.
    rm -rf .test-data
    rm -rf coverage/tmp
}

# Main execution
main() {
    echo -e "${BLUE}📋 Response Planning Test Suite${NC}"
    echo "Tests for offline-capable response planning with collaboration features"
    echo ""
    
    # Trap cleanup on exit
    trap cleanup EXIT
    
    check_dependencies
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        install_dependencies
    fi
    
    # Build project
    build_project
    
    # Run all tests
    echo -e "\n${BLUE}🚀 Running complete test suite...${NC}"
    echo "======================================"
    
    failed_count=$(run_all_tests)
    
    echo -e "\n${BLUE}📊 Test Results Summary${NC}"
    echo "======================================"
    
    if [ $failed_count -eq 0 ]; then
        echo -e "${GREEN}🎉 All tests passed successfully!${NC}"
        echo -e "${GREEN}✅ Response planning functionality is ready for production${NC}"
        exit 0
    else
        echo -e "${RED}❌ $failed_count test suite(s) failed${NC}"
        echo -e "${RED}🚫 Please fix failing tests before deploying${NC}"
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    "unit")
        echo -e "${YELLOW}Running unit tests only...${NC}"
        run_tests "unit" "npm run test:unit -- tests/unit/services/response-planning.test.ts tests/unit/components/" "Unit"
        ;;
    "integration")
        echo -e "${YELLOW}Running integration tests only...${NC}"
        run_tests "integration" "npm run test:unit -- tests/integration/response-planning/" "Integration"
        ;;
    "e2e")
        echo -e "${YELLOW}Running E2E tests only...${NC}"
        run_tests "e2e" "npm run test:e2e tests/e2e/response-planning-workflow.test.ts" "End-to-End"
        ;;
    "coverage")
        echo -e "${YELLOW}Running tests with coverage...${NC}"
        run_tests "coverage" "npm run test:unit:coverage -- tests/unit/services/response-planning.test.ts tests/unit/components/ResponsePlanningForm.test.tsx" "Coverage"
        ;;
    "watch")
        echo -e "${YELLOW}Running tests in watch mode...${NC}"
        npm run test:unit:watch -- tests/unit/services/response-planning.test.ts tests/unit/components/ResponsePlanningForm.test.tsx
        ;;
    "clean")
        echo -e "${YELLOW}Cleaning up test artifacts...${NC}"
        cleanup
        rm -rf coverage
        rm -rf .next
        ;;
    "help"|"-h"|"--help")
        echo "Response Planning Test Suite Runner"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  (no args)  Run all tests"
        echo "  unit       Run unit tests only"
        echo "  integration Run integration tests only"
        echo "  e2e        Run E2E tests only"
        echo "  coverage   Run tests with coverage report"
        echo "  watch      Run unit tests in watch mode"
        echo "  clean      Clean up test artifacts"
        echo "  help       Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0           # Run all tests"
        echo "  $0 unit      # Run only unit tests"
        echo "  $0 coverage  # Run tests with coverage"
        ;;
    *)
        main
        ;;
esac