# Coordinator Workflow Test Script

## Test User
- **Email**: coordinator@test.com  
- **Password**: testpassword123
- **Role**: COORDINATOR

## Pre-Test Requirements
1. **COORDINATOR RUNS FIRST** - Creates foundational incidents and entities for all other workflows
2. Copy `data-tracker-template.json` to `test-data-tracker.json`
3. Open Chrome DevTools
4. Application should be running with seeded users

## Test Workflow Steps

### 1. Authentication & Login
**Action**: Login with coordinator credentials
**Chrome DevTools Steps**:
1. Navigate to login page
2. Fill email field: `coordinator@test.com`
3. Fill password field: `testpassword123`
4. Click login button
5. Verify redirect to coordinator dashboard

**Expected Result**: Successfully logged in and redirected to `/coordinator/dashboard`
**Data to Track**: User session token, dashboard load time

---

### 2. Create Foundation Test Data (CRITICAL - ALL OTHER WORKFLOWS DEPEND ON THIS)

#### 2A. Create Test Incidents
**Action**: Create two test incidents that will be used throughout all workflows
**Chrome DevTools Steps**:
1. Navigate to `/coordinator/incidents` or incident management section
2. Create **Incident 1 - Flood Emergency**:
   - Type: FLOOD
   - Severity: HIGH
   - Status: ACTIVE
   - Title: "Test Flood Emergency - Workflow Testing"
   - Description: "Severe flooding affecting multiple communities - created for comprehensive workflow testing"
   - Location: "Maiduguri Test Area"
   - Coordinates: { lat: 11.8311, lng: 13.1566 }
   - Date: Current date
3. Submit and record incident ID
4. Create **Incident 2 - Health Crisis**:
   - Type: DISEASE_OUTBREAK
   - Severity: CRITICAL
   - Status: ACTIVE
   - Title: "Test Health Crisis - Workflow Testing"
   - Description: "Health emergency requiring immediate assessment and response - created for workflow testing"
   - Location: "Gwoza Test Area"
   - Coordinates: { lat: 11.0417, lng: 13.6875 }
   - Date: Current date
5. Submit and record incident ID

**Expected Result**: Two test incidents created successfully
**Data to Track**:
```json
{
  "createdIncidents": [
    {
      "id": "RECORD-ACTUAL-ID",
      "type": "FLOOD",
      "title": "Test Flood Emergency - Workflow Testing",
      "severity": "HIGH",
      "location": "Maiduguri Test Area"
    },
    {
      "id": "RECORD-ACTUAL-ID", 
      "type": "DISEASE_OUTBREAK",
      "title": "Test Health Crisis - Workflow Testing",
      "severity": "CRITICAL",
      "location": "Gwoza Test Area"
    }
  ]
}
```

#### 2B. Create Test Entities
**Action**: Create multiple test entities for comprehensive workflow testing
**Chrome DevTools Steps**:
1. Navigate to `/coordinator/entities` or entity management section
2. Create **Entity 1 - Health Facility**:
   - Name: "Test Health Center - Workflow Testing"
   - Type: FACILITY
   - Location: "Maiduguri Test District"
   - Coordinates: { lat: 11.8467, lng: 13.1569 }
   - Description: "Primary health center for workflow testing"
3. Create **Entity 2 - IDP Camp**:
   - Name: "Test IDP Camp - Workflow Testing"
   - Type: CAMP
   - Location: "Gwoza Test Area"
   - Coordinates: { lat: 11.0544, lng: 13.7839 }
   - Description: "IDP camp for workflow testing scenarios"
4. Create **Entity 3 - Community**:
   - Name: "Test Community Center - Workflow Testing"
   - Type: COMMUNITY
   - Location: "Jere Test Area"
   - Coordinates: { lat: 11.8822, lng: 13.2143 }
   - Description: "Community center for workflow testing"
5. Create **Entity 4 - School**:
   - Name: "Test School Facility - Workflow Testing"
   - Type: FACILITY
   - Location: "Maiduguri Test Zone"
   - Coordinates: { lat: 11.8200, lng: 13.1400 }
   - Description: "School facility serving as emergency shelter"

**Expected Result**: Four test entities created successfully
**Data to Track**:
```json
{
  "createdEntities": [
    {
      "id": "RECORD-ACTUAL-ID",
      "name": "Test Health Center - Workflow Testing",
      "type": "FACILITY",
      "location": "Maiduguri Test District"
    },
    {
      "id": "RECORD-ACTUAL-ID",
      "name": "Test IDP Camp - Workflow Testing", 
      "type": "CAMP",
      "location": "Gwoza Test Area"
    },
    {
      "id": "RECORD-ACTUAL-ID",
      "name": "Test Community Center - Workflow Testing",
      "type": "COMMUNITY", 
      "location": "Jere Test Area"
    },
    {
      "id": "RECORD-ACTUAL-ID",
      "name": "Test School Facility - Workflow Testing",
      "type": "FACILITY",
      "location": "Maiduguri Test Zone"
    }
  ]
}
```

**CRITICAL**: Update `test-data-tracker.json` immediately with all incident and entity IDs. These will be used by ALL subsequent workflows.

---

### 3. Dashboard Navigation & Overview
**Action**: Explore coordinator dashboard sections
**Chrome DevTools Steps**:
1. Take screenshot of main dashboard
2. Verify navigation menu shows coordinator-specific items:
   - Overview & Analytics (with Crisis Dashboard, Situation Awareness)
   - Operations Management (Verification Queue, Entity Management, etc.)
   - Donor Relations (Donor Management, Metrics)
   - Configuration (Auto-Approval, Gap Field Management)
   - Mapping & Visualization
3. Test expandable navigation sections
4. Click on each main section to verify accessibility

**Expected Result**: All coordinator navigation sections work and display content
**Data to Track**: Navigation response times, any 404 errors, section expansion behavior

---

### 3. Crisis Management Dashboard
**Action**: Test crisis dashboard functionality
**Chrome DevTools Steps**:
1. Navigate to `/coordinator/dashboard?view=crisis`
2. Verify dashboard displays:
   - Pending assessments count
   - Active incidents
   - Gap analysis summary
   - Entity status overview
3. Test any interactive elements (filters, charts)
4. Take screenshot of crisis dashboard

**Expected Result**: Crisis dashboard loads with real data and functional controls
**Data to Track**: Dashboard metrics, data accuracy, load times

---

### 4. Verification Queue Management
**Action**: Process assessments created by assessor workflow
**Chrome DevTools Steps**:
1. Navigate to `/coordinator/verification`
2. Verify assessments from assessor workflow appear in queue
3. Select first assessment for verification:
   - Click on assessment item
   - Review assessment details
   - Check gap field indicators (should show red/critical gaps from assessor)
   - Approve or reject assessment
   - Add verification notes
4. Process multiple assessments from the queue
5. Test bulk actions if available

**Expected Result**: Assessments from assessor workflow visible and processable
**Data to Track**: 
```json
{
  "verifiedAssessments": [
    {
      "assessmentId": "from-assessor-workflow",
      "action": "approved/rejected",
      "verificationTime": "timestamp",
      "notes": "verification notes"
    }
  ]
}
```

---

### 5. Entity Management
**Action**: Test entity assignment and management
**Chrome DevTools Steps**:
1. Navigate to `/coordinator/entities`
2. View list of entities
3. Create new entity:
   - Name: "Test Entity - Coordinator Workflow" 
   - Type: Select appropriate type
   - Location: Add location details
   - Coordinates: Add GPS coordinates
4. Assign users to entities
5. Edit existing entity information
6. Test entity search/filter functionality

**Expected Result**: Entity creation, editing, and assignment functions work
**Data to Track**: 
```json
{
  "createdEntity": {
    "id": "new-entity-id",
    "name": "Test Entity - Coordinator Workflow",
    "type": "selected-type",
    "createdAt": "timestamp"
  }
}
```

---

### 6. Incident Management
**Action**: Create and manage disaster incidents
**Chrome DevTools Steps**:
1. Navigate to `/coordinator/incidents`
2. Create new incident:
   - Type: FLOOD
   - Severity: HIGH
   - Description: "Test Incident for Coordinator Workflow"
   - Location: Select entity or geographic area
   - Status: ACTIVE
3. Edit incident details
4. Link assessments to incident
5. Update incident status

**Expected Result**: Incident creation and management functions work
**Data to Track**: 
```json
{
  "createdIncident": {
    "id": "new-incident-id",
    "type": "FLOOD",
    "severity": "HIGH",
    "description": "Test Incident for Coordinator Workflow",
    "status": "ACTIVE",
    "createdAt": "timestamp"
  }
}
```

---

### 7. Gap Field Management
**Action**: Test gap field severity configuration
**Chrome DevTools Steps**:
1. Navigate to `/coordinator/settings/gap-field-management`
2. View current gap field severities
3. Modify severity levels:
   - Change "hasFunctionalClinic" from MEDIUM to HIGH
   - Change "hasEmergencyServices" from MEDIUM to CRITICAL
   - Save changes
4. Test how severity changes affect assessment displays
5. Verify changes are reflected in verification queue

**Expected Result**: Gap field severities can be modified and changes are reflected
**Data to Track**: Gap field modifications made, visual impact verification

---

### 8. Auto-Approval Management
**Action**: Configure automatic approval settings
**Chrome DevTools Steps**:
1. Navigate to `/coordinator/auto-approval`
2. Review current auto-approval rules
3. Create new auto-approval rule:
   - Assessment Type: SECURITY
   - Conditions: No critical gaps
   - Auto-approve: Yes
4. Test auto-approval functionality with new assessment
5. Monitor approval workflow

**Expected Result**: Auto-approval rules can be configured and function correctly
**Data to Track**: Auto-approval rules created, effectiveness testing results

---

### 9. Donor Relations Management
**Action**: Test donor and commitment management
**Chrome DevTools Steps**:
1. Navigate to `/coordinator/donors`
2. View existing donors
3. Create new donor:
   - Organization name
   - Contact information
   - Type and classification
4. Navigate to `/coordinator/resource-management`
5. Review donor commitments
6. Link commitments to verified assessments
7. Update commitment status

**Expected Result**: Donor management and resource coordination functions work
**Data to Track**: 
```json
{
  "createdDonor": {
    "id": "new-donor-id",
    "name": "Test Donor Organization",
    "type": "ORGANIZATION",
    "createdAt": "timestamp"
  },
  "managedCommitments": [
    {
      "commitmentId": "commitment-id",
      "action": "status-updated",
      "newStatus": "APPROVED"
    }
  ]
}
```

---

### 10. Mapping & Visualization
**Action**: Test mapping and visual analytics
**Chrome DevTools Steps**:
1. Navigate to `/coordinator/entity-incident-map`
2. Test interactive map functionality:
   - Entity markers display correctly
   - Incident overlays work
   - Assessment status indicators visible
3. Navigate to `/coordinator/maps`
4. Test advanced mapping tools
5. Test incident selector functionality

**Expected Result**: Maps display correctly with interactive features
**Data to Track**: Map load times, interactive feature functionality, data accuracy

---

### 11. Export & Reporting Functions
**Action**: Test data export and report generation
**Chrome DevTools Steps**:
1. Navigate to `/coordinator/dashboard?tab=exports`
2. Test various export options:
   - Assessment data export
   - Incident reports
   - Gap analysis reports
3. Navigate to `/coordinator/dashboard?tab=reports`
4. Create custom report:
   - Select assessment data from date range
   - Include verified assessments from workflow
   - Generate and download report

**Expected Result**: Export and reporting functions generate correct data
**Data to Track**: Export success/failure, report accuracy, file download success

---

### 12. Situation Awareness Dashboard
**Action**: Test comprehensive monitoring dashboard
**Chrome DevTools Steps**:
1. Navigate to `/coordinator/situation-dashboard`
2. Verify real-time data displays:
   - Assessment status overview
   - Gap analysis visualization
   - Resource allocation status
   - Incident progression
3. Test dashboard filters and interactions
4. Verify data from assessor workflow appears correctly

**Expected Result**: Situation dashboard provides comprehensive real-time view
**Data to Track**: Dashboard data accuracy, real-time updates, filter functionality

---

### 13. Role-Based Access Control
**Action**: Test coordinator-level access permissions
**Chrome DevTools Steps**:
1. Verify access to all coordinator functions
2. Test access to admin functions (should be denied):
   - `/admin/users`
   - `/admin/dashboard`
3. Verify can view but not edit donor-specific areas

**Expected Result**: Coordinator has appropriate access levels
**Data to Track**: Access control behavior, proper permission enforcement

---

## Cross-Workflow Integration Testing

### 14. Assessor Data Integration
**Action**: Verify assessor-created data is properly integrated
**Chrome DevTools Steps**:
1. Check that all assessments from assessor workflow appear in verification queue
2. Verify assessment details match what was created by assessor
3. Test that verification changes assessment status
4. Confirm gap field indicators reflect assessor input

**Expected Result**: Seamless integration of assessor workflow data
**Data to Track**: Data consistency, integration accuracy

---

## Data Tracking

Update `test-data-tracker.json` with:
```json
{
  "workflows": {
    "coordinator": {
      "status": "completed",
      "createdData": [
        {
          "type": "entity",
          "id": "new-entity-id",
          "name": "Test Entity - Coordinator Workflow"
        },
        {
          "type": "incident", 
          "id": "new-incident-id",
          "type": "FLOOD",
          "description": "Test Incident for Coordinator Workflow"
        },
        {
          "type": "donor",
          "id": "new-donor-id",
          "name": "Test Donor Organization"
        }
      ],
      "processedData": [
        {
          "type": "verification",
          "assessmentId": "from-assessor-workflow",
          "action": "approved",
          "timestamp": "verification-time"
        }
      ],
      "issues": [
        {
          "description": "Any issues found",
          "severity": "high/medium/low", 
          "location": "page/function where issue occurred"
        }
      ]
    }
  }
}
```

## Test Completion Checklist
- [ ] Login successful
- [ ] All dashboard sections accessible
- [ ] Crisis dashboard functional
- [ ] Verification queue processes assessor data
- [ ] Entity management works
- [ ] Incident management works
- [ ] Gap field management functional
- [ ] Auto-approval configuration works
- [ ] Donor relations management works
- [ ] Mapping and visualization functional
- [ ] Export and reporting works
- [ ] Situation awareness dashboard works
- [ ] Access control verified
- [ ] Cross-workflow integration verified
- [ ] Data tracking updated
- [ ] New data created for responder/donor workflows