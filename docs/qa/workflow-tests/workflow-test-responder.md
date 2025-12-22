# Responder Workflow Test Script

## Test User
- **Email**: responder@dms.gov.ng
- **Password**: responder123!
- **Role**: RESPONDER

## Pre-Test Requirements
1. Coordinator workflow should be completed first (uses incidents/assessments verified by coordinator)
2. Read `test-data-tracker.json` for verified assessments and created incidents
3. Open Chrome DevTools

## Test Workflow Steps

### 1. Authentication & Login
**Action**: Login with responder credentials
**Chrome DevTools Steps**:
1. Navigate to login page
2. Fill email field: `responder@dms.gov.ng`
3. Fill password field: `responder123!`
4. Click login button
5. Verify redirect to responder dashboard

**Expected Result**: Successfully logged in and redirected to `/responder/dashboard`
**Data to Track**: User session token, dashboard load time

---

### 2. Dashboard Navigation & Overview
**Action**: Explore responder dashboard
**Chrome DevTools Steps**:
1. Take screenshot of dashboard
2. Verify navigation menu displays responder-specific items:
   - Dashboard
   - Response Planning (with sub-items)
   - My Tasks
   - Team Status
3. Test navigation to each section
4. Verify dashboard shows relevant response metrics

**Expected Result**: All responder navigation items work and display relevant content
**Data to Track**: Navigation response times, dashboard content accuracy

---

### 3. View Available Assessments for Response
**Action**: Review verified assessments available for response planning
**Chrome DevTools Steps**:
1. Navigate to `/responder/dashboard`
2. Look for verified assessments section
3. Verify assessments processed by coordinator workflow appear
4. Check assessment details show gap indicators
5. Review assessment priority levels and gap severities

**Expected Result**: Verified assessments from coordinator workflow are visible
**Data to Track**: Available assessments count, gap data accuracy

---

### 4. Create New Response Plan
**Action**: Create response plan addressing verified assessment gaps
**Chrome DevTools Steps**:
1. Navigate to `/responder/planning/new`
2. Create new response plan:
   - Select incident from coordinator workflow
   - Select entity from verified assessments
   - Response Type: Select based on assessment gaps (e.g., HEALTH if health gaps exist)
   - Priority: Set based on assessment severity
   - Response Title: "Test Response - Responder Workflow"
   - Description: Detail how response addresses specific gaps
   - Target Date: Set realistic response timeline
   - Resource Requirements: List needed resources
3. Add response activities:
   - Activity 1: Address primary gap identified in assessment
   - Activity 2: Address secondary gap
   - Activity 3: Monitoring and evaluation
4. Submit response plan

**Expected Result**: Response plan created successfully
**Data to Track**: 
```json
{
  "createdResponse": {
    "id": "response-plan-id",
    "incidentId": "from-coordinator-workflow",
    "entityId": "from-verified-assessment",
    "type": "HEALTH",
    "title": "Test Response - Responder Workflow",
    "status": "PLANNED",
    "createdAt": "timestamp"
  }
}
```

---

### 5. Response Planning Dashboard
**Action**: Test response planning features
**Chrome DevTools Steps**:
1. Navigate to `/responder/planning/`
2. View response planning dashboard
3. Test planning tools:
   - Resource calculation
   - Timeline planning
   - Team assignment
4. Create multiple response plans for different assessment types
5. Test response plan templates if available

**Expected Result**: Response planning tools function correctly
**Data to Track**: Planning tool functionality, template availability

---

### 6. My Responses Management
**Action**: Manage created response plans
**Chrome DevTools Steps**:
1. Navigate to `/responder/responses`
2. Verify created response plans appear in list
3. Edit existing response plan:
   - Update timeline
   - Modify resource requirements
   - Add additional activities
4. Test status updates:
   - Change status from PLANNED to IN_PROGRESS
   - Add progress notes
   - Update completion percentages
5. Test response plan sharing/collaboration features

**Expected Result**: Response management functions work correctly
**Data to Track**: Response plan modifications, status updates, collaboration features

---

### 7. Commitment Import and Management
**Action**: Test donor commitment integration
**Chrome DevTools Steps**:
1. Navigate to `/responder/planning?tab=commitments`
2. View available donor commitments (should include commitments from coordinator workflow)
3. Test commitment import:
   - Select relevant commitments for response plans
   - Link commitments to specific response activities
   - Verify resource alignment
4. Test commitment tracking:
   - Monitor delivery status
   - Update receipt confirmations
   - Report delivery issues

**Expected Result**: Commitment integration works with donor data
**Data to Track**: 
```json
{
  "importedCommitments": [
    {
      "commitmentId": "from-coordinator-workflow",
      "responseId": "linked-response-plan",
      "importDate": "timestamp",
      "status": "LINKED"
    }
  ]
}
```

---

### 8. Task Management
**Action**: Test task assignment and tracking
**Chrome DevTools Steps**:
1. Navigate to `/tasks`
2. View assigned tasks related to response plans
3. Create new task:
   - Task title: "Deploy Emergency Health Kit"
   - Related to: Created response plan
   - Assignee: Self or team member
   - Due date: Set realistic deadline
   - Priority: Based on gap severity
4. Update task status:
   - Mark tasks as in progress
   - Add progress notes
   - Complete tasks
   - Report obstacles

**Expected Result**: Task management system functions correctly
**Data to Track**: 
```json
{
  "createdTasks": [
    {
      "id": "task-id",
      "title": "Deploy Emergency Health Kit",
      "responseId": "linked-response-plan",
      "status": "IN_PROGRESS",
      "createdAt": "timestamp"
    }
  ]
}
```

---

### 9. Team Status and Collaboration
**Action**: Test team management features
**Chrome DevTools Steps**:
1. Navigate to `/team`
2. View team status dashboard
3. Test team features:
   - View team member availability
   - Assign team members to response activities
   - Communication tools (if available)
   - Resource sharing
4. Update personal status
5. Report team capacity and limitations

**Expected Result**: Team management features function correctly
**Data to Track**: Team functionality, collaboration tool effectiveness

---

### 10. Response Execution and Monitoring
**Action**: Test response implementation tracking
**Chrome DevTools Steps**:
1. Return to response plans
2. Begin response execution:
   - Update response status to EXECUTING
   - Log implementation activities
   - Track resource deployment
   - Monitor progress against plan
3. Update assessment status:
   - Report on gap resolution progress
   - Update beneficiary numbers
   - Document outcomes
4. Complete response activities
5. Submit completion reports

**Expected Result**: Response execution tracking works correctly
**Data to Track**: 
```json
{
  "responseExecution": [
    {
      "responseId": "response-plan-id",
      "status": "EXECUTING",
      "activitiesCompleted": 2,
      "beneficiariesReached": 150,
      "gapsAddressed": ["hasFunctionalClinic", "hasEmergencyServices"],
      "completionDate": "timestamp"
    }
  ]
}
```

---

### 11. Resource Management
**Action**: Test resource tracking and reporting
**Chrome DevTools Steps**:
1. Navigate to resource management sections
2. Track resource usage:
   - Monitor resource consumption
   - Report shortfalls
   - Request additional resources
3. Integrate with donor commitments:
   - Verify resource deliveries
   - Report delivery discrepancies
   - Update delivery status

**Expected Result**: Resource management integrates with commitments and responses
**Data to Track**: Resource tracking accuracy, integration effectiveness

---

### 12. Response Reporting
**Action**: Generate response reports
**Chrome DevTools Steps**:
1. Navigate to reporting features
2. Generate response summary reports:
   - Response plan effectiveness
   - Gap resolution progress
   - Resource utilization
   - Beneficiary impact
3. Create incident response summary
4. Test report export functionality

**Expected Result**: Response reporting generates accurate data
**Data to Track**: Report generation success, data accuracy

---

### 13. Integration Testing
**Action**: Verify integration with other workflow data
**Chrome DevTools Steps**:
1. Confirm response plans address gaps identified in assessor workflow
2. Verify integration with incidents created in coordinator workflow
3. Test that completed responses update assessment status
4. Check that resource usage is reflected in donor commitment tracking

**Expected Result**: Seamless integration across all workflows
**Data to Track**: Integration accuracy, data consistency

---

### 14. Role-Based Access Control
**Action**: Test responder-level access permissions
**Chrome DevTools Steps**:
1. Verify access to all responder functions
2. Test restricted access to:
   - Coordinator verification functions
   - Admin user management
   - Donor-specific financial data
3. Verify can view assessment details but not modify verification status

**Expected Result**: Responder has appropriate access levels
**Data to Track**: Access control behavior, permission boundaries

---

## Data Tracking

Update `test-data-tracker.json` with:
```json
{
  "workflows": {
    "responder": {
      "status": "completed",
      "createdData": [
        {
          "type": "response",
          "id": "response-plan-id",
          "title": "Test Response - Responder Workflow",
          "incidentId": "from-coordinator-workflow",
          "entityId": "from-verified-assessment",
          "type": "HEALTH",
          "status": "EXECUTING"
        },
        {
          "type": "task",
          "id": "task-id",
          "title": "Deploy Emergency Health Kit",
          "responseId": "response-plan-id",
          "status": "COMPLETED"
        }
      ],
      "addressedGaps": [
        {
          "assessmentId": "from-assessor-workflow",
          "gapsAddressed": ["hasFunctionalClinic", "hasEmergencyServices"],
          "responseId": "response-plan-id",
          "completionDate": "timestamp"
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
- [ ] Dashboard navigation functional
- [ ] Verified assessments visible and accessible
- [ ] Response plan creation works
- [ ] Response planning tools functional
- [ ] Response management features work
- [ ] Commitment import and tracking works
- [ ] Task management functional
- [ ] Team status and collaboration tools work
- [ ] Response execution tracking works
- [ ] Resource management integrates correctly
- [ ] Response reporting generates accurate data
- [ ] Cross-workflow integration verified
- [ ] Access control verified
- [ ] Data tracking updated
- [ ] Response plans created for donor workflow testing