# Admin Workflow Test Script

## Test User
- **Email**: admin@dms.gov.ng
- **Password**: admin123!
- **Role**: ADMIN

## Pre-Test Requirements
1. All other workflows should be completed first to have comprehensive test data
2. Read `test-data-tracker.json` for all data created by previous workflows
3. Open Chrome DevTools

## Test Workflow Steps

### 1. Authentication & Login
**Action**: Login with admin credentials
**Chrome DevTools Steps**:
1. Navigate to login page
2. Fill email field: `admin@dms.gov.ng`
3. Fill password field: `admin123!`
4. Click login button
5. Verify redirect to admin dashboard

**Expected Result**: Successfully logged in and redirected to `/admin/dashboard`
**Data to Track**: User session token, dashboard load time

---

### 2. Admin Dashboard Overview
**Action**: Explore admin dashboard and system overview
**Chrome DevTools Steps**:
1. Take screenshot of admin dashboard
2. Verify navigation menu displays admin-specific items:
   - Dashboard
   - User Management (with sub-items)
   - System Administration (with sub-items)
3. Review system overview metrics:
   - Total users by role
   - System activity statistics
   - Performance indicators
   - Security status

**Expected Result**: Admin dashboard shows comprehensive system overview
**Data to Track**: System metrics accuracy, dashboard load performance

---

### 3. User Management - View All Users
**Action**: Review all users in the system
**Chrome DevTools Steps**:
1. Navigate to `/admin/users`
2. View user list showing all test users from workflows:
   - Assessor users
   - Coordinator users
   - Responder users
   - Donor users
   - Multi-role users
3. Test user search and filtering:
   - Filter by role
   - Search by email/name
   - Filter by status (active/inactive)
4. Review user details by clicking on users
5. Verify user activity logs if available

**Expected Result**: All test users visible with accurate role assignments
**Data to Track**: User count by role, search/filter functionality

---

### 4. User Management - Create New User
**Action**: Create new user account
**Chrome DevTools Steps**:
1. Navigate to `/admin/users/new`
2. Create new user:
   - Email: admin.test.user@dms.gov.ng
   - Username: admintestuser
   - Name: Admin Test User
   - Organization: Test Organization
   - Initial Password: tempPassword123!
   - Role: COORDINATOR
3. Set user permissions and entity assignments
4. Send welcome email if feature available
5. Verify user appears in user list

**Expected Result**: New user created successfully
**Data to Track**: 
```json
{
  "createdUser": {
    "id": "new-user-id",
    "email": "admin.test.user@dms.gov.ng",
    "username": "admintestuser",
    "role": "COORDINATOR",
    "status": "ACTIVE",
    "createdAt": "timestamp"
  }
}
```

---

### 5. Role Management and Permissions
**Action**: Manage user roles and permissions
**Chrome DevTools Steps**:
1. Navigate to `/roles`
2. Review existing roles and their permissions
3. Modify role permissions:
   - Add new permission to ASSESSOR role
   - Remove permission from DONOR role
   - Test permission inheritance
4. Create custom role if supported:
   - Role Name: "FIELD_SUPERVISOR"
   - Description: "Supervises field assessment teams"
   - Permissions: Subset of COORDINATOR permissions
5. Assign new role to user
6. Test permission changes take effect

**Expected Result**: Role management functions correctly
**Data to Track**: Role modification success, permission propagation

---

### 6. Entity and Assignment Management
**Action**: Manage entity assignments across all users
**Chrome DevTools Steps**:
1. Review entity assignments for all users
2. Create new entity:
   - Name: "Admin Test Entity"
   - Type: FACILITY
   - Location: Test Location
   - Coordinates: Test GPS coordinates
3. Assign entities to users:
   - Assign new entity to multiple users
   - Remove existing assignments
   - Test bulk assignment operations
4. Review assignment conflicts and overlaps

**Expected Result**: Entity assignment management works correctly
**Data to Track**: 
```json
{
  "createdEntity": {
    "id": "admin-test-entity-id",
    "name": "Admin Test Entity",
    "type": "FACILITY",
    "createdAt": "timestamp"
  },
  "assignmentChanges": [
    {
      "userId": "user-id",
      "entityId": "entity-id",
      "action": "assigned/removed",
      "timestamp": "timestamp"
    }
  ]
}
```

---

### 7. System Configuration
**Action**: Test system-level configuration options
**Chrome DevTools Steps**:
1. Navigate to `/system/settings`
2. Review system configuration options:
   - Assessment workflow settings
   - Auto-approval thresholds
   - Notification settings
   - Integration settings
3. Modify system settings:
   - Change assessment timeout period
   - Update verification requirements
   - Modify gap field default severities
4. Test configuration validation
5. Apply changes and verify system behavior

**Expected Result**: System configuration changes apply correctly
**Data to Track**: Configuration changes made, system behavior validation

---

### 8. Audit Log Review
**Action**: Review comprehensive system audit logs
**Chrome DevTools Steps**:
1. Navigate to `/system/audit`
2. Review audit logs covering test period:
   - User login/logout events
   - Assessment creation/modification
   - Verification actions
   - Commitment management
   - System configuration changes
3. Test audit log filtering:
   - Filter by user
   - Filter by action type
   - Filter by date range
4. Export audit logs for analysis
5. Verify log completeness and accuracy

**Expected Result**: Audit logs capture all workflow activities accurately
**Data to Track**: Audit log completeness, filtering functionality, export success

---

### 9. Data Management and Integrity
**Action**: Test data management functions
**Chrome DevTools Steps**:
1. Navigate to `/system/database`
2. Review data integrity reports:
   - Orphaned records
   - Data consistency checks
   - Reference integrity validation
3. Test data export functions:
   - Export all assessments
   - Export user data
   - Export system configuration
4. Test data import capabilities if available
5. Run database maintenance operations

**Expected Result**: Data management tools function correctly
**Data to Track**: Data integrity status, export/import success rates

---

### 10. System Performance Monitoring
**Action**: Monitor system performance and health
**Chrome DevTools Steps**:
1. Review system performance metrics:
   - Response times for key operations
   - Database query performance
   - User session statistics
   - Error rates and patterns
2. Test system load handling:
   - Simulate multiple concurrent operations
   - Monitor resource utilization
   - Check for performance degradation
3. Review system health indicators
4. Test alert and notification systems

**Expected Result**: System performs well under normal and stressed conditions
**Data to Track**: Performance metrics, load testing results

---

### 11. Security Management
**Action**: Test security features and controls
**Chrome DevTools Steps**:
1. Review security settings:
   - Password policies
   - Session management
   - Access control enforcement
2. Test security features:
   - Failed login attempt handling
   - Session timeout enforcement
   - Permission boundary enforcement
3. Review security audit logs
4. Test user account security:
   - Force password changes
   - Lock/unlock user accounts
   - Reset user sessions

**Expected Result**: Security features function correctly
**Data to Track**: Security test results, policy enforcement effectiveness

---

### 12. Integration and API Management
**Action**: Test system integrations and API functionality
**Chrome DevTools Steps**:
1. Review API usage and health:
   - API endpoint performance
   - Authentication and authorization
   - Rate limiting effectiveness
2. Test external integrations if available:
   - Email notification systems
   - SMS alert systems
   - External data feeds
3. Monitor API logs for errors
4. Test API security and access controls

**Expected Result**: APIs and integrations function correctly
**Data to Track**: API performance metrics, integration success rates

---

### 13. Backup and Recovery
**Action**: Test backup and recovery procedures
**Chrome DevTools Steps**:
1. Review backup status and schedules
2. Test backup creation:
   - Manual backup initiation
   - Verify backup completion
   - Check backup file integrity
3. Test recovery procedures:
   - Simulate data recovery scenario
   - Verify recovery completeness
   - Test recovery time objectives
4. Review disaster recovery plans

**Expected Result**: Backup and recovery systems function correctly
**Data to Track**: Backup success rates, recovery test results

---

### 14. Cross-Workflow Data Verification
**Action**: Verify data consistency across all workflows
**Chrome DevTools Steps**:
1. Verify assessment workflow data:
   - Check assessments created by assessor
   - Verify verification actions by coordinator
   - Confirm response linkages by responder
   - Validate commitment connections by donor
2. Test data relationships:
   - Entity-assessment relationships
   - Incident-response relationships
   - User-permission relationships
3. Identify and resolve data inconsistencies
4. Generate comprehensive data integrity report

**Expected Result**: Data consistency maintained across all workflows
**Data to Track**: Data integrity status, relationship accuracy

---

### 15. System Maintenance and Optimization
**Action**: Perform system maintenance tasks
**Chrome DevTools Steps**:
1. Run system maintenance procedures:
   - Database optimization
   - Cache clearing
   - Log rotation
   - Temporary file cleanup
2. Update system configuration for optimal performance
3. Schedule automated maintenance tasks
4. Test system recovery after maintenance
5. Verify all workflows still function correctly

**Expected Result**: System maintenance improves performance without breaking functionality
**Data to Track**: Performance improvement metrics, function verification

---

## Comprehensive System Test

### 16. End-to-End System Validation
**Action**: Validate entire system using admin oversight
**Chrome DevTools Steps**:
1. Create complete end-to-end test scenario:
   - Create new incident as admin
   - Monitor assessment creation workflow
   - Oversee verification process
   - Track response plan development  
   - Monitor commitment fulfillment
2. Verify admin visibility into all workflow stages
3. Test admin intervention capabilities:
   - Override workflow decisions
   - Reassign responsibilities
   - Resolve system conflicts
4. Generate comprehensive system report

**Expected Result**: Admin has complete system oversight and control
**Data to Track**: 
```json
{
  "systemValidation": {
    "workflowsCompleted": 5,
    "dataConsistency": "verified",
    "performanceStatus": "acceptable",
    "securityStatus": "secure",
    "userSatisfaction": "measured",
    "systemHealth": "optimal"
  }
}
```

---

## Data Tracking

Update `test-data-tracker.json` with:
```json
{
  "workflows": {
    "admin": {
      "status": "completed",
      "createdData": [
        {
          "type": "user",
          "id": "new-user-id",
          "email": "admin.test.user@dms.gov.ng",
          "role": "COORDINATOR"
        },
        {
          "type": "entity",
          "id": "admin-test-entity-id", 
          "name": "Admin Test Entity",
          "type": "FACILITY"
        },
        {
          "type": "role",
          "name": "FIELD_SUPERVISOR",
          "permissions": "custom-permission-set"
        }
      ],
      "systemChecks": {
        "dataIntegrity": "verified",
        "performance": "acceptable",
        "security": "secure",
        "backups": "functional",
        "auditLogs": "complete"
      },
      "configurationChanges": [
        {
          "setting": "assessment-timeout",
          "oldValue": "previous-value",
          "newValue": "new-value",
          "timestamp": "change-time"
        }
      ],
      "issues": [
        {
          "description": "Any issues found",
          "severity": "high/medium/low",
          "location": "page/function where issue occurred",
          "resolution": "how issue was resolved"
        }
      ]
    }
  },
  "overallSystemStatus": {
    "allWorkflowsCompleted": true,
    "dataConsistencyVerified": true,
    "crossWorkflowIntegrationTested": true,
    "performanceAcceptable": true,
    "securityValidated": true,
    "systemHealthOptimal": true
  }
}
```

## Test Completion Checklist
- [ ] Login successful
- [ ] Admin dashboard functional
- [ ] User management works (view, create, modify)
- [ ] Role management and permissions work
- [ ] Entity assignment management functional
- [ ] System configuration options work
- [ ] Audit log review comprehensive
- [ ] Data management and integrity verified
- [ ] System performance monitoring functional
- [ ] Security management features work
- [ ] API and integration testing completed
- [ ] Backup and recovery tested
- [ ] Cross-workflow data verification completed
- [ ] System maintenance procedures tested
- [ ] End-to-end system validation completed
- [ ] Data tracking updated with complete results
- [ ] Overall system health verified