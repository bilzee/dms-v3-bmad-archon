# Donor Workflow Test Script

## Test User
- **Email**: donor@test.com
- **Password**: donor123!
- **Role**: DONOR

## Pre-Test Requirements
1. All previous workflows (Assessor, Coordinator, Responder) should be completed first
2. Read `test-data-tracker.json` for available entities, incidents, and response plans
3. Open Chrome DevTools

## Test Workflow Steps

### 1. Authentication & Login
**Action**: Login with donor credentials
**Chrome DevTools Steps**:
1. Navigate to login page
2. Fill email field: `donor@test.com`
3. Fill password field: `donor123!`
4. Click login button
5. Verify redirect to donor dashboard

**Expected Result**: Successfully logged in and redirected to `/donor/dashboard`
**Data to Track**: User session token, dashboard load time

---

### 2. Dashboard Navigation & Overview
**Action**: Explore donor dashboard
**Chrome DevTools Steps**:
1. Take screenshot of donor dashboard
2. Verify navigation menu displays donor-specific items:
   - Dashboard
   - My Commitments (with sub-items)
   - Assigned Entities (with sub-items)
   - Performance & Analytics (with sub-items)
3. Test expandable navigation sections
4. Verify dashboard shows donor-relevant metrics:
   - Commitment status
   - Impact metrics
   - Performance indicators

**Expected Result**: All donor navigation items work and display relevant content
**Data to Track**: Navigation response times, dashboard metrics accuracy

---

### 3. View Assigned Entities
**Action**: Review entities assigned to donor
**Chrome DevTools Steps**:
1. Navigate to `/donor/entities`
2. Verify assigned entities are displayed
3. Click on entity to view details:
   - Entity information
   - Current assessment status
   - Active incidents affecting entity
   - Gap analysis for entity
4. Review entity performance metrics
5. Check location mapping if available

**Expected Result**: Assigned entities displayed with accurate status and gap information
**Data to Track**: Entity assignment accuracy, gap data visibility

---

### 4. View Entity Performance and Impact
**Action**: Review entity performance metrics
**Chrome DevTools Steps**:
1. Navigate to `/donor/entities/performance`
2. Review performance metrics for assigned entities:
   - Assessment scores over time
   - Gap resolution progress
   - Response plan effectiveness
3. Navigate to `/donor/entities/impact`
4. Review impact metrics:
   - Beneficiaries reached
   - Services improved
   - Gaps closed through commitments

**Expected Result**: Performance and impact data reflects real entity status
**Data to Track**: Metrics accuracy, data visualization functionality

---

### 5. Create New Commitment
**Action**: Create commitment based on identified gaps
**Chrome DevTools Steps**:
1. Navigate to `/donor/dashboard?action=new-commitment`
2. Create new commitment addressing gaps from workflows:
   - Select entity from assigned entities
   - Select incident from available incidents
   - Commitment Type: Based on gaps (e.g., HEALTH, WASH, SHELTER)
   - Items to commit:
     - Item 1: "Emergency Medical Supplies" - 50 boxes
     - Item 2: "Water Purification Tablets" - 200 packages  
     - Item 3: "Temporary Health Clinic Setup" - 1 unit
   - Total commitment value
   - Delivery timeline: 2 weeks
   - Notes: "Addressing critical health gaps identified in assessments"
3. Submit commitment

**Expected Result**: Commitment created successfully
**Data to Track**: 
```json
{
  "createdCommitment": {
    "id": "new-commitment-id",
    "entityId": "from-assigned-entities",
    "incidentId": "from-workflows",
    "type": "HEALTH",
    "items": [
      {"name": "Emergency Medical Supplies", "unit": "boxes", "quantity": 50},
      {"name": "Water Purification Tablets", "unit": "packages", "quantity": 200},
      {"name": "Temporary Health Clinic Setup", "unit": "unit", "quantity": 1}
    ],
    "status": "PLANNED",
    "deliveryDate": "target-date",
    "createdAt": "timestamp"
  }
}
```

---

### 6. Commitment Management
**Action**: Manage existing and new commitments
**Chrome DevTools Steps**:
1. Navigate to `/donor/dashboard?tab=commitments`
2. View all commitments (existing + newly created)
3. Edit commitment details:
   - Modify delivery timeline
   - Update item quantities
   - Add additional items
   - Change delivery location if needed
4. Update commitment status:
   - Change from PLANNED to IN_TRANSIT
   - Add tracking information
   - Update delivery progress
5. Test commitment search and filtering

**Expected Result**: Commitment management functions work correctly
**Data to Track**: Commitment modifications, status updates, search/filter functionality

---

### 7. Commitment Status Tracking
**Action**: Track delivery status and progress
**Chrome DevTools Steps**:
1. Navigate to `/donor/responses`
2. Track commitment delivery status:
   - View delivery progress
   - Update delivery milestones
   - Report delivery completion
   - Handle delivery issues
3. Test integration with response plans:
   - Link commitments to specific response activities
   - Monitor resource utilization by responders
4. Update delivery verification:
   - Confirm receipt of delivered items
   - Report any discrepancies
   - Update final delivery status

**Expected Result**: Delivery tracking provides accurate status updates
**Data to Track**: 
```json
{
  "deliveryTracking": [
    {
      "commitmentId": "new-commitment-id",
      "status": "DELIVERED", 
      "deliveredDate": "actual-date",
      "verifiedBy": "responder-or-coordinator",
      "deliveredQuantity": "actual-quantity",
      "discrepancies": "any-issues"
    }
  ]
}
```

---

### 8. Donation Management
**Action**: Test detailed donation management
**Chrome DevTools Steps**:
1. Navigate to `/donor/donations`
2. View donation details:
   - Financial contributions
   - In-kind donations
   - Service commitments
3. Create additional donation:
   - Type: Financial
   - Amount: $10,000
   - Purpose: "Emergency response fund for flood recovery"
   - Entity: Select from assigned entities
4. Track donation utilization
5. Generate donation receipts/confirmations

**Expected Result**: Donation management provides comprehensive tracking
**Data to Track**: 
```json
{
  "newDonation": {
    "id": "donation-id",
    "type": "FINANCIAL",
    "amount": 10000,
    "currency": "USD",
    "purpose": "Emergency response fund for flood recovery",
    "entityId": "target-entity",
    "status": "COMMITTED",
    "createdAt": "timestamp"
  }
}
```

---

### 9. Performance Dashboard
**Action**: Review overall donor performance
**Chrome DevTools Steps**:
1. Navigate to `/donor/performance`
2. Review performance dashboard:
   - Overall impact metrics
   - Commitment fulfillment rate
   - Response time metrics
   - Cost-effectiveness analysis
3. Test performance filters and date ranges
4. Export performance reports if available

**Expected Result**: Performance dashboard shows accurate donor metrics
**Data to Track**: Performance calculation accuracy, export functionality

---

### 10. Achievements and Recognition
**Action**: Test gamification and recognition features
**Chrome DevTools Steps**:
1. Navigate to `/donor/performance?tab=achievements`
2. View earned achievements:
   - First commitment badge
   - Rapid response achievement
   - High impact donor recognition
3. Check achievement criteria and progress
4. Test achievement sharing features if available

**Expected Result**: Achievement system functions and reflects real performance
**Data to Track**: Achievement accuracy, progress tracking

---

### 11. Leaderboard and Comparison
**Action**: Test donor comparison and leaderboard features
**Chrome DevTools Steps**:
1. Navigate to `/donor/leaderboard`
2. View donor leaderboard:
   - Impact rankings
   - Commitment volume rankings
   - Response time rankings
3. Test leaderboard filters:
   - Time period filters
   - Category filters
   - Geographic filters
4. Compare performance with other donors

**Expected Result**: Leaderboard displays accurate comparative data
**Data to Track**: Leaderboard functionality, ranking accuracy

---

### 12. Impact Reporting
**Action**: Generate impact reports
**Chrome DevTools Steps**:
1. Generate comprehensive impact report:
   - Select date range covering test period
   - Include all commitments and donations
   - Show beneficiary impact
   - Display gap resolution metrics
2. Test report customization options
3. Export report in different formats
4. Verify report accuracy against created test data

**Expected Result**: Impact reports accurately reflect donor contributions
**Data to Track**: Report generation success, data accuracy, export functionality

---

### 13. Integration with Response Plans
**Action**: Verify integration with responder workflow
**Chrome DevTools Steps**:
1. Check that created commitments appear in responder resource tracking
2. Verify commitment status updates reflect responder activity
3. Test communication with responders about deliveries
4. Confirm that completed responses update donor impact metrics

**Expected Result**: Seamless integration between donor and responder workflows
**Data to Track**: Integration accuracy, real-time updates, communication effectiveness

---

### 14. Role-Based Access Control
**Action**: Test donor-level access permissions
**Chrome DevTools Steps**:
1. Verify access to all donor functions
2. Test restricted access to:
   - Assessment creation/modification
   - Verification workflow functions
   - Administrative functions
   - Other donors' financial information
3. Verify can view assessment results but not modify them
4. Test entity assignment limitations

**Expected Result**: Donor has appropriate access levels
**Data to Track**: Access control behavior, permission boundaries

---

### 15. Mobile and Offline Functionality
**Action**: Test donor portal mobile responsiveness
**Chrome DevTools Steps**:
1. Test mobile view using Chrome DevTools device simulation
2. Verify key donor functions work on mobile:
   - Dashboard viewing
   - Commitment creation
   - Status updates
   - Impact tracking
3. Test offline capability:
   - View cached dashboard data
   - Create commitments offline
   - Sync when connection restored

**Expected Result**: Mobile and offline functionality works correctly
**Data to Track**: Mobile responsiveness, offline capability, sync accuracy

---

## Data Tracking

Update `test-data-tracker.json` with:
```json
{
  "workflows": {
    "donor": {
      "status": "completed",
      "createdData": [
        {
          "type": "commitment",
          "id": "new-commitment-id",
          "entityId": "from-assigned-entities",
          "incidentId": "from-workflows", 
          "type": "HEALTH",
          "totalItems": 3,
          "totalQuantity": 251,
          "status": "DELIVERED"
        },
        {
          "type": "donation",
          "id": "donation-id",
          "type": "FINANCIAL",
          "amount": 10000,
          "purpose": "Emergency response fund for flood recovery"
        }
      ],
      "impactMetrics": {
        "beneficiariesReached": "calculated-number",
        "gapsAddressed": "number-of-gaps",
        "responsePlansSupported": "number-of-plans",
        "totalContribution": "total-value"
      },
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
- [ ] Assigned entities visible and accessible
- [ ] Entity performance and impact metrics accurate
- [ ] New commitment creation works
- [ ] Commitment management features work
- [ ] Delivery tracking functional
- [ ] Donation management works
- [ ] Performance dashboard accurate
- [ ] Achievement system functional
- [ ] Leaderboard displays correctly
- [ ] Impact reporting generates accurate data
- [ ] Integration with response plans verified
- [ ] Access control verified
- [ ] Mobile and offline functionality tested
- [ ] Data tracking updated
- [ ] Cross-workflow integration verified