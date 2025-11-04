# Delivery Documentation Testing Guide

This document outlines the comprehensive testing strategy for the Delivery Documentation functionality in Story 4.2.

## Test Suite Overview

### 🧪 Unit Tests
Tests for individual functions and components in isolation.

#### Coverage Areas:
- **DeliveryOfflineService** - Offline queue management and sync logic
- **DeliveryMediaValidator** - Media validation and quality scoring
- **GPS Hook** - Location capture and validation
- **Utility Functions** - Date formatting, checksum generation, etc.

#### Key Test Files:
- `tests/unit/delivery-offline.service.test.ts`
- `tests/unit/delivery-media-validator.test.ts`
- `tests/unit/hooks/use-gps.test.ts`
- `tests/unit/utils/delivery-media-manager.test.ts`

#### Running Unit Tests:
```bash
# Run all unit tests
npm run test:unit

# Run specific unit test file
npm run test:delivery-offline
npm run test:delivery-validator

# Run with coverage
npm run test:coverage
```

### 🔧 Integration Tests
Tests for multiple components working together, including API endpoints.

#### Coverage Areas:
- **Delivery Confirmation API** - Complete request/response flow
- **Database Transactions** - Atomic operations and rollbacks
- **Media Upload Service** - File processing and storage
- **Offline Sync Service** - End-to-end offline workflows

#### Key Test Files:
- `tests/integration/delivery-confirmation.test.ts`
- `tests/integration/media-upload.test.ts`
- `tests/integration/offline-sync.test.ts`

#### Running Integration Tests:
```bash
# Run all integration tests
npm run test:integration

# Run specific integration test
npm run test:delivery-api
```

### 🎯 Component Tests
Tests for React components with user interactions.

#### Coverage Areas:
- **DeliveryConfirmationForm** - Complete form workflows
- **MediaCapture Components** - Photo/video capture functionality
- **OfflineSyncDashboard** - Sync management interface
- **GPS Display Components** - Location information display

#### Key Test Files:
- `tests/components/DeliveryConfirmationForm.test.tsx`
- `tests/components/EnhancedMediaCapture.test.tsx`
- `tests/components/OfflineSyncStatus.test.tsx`

#### Running Component Tests:
```bash
# Run all component tests
npm run test:components

# Run specific component test
npm run test:delivery-form
```

### 🌐 E2E Tests
End-to-end tests that simulate real user workflows across multiple pages.

#### Coverage Areas:
- **Complete Delivery Workflow** - From planning to verification
- **Offline Functionality** - Offline mode and sync behavior
- **Mobile Responsiveness** - Touch interactions and mobile UI
- **Accessibility** - Keyboard navigation and screen readers
- **Error Handling** - Network failures and edge cases

#### Key Test Files:
- `tests/e2e/delivery-workflow.spec.ts`
- `tests/e2e/offline-functionality.spec.ts`
- `tests/e2e/mobile-experience.spec.ts`

#### Running E2E Tests:
```bash
# Run all E2E tests
npm run test:e2e

# Run with UI (interactive mode)
npm run test:e2e:ui

# Run in headed mode (show browser)
npm run test:e2e:headed

# Run specific E2E test
npm run test:e2e:delivery

# Run mobile-specific tests
npm run test:e2e:mobile

# Debug E2E tests
npm run test:e2e:debug
```

## Test Data and Fixtures

### Test Users
```typescript
// Responder user for delivery confirmations
const responderUser = {
  email: 'responder-test@test.com',
  role: 'RESPONDER',
  permissions: ['DELIVERY_CONFIRMATION', 'MEDIA_UPLOAD']
}

// Coordinator user for verification
const coordinatorUser = {
  email: 'coordinator-test@test.com', 
  role: 'COORDINATOR',
  permissions: ['DELIVERY_VERIFICATION']
}
```

### Test Files
- `tests/fixtures/delivery-photo.jpg` - Sample delivery photo (1MB, GPS tagged)
- `tests/fixtures/delivery-photo2.jpg` - Second sample photo
- `tests/fixtures/large-photo.jpg` - Oversized file for validation tests (15MB)
- `tests/fixtures/invalid-file.txt` - Invalid file type for error testing

### Database Setup
```typescript
// Helper functions in tests/helpers/database.ts
await setupTestDatabase()
await createDeliveryConfirmationTestData()
await cleanupTestDatabase()
```

## Test Scenarios

### ✅ Happy Path Scenarios
1. **Online Delivery Confirmation**
   - User captures GPS location
   - Uploads delivery photos
   - Confirms delivery successfully
   - Delivery appears in verification queue

2. **Offline Delivery with Sync**
   - User works offline
   - Completes delivery confirmation
   - Data stored locally
   - Automatic sync when connection restored

3. **Mobile Workflow**
   - Responsive design works on mobile
   - Touch interactions function properly
   - Camera integration works
   - GPS capture functions on mobile

### ❌ Error Scenarios
1. **Network Failures**
   - API calls fail gracefully
   - Offline fallback works
   - User notified of offline mode
   - Data preserved for later sync

2. **GPS Issues**
   - GPS unavailable handling
   - Poor GPS accuracy warnings
   - Manual location entry fallback
   - Location validation errors

3. **Media Upload Errors**
   - Large file rejection
   - Invalid file type handling
   - Upload failure recovery
   - Corrupted file detection

4. **Validation Errors**
   - Missing required fields
   - Invalid GPS coordinates
   - No delivery items provided
   - Form validation feedback

### 🔒 Security Tests
1. **Role-Based Access Control**
   - Only responders can confirm deliveries
   - Only coordinators can verify deliveries
   - Unauthorized users rejected appropriately

2. **Data Integrity**
   - File checksum validation
   - GPS metadata verification
   - Audit trail creation
   - Transaction rollback on errors

## Performance Testing

### Metrics Tracked:
- **Form Load Time** - < 2 seconds
- **Photo Upload Time** - < 5 seconds per photo
- **GPS Capture Time** - < 10 seconds
- **Offline Sync Time** - < 30 seconds for batch sync
- **Mobile Performance** - Smooth 60fps interactions

### Load Testing:
- Multiple concurrent delivery confirmations
- Bulk media upload processing
- Offline sync queue performance
- Database query optimization

## Accessibility Testing

### WCAG 2.1 AA Compliance:
- **Keyboard Navigation** - All functions accessible via keyboard
- **Screen Reader Support** - Proper ARIA labels and descriptions
- **Color Contrast** - Minimum 4.5:1 contrast ratio
- **Focus Management** - Logical tab order and focus indicators
- **Error Announcements** - Screen readers notified of validation errors

### Tools Used:
- Playwright accessibility testing
- Manual keyboard navigation testing
- Screen reader testing (NVDA, VoiceOver)
- Color contrast analyzers

## Continuous Integration

### GitHub Actions Workflow:
```yaml
name: Delivery Documentation Tests
on: [push, pull_request]
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run unit tests
        run: npm run test:coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - name: Run integration tests
        run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Setup Playwright
        uses: microsoft/playwright-github-action@v1
      - name: Run E2E tests
        run: npm run test:e2e
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Test Environment Setup

### Local Development:
```bash
# Install dependencies
npm install

# Set up test database
createdb dms_test
npm run db:test:setup

# Run all tests
npm run test:all

# Run specific test suite
npm run test:unit
npm run test:integration
npm run test:components
npm run test:e2e
```

### Environment Variables:
```bash
# Test database
DATABASE_URL="postgresql://user:pass@localhost:5432/dms_test"

# Test storage
STORAGE_PROVIDER="local"
STORAGE_PATH="./test-uploads"

# External services (mocked)
GPS_API_MOCK="true"
WEATHER_API_MOCK="true"
NOTIFICATION_SERVICE_MOCK="true"
```

## Coverage Reports

### Coverage Requirements:
- **Global Coverage**: 80% minimum
- **Critical Path Coverage**: 95% minimum
- **Delivery Service Functions**: 90% minimum
- **API Endpoints**: 85% minimum

### Coverage Reports Generated:
- HTML report (interactive)
- JSON report (for CI/CD)
- Console summary
- LCOV format (for third-party tools)

### Viewing Coverage:
```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html

# Check specific thresholds
npm run test:ci
```

## Debugging Tests

### Unit Test Debugging:
```bash
# Run tests in watch mode
npm run test:watch

# Run specific test file
npm run test:unit -- delivery-offline.service.test.ts

# Debug with VS Code
# Add breakpoint() in test code
# Use VS Code debugger configuration
```

### E2E Test Debugging:
```bash
# Run in headed mode to see browser
npm run test:e2e:headed

# Run in debug mode
npm run test:e2e:debug

# Run with trace viewer
npm run test:e2e -- --trace on

# Run specific test
npm run test:e2e -- tests/e2e/delivery-workflow.spec.ts
```

### Common Issues:
1. **Flaky GPS Tests** - Use mock GPS coordinates
2. **Database Cleanup** - Ensure proper cleanup between tests
3. **File Upload Issues** - Mock file system in CI environment
4. **Browser Compatibility** - Test across different browsers

## Test Maintenance

### Regular Tasks:
- Update test data when schema changes
- Add new test cases for new features
- Review and update coverage thresholds
- Maintain test fixtures and mock data
- Update E2E tests for UI changes

### Best Practices:
- Write descriptive test names
- Use helper functions for common operations
- Keep tests independent and isolated
- Use proper assertions and error messages
- Regular test refactoring and cleanup

This comprehensive testing strategy ensures the delivery documentation functionality is reliable, performant, and secure across all scenarios and environments.