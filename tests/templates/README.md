# Test Templates Guide

## Available Templates

### 1. Unit Component Tests
**Location**: `tests/templates/unit-component.template.test.tsx`
**Use For**: React component testing with form validation and user interactions
**Key Features**:
- Jest + React Testing Library setup
- Radix UI component mocking
- React Hook Form integration patterns
- Keyboard interaction testing for selects

### 2. Integration API Tests
**Location**: `tests/templates/integration-api.template.test.ts`
**Use For**: API endpoint testing with real database operations
**Key Features**:
- Jest + Supertest patterns
- Real database with seeded data
- Authentication and authorization testing
- Database cleanup utilities

### 3. E2E Workflow Tests
**Location**: `tests/templates/e2e-workflow.template.spec.ts`
**Use For**: Complete user journey testing with role-based access
**Key Features**:
- Playwright browser automation
- Role-based login patterns
- Form validation workflows
- Accessibility testing

## How to Use Templates

### For Story 5.2 (Commitment Management):

```bash
# 1. Create unit tests for CommitmentForm component
cp tests/templates/unit-component.template.test.tsx tests/unit/components/commitments/CommitmentForm.test.tsx
# Update: {{COMPONENT_NAME}} -> CommitmentForm

# 2. Create integration tests for commitment APIs
cp tests/templates/integration-api.template.test.ts tests/integration/api/commitments.test.ts
# Update: {{API_ENDPOINT_NAME}} -> Donor Commitments API

# 3. Create E2E tests for donor workflow
cp tests/templates/e2e-workflow.template.spec.ts tests/e2e/donor/commitment-management.spec.ts
# Update: {{USER_ROLE}} -> Donor, {{FEATURE_NAME}} -> Commitment Management
```

### Template Variables Guide:

| Variable | Description | Example (Story 5.2) |
|----------|-------------|---------------------|
| `{{COMPONENT_NAME}}` | React component name | `CommitmentForm` |
| `{{API_ENDPOINT_NAME}}` | API descriptive name | `Donor Commitments API` |
| `{{METHOD}}` | HTTP method | `POST`, `GET`, `PATCH` |
| `{{ENDPOINT_PATH}}` | API endpoint path | `/api/v1/donors/[id]/commitments` |
| `{{USER_ROLE}}` | User role for E2E | `Donor`, `Coordinator` |
| `{{FEATURE_NAME}}` | Feature description | `Commitment Management` |
| `{{RESOURCE_NAME}}` | Primary resource type | `commitment` |
| `{{ROLE_PATH}}` | Role URL path | `donor`, `coordinator` |

## Quality Gates

All templates include built-in quality gates:

1. **Framework Consistency**: Only Jest syntax allowed (no Vitest)
2. **Test Data Strategy**: Real database for integration, UI mocks for unit tests
3. **Accessibility**: Keyboard navigation and ARIA testing
4. **Error Handling**: Network errors and validation failures
5. **Role-Based Access**: Authorization testing for all user types

## Usage Checklist

Before implementing tests from templates:

- [ ] Story requirements analyzed and understood
- [ ] Test data identified and prepared
- [ ] API endpoints documented
- [ ] User workflows mapped out
- [ ] Role-based access patterns defined
- [ ] Error scenarios identified

After implementing tests:

- [ ] All tests pass locally
- [ ] Framework consistency validated (no vi.mock usage)
- [ ] Coverage thresholds met
- [ ] Database cleanup working
- [ ] E2E tests stable across browsers
- [ ] Accessibility tests passing

## Customization Guidelines

1. **Keep Template Structure**: Maintain the overall test organization
2. **Update Mock Patterns**: Add component-specific mocks as needed
3. **Expand Test Coverage**: Add edge cases specific to your feature
4. **Custom Assertions**: Replace generic assertions with feature-specific ones
5. **Add Integration Tests**: Test cross-component interactions
6. **Include Performance Tests**: Add load testing for critical paths

## Troubleshooting

### Common Issues and Solutions:

1. **Vitest Syntax Detection**: 
   - Problem: ESLint errors about vi.mock usage
   - Solution: Use jest.mock() instead (templates are pre-configured)

2. **Radix UI Testing**:
   - Problem: Select components not responding to clicks
   - Solution: Use keyboard interaction pattern (`{ArrowDown}{Enter}`)

3. **Database Cleanup**:
   - Problem: Test data persisting between runs
   - Solution: Ensure afterAll cleanup includes all created records

4. **Authentication**:
   - Problem: 401 errors in integration tests
   - Solution: Mock getServerSession in beforeEach blocks

5. **E2E Stability**:
   - Problem: Flaky tests due to timing issues
   - Solution: Add proper waitFor expectations and avoid hard-coded delays