# Test User Credentials for Workflow Testing

## Available Test Users

### Admin Users
- **Email**: admin@dms.gov.ng
- **Password**: admin123!
- **Roles**: ADMIN (all permissions)
- **Description**: System administrator with full access

### Coordinator Users
- **Email**: coordinator@dms.gov.ng
- **Password**: coordinator123!
- **Roles**: COORDINATOR
- **Description**: Crisis coordinator for verification and management

- **Email**: coordinator@test.com
- **Password**: testpassword123
- **Roles**: COORDINATOR
- **Description**: E2E test coordinator

### Assessor Users
- **Email**: assessor@test.com
- **Password**: testpassword123
- **Roles**: ASSESSOR
- **Description**: Field assessor for rapid assessments

### Responder Users
- **Email**: responder@dms.gov.ng
- **Password**: responder123!
- **Roles**: RESPONDER
- **Description**: Response team member

### Donor Users
- **Email**: donor@test.com
- **Password**: donor123!
- **Roles**: DONOR
- **Description**: Donor organization contact

### Multi-Role User
- **Email**: multirole@dms.gov.ng
- **Password**: multirole123!
- **Roles**: ASSESSOR, COORDINATOR, DONOR, RESPONDER
- **Description**: Multi-role test user for role switching functionality

## Pre-seeded Data Available

### Entities
- entity-1: Maiduguri Metropolitan (LGA)
- entity-2: Jere Local Government (LGA)
- entity-3: Gwoza Local Government (LGA)
- entity-4: Primary Health Center Maiduguri (FACILITY)
- entity-5: IDP Camp Dalori (CAMP)

### Incidents
- incident-flood-001: Severe flooding in Maiduguri
- incident-drought-001: Agricultural drought in Gwoza

### Sample Assessments
- 5 rapid assessments (HEALTH, WASH, SHELTER, FOOD, SECURITY) for verification testing

### Sample Commitments
- 4 donor commitments for testing donor workflows

## Test Data Creation Guidelines

1. **Always use fresh data**: Create new entities/incidents during tests to avoid interference
2. **Track created data**: Log all created IDs in test-data-tracker.json
3. **Clean up**: Use the tracked data for cleanup between test runs
4. **Cross-workflow dependencies**: Use the tracking system to find data created by other workflows