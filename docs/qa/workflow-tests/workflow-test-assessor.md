# Assessor Workflow Test Script

## Test User
- **Email**: assessor@test.com
- **Password**: testpassword123
- **Role**: ASSESSOR

## Pre-Test Requirements
1. **COORDINATOR WORKFLOW MUST BE COMPLETED FIRST** - Creates incidents and entities for assessments
2. Read `test-data-tracker.json` for incident IDs and entity IDs created by coordinator
3. Open Chrome DevTools
4. Navigate to the application URL

**CRITICAL**: This workflow depends on coordinator-created incidents and entities. Do not proceed without completing coordinator workflow first.

## Test Workflow Steps

### 1. Authentication & Login
**Action**: Login with assessor credentials
**Chrome DevTools Steps**:
1. Navigate to login page
2. Fill email field: `assessor@test.com`
3. Fill password field: `testpassword123`
4. Click login button
5. Verify redirect to assessor dashboard

**Expected Result**: Successfully logged in and redirected to `/assessor/dashboard`
**Data to Track**: User session token, dashboard load time

---

### 2. Dashboard Navigation & Overview
**Action**: Explore assessor dashboard
**Chrome DevTools Steps**:
1. Take screenshot of dashboard
2. Verify navigation menu displays correctly
3. Check for assessor-specific menu items:
   - Dashboard
   - Rapid Assessments
   - Create New Assessment
   - Preliminary Assessment
4. Click on each navigation item to verify accessibility

**Expected Result**: All assessor navigation items work and display correct content
**Data to Track**: Navigation response times, any 404 errors

---

### 3. Create New Rapid Assessment Using Coordinator Data
**Action**: Create a health assessment linked to coordinator-created incident and entity
**Chrome DevTools Steps**:
1. Click "Create New Assessment" or navigate to `/assessor/rapid-assessments/new`
2. Fill out assessment form using coordinator-created data:
   - Assessment Type: HEALTH
   - Entity: **Select "Test Health Center - Workflow Testing"** (from coordinator workflow)
   - Incident: **Select "Test Flood Emergency - Workflow Testing"** (from coordinator workflow) 
   - Location: Use provided coordinates or GPS
   - Assessment Date: Today's date
3. Fill health-specific fields with gap indicators:
   - Has Functional Clinic: **No** (creates critical gap)
   - Has Emergency Services: **No** (creates critical gap)
   - Number of Health Facilities: **0** (creates gap)
   - Has Trained Staff: **No** (creates gap)
   - Has Medicine Supply: **No** (creates gap)
   - Medical Supplies Available: **No** (creates gap)
   - Has Maternal Child Services: **No** (creates gap)
4. Add photos if possible
5. Submit assessment

**Expected Result**: Assessment created successfully with ID
**Data to Track**: 
```json
{
  "assessmentId": "recorded-id",
  "entityId": "coordinator-created-health-center-id", 
  "incidentId": "coordinator-created-flood-incident-id",
  "assessmentType": "HEALTH",
  "createdAt": "timestamp",
  "status": "SUBMITTED",
  "hasGaps": true,
  "criticalGaps": ["hasFunctionalClinic", "hasEmergencyServices"]
}
```

---

### 4. View Assessment List
**Action**: Navigate to assessments list and verify new assessment appears
**Chrome DevTools Steps**:
1. Navigate to `/assessor/rapid-assessments`
2. Verify the newly created assessment appears in the list
3. Check status is "SUBMITTED"
4. Click on assessment to view details
5. Verify all entered data is displayed correctly

**Expected Result**: Assessment visible in list with correct status and details
**Data to Track**: Assessment list load time, assessment details accuracy

---

### 5. Create Additional Assessment Types Using Coordinator Data
**Action**: Create assessments for each type using coordinator-created entities and incidents
**Chrome DevTools Steps**:

**WASH Assessment (IDP Camp + Health Crisis)**:
1. Navigate to create new assessment
2. Assessment Type: WASH
3. Entity: **Select "Test IDP Camp - Workflow Testing"** (coordinator-created)
4. Incident: **Select "Test Health Crisis - Workflow Testing"** (coordinator-created)
5. Fill WASH fields with gaps:
   - Is Water Sufficient: **No** (creates gap)
   - Has Clean Water Access: **No** (creates critical gap)
   - Are Latrines Sufficient: **No** (creates gap)
   - Has Handwashing Facilities: **No** (creates gap)
   - Has Open Defecation Concerns: **Yes** (creates gap)

**SHELTER Assessment (Community Center + Flood)**:
1. Assessment Type: SHELTER
2. Entity: **Select "Test Community Center - Workflow Testing"** (coordinator-created)
3. Incident: **Select "Test Flood Emergency - Workflow Testing"** (coordinator-created)
4. Fill SHELTER fields with gaps:
   - Are Shelters Sufficient: **No** (creates gap)
   - Has Safe Structures: **No** (creates critical gap)
   - Are Overcrowded: **Yes** (creates gap)
   - Provide Weather Protection: **No** (creates gap)

**FOOD Assessment (School + Health Crisis)**:
1. Assessment Type: FOOD
2. Entity: **Select "Test School Facility - Workflow Testing"** (coordinator-created)
3. Incident: **Select "Test Health Crisis - Workflow Testing"** (coordinator-created)
4. Fill FOOD fields with gaps:
   - Is Food Sufficient: **No** (creates gap)
   - Has Regular Meal Access: **No** (creates critical gap)
   - Has Infant Nutrition: **No** (creates gap)

**Expected Result**: Multiple assessments created linking to coordinator data
**Data to Track**: 
```json
{
  "additionalAssessments": [
    {
      "assessmentId": "wash-assessment-id",
      "type": "WASH", 
      "entityId": "coordinator-idp-camp-id",
      "incidentId": "coordinator-health-crisis-id",
      "criticalGaps": ["hasCleanWaterAccess"]
    },
    {
      "assessmentId": "shelter-assessment-id",
      "type": "SHELTER",
      "entityId": "coordinator-community-center-id", 
      "incidentId": "coordinator-flood-incident-id",
      "criticalGaps": ["hasSafeStructures"]
    },
    {
      "assessmentId": "food-assessment-id",
      "type": "FOOD",
      "entityId": "coordinator-school-facility-id",
      "incidentId": "coordinator-health-crisis-id", 
      "criticalGaps": ["hasRegularMealAccess"]
    }
  ]
}
```

---

### 6. Edit Existing Assessment
**Action**: Modify a submitted assessment if allowed
**Chrome DevTools Steps**:
1. Navigate to assessment list
2. Try to edit one of the created assessments
3. Modify some fields
4. Attempt to save changes
5. Check if editing is permitted based on assessment status

**Expected Result**: Editing behavior matches system permissions (may be restricted)
**Data to Track**: Edit permissions, any error messages

---

### 7. GPS and Photo Functionality
**Action**: Test GPS capture and photo upload if available
**Chrome DevTools Steps**:
1. Create new assessment
2. Test GPS location capture
3. Test photo upload functionality
4. Verify multimedia data is saved correctly

**Expected Result**: GPS and photos work in offline/online scenarios
**Data to Track**: GPS accuracy, photo upload success/failure

---

### 8. Offline Functionality Testing
**Action**: Test offline assessment creation
**Chrome DevTools Steps**:
1. Disable network in Chrome DevTools (Network tab → Offline)
2. Try to create a new assessment
3. Fill out form and attempt to submit
4. Check if data is saved locally
5. Re-enable network and verify sync behavior

**Expected Result**: Assessment saved offline and synced when online
**Data to Track**: Offline storage behavior, sync success/failure

---

### 9. Navigation Menu Coverage
**Action**: Test all navigation menu items
**Chrome DevTools Steps**:
1. Systematically click every navigation menu item
2. Verify each page loads correctly
3. Test breadcrumb navigation
4. Test mobile navigation if responsive

**Expected Result**: All navigation links work, no broken pages
**Data to Track**: Any 404 errors, broken navigation links

---

### 10. Role-Based Access Control
**Action**: Test access to restricted areas
**Chrome DevTools Steps**:
1. Try to access coordinator URLs directly:
   - `/coordinator/dashboard`
   - `/coordinator/verification`
   - `/admin/users`
2. Verify proper access control

**Expected Result**: Access denied to non-assessor areas
**Data to Track**: Security behavior, proper error messages

---

## Data Tracking

Update `test-data-tracker.json` with:
```json
{
  "workflows": {
    "assessor": {
      "status": "completed",
      "createdData": [
        {
          "type": "assessment",
          "id": "assessment-id-1",
          "assessmentType": "HEALTH",
          "entityId": "entity-id",
          "incidentId": "incident-id",
          "hasGaps": true
        },
        {
          "type": "assessment", 
          "id": "assessment-id-2",
          "assessmentType": "WASH",
          "entityId": "entity-id-2",
          "incidentId": "incident-id-2", 
          "hasGaps": true
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
- [ ] Dashboard loads correctly
- [ ] Navigation menu functional
- [ ] New assessment creation works
- [ ] Assessment appears in list
- [ ] Multiple assessment types created
- [ ] GPS/photo functionality tested
- [ ] Offline functionality tested
- [ ] All navigation items tested
- [ ] Access control verified
- [ ] Data tracking updated
- [ ] Screenshots taken for issues
- [ ] Test data documented for coordinator workflow use