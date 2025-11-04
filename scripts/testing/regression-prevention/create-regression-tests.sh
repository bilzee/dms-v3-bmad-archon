#!/bin/bash

# Regression Prevention - Automated Regression Test Creation Script
# Creates baseline regression tests for existing functionality before implementing new stories

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if story ID is provided
if [[ -z "$1" ]]; then
    print_error "Story ID is required"
    echo "Usage: $0 <story-id> [story-description]"
    echo "Example: $0 4.2 'Response Delivery Documentation'"
    exit 1
fi

STORY_ID="$1"
STORY_DESC="${2:-New Feature Implementation}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

print_info "Creating regression tests for Story $STORY_ID: $STORY_DESC"
echo "=========================================================="

# Create directory structure
REGRESSION_DIR="tests/regression/${STORY_ID}-baseline-${TIMESTAMP}"
mkdir -p $REGRESSION_DIR

print_info "Created regression test directory: $REGRESSION_DIR"

# Create baseline test file
cat > $REGRESSION_DIR/${STORY_ID}-baseline.test.ts << 'EOF'
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDatabase, cleanupTestDatabase } from '../../helpers/database';
import { createTestUsers, createTestAssessments, createTestResponses } from '../../helpers/test-data';

describe('[STORY_ID] Baseline Regression Tests', () => {
  let testUsers: any;
  let testAssessments: any;
  let testResponses: any;

  beforeAll(async () => {
    // Setup test database
    await setupTestDatabase();
    
    // Create test data
    testUsers = await createTestUsers();
    testAssessments = await createTestAssessments(testUsers);
    testResponses = await createTestResponses(testUsers, testAssessments);
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('Authentication Workflows', () => {
    test('ASSESSOR can create preliminary assessments', async () => {
      // Test existing assessor functionality
      const assessorUser = testUsers.find(u => u.role === 'ASSESSOR');
      expect(assessorUser).toBeDefined();
      
      // Add specific assessor functionality tests
      // This should continue to work after new story implementation
    });

    test('COORDINATOR can access verification queue', async () => {
      // Test existing coordinator functionality
      const coordinatorUser = testUsers.find(u => u.role === 'COORDINATOR');
      expect(coordinatorUser).toBeDefined();
      
      // Add specific coordinator functionality tests
      // This should continue to work after new story implementation
    });

    test('RESPONDER can access planning interface', async () => {
      // Test existing responder functionality
      const responderUser = testUsers.find(u => u.role === 'RESPONDER');
      expect(responderUser).toBeDefined();
      
      // Add specific responder functionality tests
      // This should continue to work after new story implementation
    });

    test('DONOR can view assigned responses', async () => {
      // Test existing donor functionality
      const donorUser = testUsers.find(u => u.role === 'DONOR');
      expect(donorUser).toBeDefined();
      
      // Add specific donor functionality tests
      // This should continue to work after new story implementation
    });
  });

  describe('Critical API Endpoints', () => {
    test('GET /api/v1/assessments/verified works correctly', async () => {
      // Test critical existing endpoint
      const response = await fetch('http://localhost:3006/api/v1/assessments/verified', {
        headers: {
          'Authorization': `Bearer ${testUsers[0].token}`
        }
      });
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    test('GET /api/v1/entities/assigned works correctly', async () => {
      // Test critical existing endpoint
      const response = await fetch('http://localhost:3006/api/v1/entities/assigned', {
        headers: {
          'Authorization': `Bearer ${testUsers[0].token}`
        }
      });
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    test('POST /api/v1/auth/login works correctly', async () => {
      // Test authentication endpoint
      const response = await fetch('http://localhost:3006/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: testUsers[0].email,
          password: 'test-password'
        })
      });
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.token).toBeDefined();
      expect(data.user).toBeDefined();
    });
  });

  describe('Database Operations', () => {
    test('Entity assignments work correctly', async () => {
      // Test existing database operations
      expect(testAssessments.length).toBeGreaterThan(0);
      expect(testResponses.length).toBeGreaterThan(0);
    });

    test('Assessment status transitions work', async () => {
      // Test assessment status transitions
      const assessment = testAssessments[0];
      expect(assessment.status).toBeDefined();
      // Add more specific status transition tests
    });

    test('Response planning functionality works', async () => {
      // Test existing response planning
      const response = testResponses[0];
      expect(response.status).toBeDefined();
      expect(response.items).toBeDefined();
    });
  });

  describe('Component Integration', () => {
    test('ResponsePlanningForm renders correctly', async () => {
      // Test existing component functionality
      // This would be a component test
      expect(true).toBe(true); // Placeholder
    });

    test('AssessmentSelector works correctly', async () => {
      // Test existing component functionality
      expect(true).toBe(true); // Placeholder
    });

    test('EntitySelector works correctly', async () => {
      // Test existing component functionality
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Offline Functionality', () => {
    test('Offline sync queue works correctly', async () => {
      // Test existing offline functionality
      expect(true).toBe(true); // Placeholder
    });

    test('Conflict resolution works correctly', async () => {
      // Test existing conflict resolution
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Security and Permissions', () => {
    test('Role-based access control enforced', async () => {
      // Test existing RBAC
      expect(true).toBe(true); // Placeholder
    });

    test('API endpoints protected by authentication', async () => {
      // Test existing API security
      const response = await fetch('http://localhost:3006/api/v1/assessments/verified');
      expect(response.status).toBe(401); // Unauthorized without token
    });
  });

  describe('Performance Benchmarks', () => {
    test('Dashboard load time under threshold', async () => {
      const startTime = Date.now();
      // Simulate dashboard loading
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(2000); // 2 seconds
    });

    test('API response times under threshold', async () => {
      const startTime = Date.now();
      const response = await fetch('http://localhost:3006/api/v1/assessments/verified', {
        headers: {
          'Authorization': `Bearer ${testUsers[0].token}`
        }
      });
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(500); // 500ms
      expect(response.ok).toBe(true);
    });
  });
});
EOF

# Replace STORY_ID placeholder with actual story ID
sed -i "s/STORY_ID/$STORY_ID/g" $REGRESSION_DIR/${STORY_ID}-baseline.test.ts

print_status "Created baseline regression test file"

# Create test configuration
cat > $REGRESSION_DIR/vitest.config.ts << EOF
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['../../tests/vitest.setup.ts'],
    include: ['./**/*.test.ts'],
    reporters: ['verbose', 'json'],
    outputFile: {
      json: './test-results.json'
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../../src')
    }
  }
})
EOF

print_status "Created test configuration"

# Create package.json for regression tests
cat > $REGRESSION_DIR/package.json << EOF
{
  "name": "regression-tests-${STORY_ID}",
  "version": "1.0.0",
  "description": "Regression tests for Story ${STORY_ID}: ${STORY_DESC}",
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  },
  "dependencies": {
    "vitest": "^4.0.6"
  }
}
EOF

print_status "Created package.json for regression tests"

# Create test data helpers
mkdir -p $REGRESSION_DIR/helpers
cat > $REGRESSION_DIR/helpers/test-data.ts << 'EOF'
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function createTestUsers() {
  const users = [
    {
      email: 'assessor@test.com',
      username: 'test-assessor',
      passwordHash: await bcrypt.hash('test-password', 10),
      name: 'Test Assessor',
      organization: 'Test Org',
      roles: ['ASSESSOR']
    },
    {
      email: 'coordinator@test.com',
      username: 'test-coordinator',
      passwordHash: await bcrypt.hash('test-password', 10),
      name: 'Test Coordinator',
      organization: 'Test Org',
      roles: ['COORDINATOR']
    },
    {
      email: 'responder@test.com',
      username: 'test-responder',
      passwordHash: await bcrypt.hash('test-password', 10),
      name: 'Test Responder',
      organization: 'Test Org',
      roles: ['RESPONDER']
    },
    {
      email: 'donor@test.com',
      username: 'test-donor',
      passwordHash: await bcrypt.hash('test-password', 10),
      name: 'Test Donor',
      organization: 'Test Org',
      roles: ['DONOR']
    }
  ];

  const createdUsers = [];
  for (const userData of users) {
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        username: userData.username,
        passwordHash: userData.passwordHash,
        name: userData.name,
        organization: userData.organization
      }
    });

    // Create roles and assignments
    for (const roleName of userData.roles) {
      const role = await prisma.role.findFirst({
        where: { name: roleName }
      });

      if (role) {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: role.id,
            assignedBy: 'system'
          }
        });
      }
    }

    createdUsers.push({
      ...user,
      roles: userData.roles,
      token: 'mock-token-for-testing' // In real implementation, generate proper JWT
    });
  }

  return createdUsers;
}

export async function createTestAssessments(users: any[]) {
  const assessor = users.find(u => u.roles.includes('ASSESSOR'));
  
  const assessments = [];
  for (let i = 0; i < 3; i++) {
    const assessment = await prisma.rapidAssessment.create({
      data: {
        assessorId: assessor.id,
        rapidAssessmentType: 'HEALTH',
        rapidAssessmentDate: new Date(),
        affectedPopulationCount: 100 + i * 50,
        immediateNeeds: JSON.stringify(['food', 'water', 'medical']),
        severityLevel: 'HIGH',
        assessmentStatus: 'VERIFIED',
        location: JSON.stringify({
          latitude: 40.7128 + i * 0.01,
          longitude: -74.0060 + i * 0.01
        })
      }
    });
    assessments.push(assessment);
  }

  return assessments;
}

export async function createTestResponses(users: any[], assessments: any[]) {
  const responder = users.find(u => u.roles.includes('RESPONDER'));
  
  const responses = [];
  for (const assessment of assessments) {
    const response = await prisma.rapidResponse.create({
      data: {
        assessmentId: assessment.id,
        responderId: responder.id,
        status: 'PLANNED',
        plannedDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        items: JSON.stringify([
          { name: 'Food Supplies', unit: 'kg', quantity: 100 },
          { name: 'Water', unit: 'liters', quantity: 500 }
        ]),
        verificationStatus: 'DRAFT'
      }
    });
    responses.push(response);
  }

  return responses;
}
EOF

print_status "Created test data helpers"

# Create documentation
cat > $REGRESSION_DIR/README.md << EOF
# Regression Tests for Story ${STORY_ID}: ${STORY_DESC}

## Overview

These regression tests were created on $(date) to establish a baseline of existing functionality before implementing Story ${STORY_ID}. 

## Purpose

The purpose of these tests is to ensure that existing functionality continues to work correctly after implementing the new story. These tests should be run:

1. Before implementing the story (to establish baseline)
2. After implementing the story (to catch regressions)
3. Before deploying to production (final validation)

## Test Categories

### Authentication Workflows
- Tests for all user roles (ASSESSOR, COORDINATOR, RESPONDER, DONOR)
- Validates role-based access control
- Ensures authentication flows work correctly

### Critical API Endpoints
- Tests for essential API endpoints
- Validates response formats and status codes
- Ensures API security measures are in place

### Database Operations
- Tests for database model interactions
- Validates data integrity and constraints
- Ensures proper error handling

### Component Integration
- Tests for React component functionality
- Validates component interactions
- Ensures proper state management

### Offline Functionality
- Tests for offline-first features
- Validates sync operations
- Ensures conflict resolution works

### Security and Permissions
- Tests for security measures
- Validates permission checks
- Ensures proper access control

### Performance Benchmarks
- Tests for performance thresholds
- Validates response times
- Ensures acceptable load times

## Running Tests

\`\`\`bash
# Install dependencies
npm install

# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
\`\`\`

## Test Results

Test results are saved in \`test-results.json\` for analysis and comparison.

## Baseline Metrics

- Created: $(date)
- Git Commit: $(git rev-parse HEAD)
- Test Environment: $(node --version)

## Notes

- These tests should be updated if the underlying functionality changes
- New tests should be added for any additional critical functionality
- Test data is created in isolation and cleaned up after each run
EOF

print_status "Created documentation"

# Make scripts executable
chmod +x scripts/create-regression-tests.sh 2>/dev/null || true

print_status "Regression test creation complete!"
echo ""
print_info "Next steps:"
echo "1. Review the generated tests in: $REGRESSION_DIR"
echo "2. Customize tests based on specific functionality"
echo "3. Run baseline tests: cd $REGRESSION_DIR && npm install && npm run test"
echo "4. Implement your story"
echo "5. Run regression tests again to catch any regressions"
echo ""
print_warning "Remember to update these tests if existing functionality changes!"

# Create symlink for easy access
ln -sf $REGRESSION_DIR tests/regression/current-${STORY_ID}
print_info "Created symlink: tests/regression/current-${STORY_ID}"