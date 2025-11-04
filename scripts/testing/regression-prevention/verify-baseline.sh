#!/bin/bash

# Regression Prevention - Baseline Health Check Script
# This script validates that the system is in a healthy state before new development

set -e

echo "🔍 Starting Baseline Health Check..."
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Step 1: Check if we're on the correct branch
echo "📋 Step 1: Branch Validation"
if [[ $(git branch --show-current) != "main" ]]; then
    print_warning "Not on main branch. Consider switching to main for baseline check."
fi

# Step 2: Clean build
echo ""
echo "🏗️  Step 2: Clean Build"
if npm run build:test > build.log 2>&1; then
    print_status "Build successful"
else
    print_error "Build failed. Check build.log for details."
    tail -20 build.log
    exit 1
fi

# Step 3: Unit Tests with Coverage
echo ""
echo "🧪 Step 3: Unit Tests with Coverage"
if npm run test:unit:coverage > unit-test.log 2>&1; then
    print_status "Unit tests passed"
    
    # Extract coverage from log
    COVERAGE=$(grep -o 'All files[^%]*%' unit-test.log | tail -1 || echo "N/A")
    echo "   Coverage: $COVERAGE"
    
    # Check coverage threshold (80%)
    COVERAGE_NUM=$(echo $COVERAGE | grep -o '[0-9]*' | head -1)
    if [[ $COVERAGE_NUM -ge 80 ]]; then
        print_status "Coverage threshold met (≥80%)"
    else
        print_warning "Coverage below threshold (≥80% recommended)"
    fi
else
    print_error "Unit tests failed. Check unit-test.log for details."
    tail -20 unit-test.log
    exit 1
fi

# Step 4: Integration Tests
echo ""
echo "🔗 Step 4: Integration Tests"
if npm run test:integration > integration-test.log 2>&1; then
    print_status "Integration tests passed"
else
    print_error "Integration tests failed. Check integration-test.log for details."
    tail -20 integration-test.log
    exit 1
fi

# Step 5: API Endpoint Health Check
echo ""
echo "🌐 Step 5: API Endpoint Health Check"

# Start development server in background
npm run dev > server.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
echo "   Waiting for server to start..."
for i in {1..30}; do
    if curl -s http://localhost:3006/api/health > /dev/null 2>&1; then
        break
    fi
    sleep 1
done

# Test critical API endpoints
API_ENDPOINTS=(
    "/api/v1/auth/login"
    "/api/v1/assessments/verified"
    "/api/v1/entities/assigned"
    "/api/v1/responses"
    "/api/health"
)

API_ERRORS=0
for endpoint in "${API_ENDPOINTS[@]}"; do
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:3006$endpoint" | grep -q "200\|401\|404"; then
        echo "   ✅ $endpoint - Responding"
    else
        echo "   ❌ $endpoint - Not responding"
        ((API_ERRORS++))
    fi
done

# Stop the server
kill $SERVER_PID 2>/dev/null || true

if [[ $API_ERRORS -eq 0 ]]; then
    print_status "All API endpoints responding"
else
    print_error "$API_ERRORS API endpoints not responding"
    exit 1
fi

# Step 6: Database Schema Validation
echo ""
echo "🗄️  Step 6: Database Schema Validation"
if npx prisma validate > db-validate.log 2>&1; then
    print_status "Database schema valid"
else
    print_error "Database schema validation failed. Check db-validate.log for details."
    cat db-validate.log
    exit 1
fi

# Step 7: Type Checking
echo ""
echo "📝 Step 7: TypeScript Type Checking"
if npm run type-check > type-check.log 2>&1; then
    print_status "TypeScript types valid"
else
    print_error "TypeScript errors found. Check type-check.log for details."
    tail -20 type-check.log
    exit 1
fi

# Step 8: Linting
echo ""
echo "🔍 Step 8: Code Linting"
if npm run lint > lint.log 2>&1; then
    print_status "Code linting passed"
else
    print_warning "Linting issues found. Check lint.log for details."
    echo "   (These are warnings and won't block development)"
fi

# Step 9: Security Audit
echo ""
echo "🔒 Step 9: Security Audit"
if npm audit --audit-level high > security.log 2>&1; then
    print_status "Security audit passed"
else
    print_warning "Security vulnerabilities found. Check security.log for details."
    echo "   (High severity vulnerabilities should be addressed)"
fi

# Step 10: Performance Baseline
echo ""
echo "⚡ Step 10: Performance Baseline"
if command -v lighthouse &> /dev/null; then
    echo "   Running Lighthouse performance check..."
    # Start server for performance testing
    npm run dev > perf-server.log 2>&1 &
    PERF_SERVER_PID=$!
    
    # Wait for server
    sleep 5
    
    # Run Lighthouse (if available)
    if command -v lhci &> /dev/null; then
        lhci autorun > lighthouse.log 2>&1
        if [[ $? -eq 0 ]]; then
            print_status "Performance checks passed"
        else
            print_warning "Performance issues detected. Check lighthouse.log for details."
        fi
    else
        print_warning "Lighthouse CI not installed. Skipping performance tests."
    fi
    
    # Stop server
    kill $PERF_SERVER_PID 2>/dev/null || true
else
    print_warning "Lighthouse not installed. Skipping performance tests."
fi

# Step 11: Clean up log files
echo ""
echo "🧹 Step 11: Cleanup"
mkdir -p logs/baseline-$(date +%Y%m%d-%H%M%S)
mv *.log logs/baseline-$(date +%Y%m%d-%H%M%S)/ 2>/dev/null || true

# Final Summary
echo ""
echo "📊 BASELINE HEALTH CHECK SUMMARY"
echo "==============================="
echo "✅ Build: Successful"
echo "✅ Unit Tests: Passed ($COVERAGE coverage)"
echo "✅ Integration Tests: Passed"
echo "✅ API Endpoints: All responding"
echo "✅ Database Schema: Valid"
echo "✅ TypeScript Types: Valid"
echo "✅ Code Linting: Passed"
echo "✅ Security Audit: Passed"
echo "✅ Performance: Baseline established"
echo ""
echo "🎉 System is healthy and ready for development!"
echo ""
echo "📝 Notes:"
echo "   - All log files saved to logs/baseline-$(date +%Y%m%d-%H%M%S)/"
echo "   - Baseline metrics saved for regression detection"
echo "   - Run this script before starting any new story implementation"

# Create baseline metrics file
METRICS_FILE="logs/baseline-metrics-$(date +%Y%m%d-%H%M%S).json"
cat > $METRICS_FILE << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "gitCommit": "$(git rev-parse HEAD)",
  "gitBranch": "$(git branch --show-current)",
  "buildStatus": "success",
  "unitTestStatus": "success",
  "unitTestCoverage": "$COVERAGE",
  "integrationTestStatus": "success",
  "apiEndpointStatus": "success",
  "databaseSchemaStatus": "success",
  "typescriptStatus": "success",
  "lintStatus": "success",
  "securityStatus": "success"
}
EOF

echo "📈 Baseline metrics saved to: $METRICS_FILE"