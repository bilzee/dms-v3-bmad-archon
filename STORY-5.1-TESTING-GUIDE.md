# Story 5.1 Donor Functionality Testing Guide

## Test Setup
- **User**: donor@test.com
- **Password**: donor123!
- **Expected Role**: DONOR only

## Chrome DevTools Setup
1. Open Chrome DevTools (F12)
2. Go to **Console** tab for logging
3. Go to **Network** tab for API calls
4. Go to **Application** → **Local Storage** to verify token storage
5. Go to **Elements** tab to inspect UI components

---

## Test 1: Donor Login and Authentication

### 1.1 Navigate to Login Page
```
URL: http://localhost:3000/login
```

### 1.2 Test Login Process
1. Click the test user dropdown
2. Select "Donor Organization Contact"
3. Verify email and password auto-fill:
   - Email: `donor@test.com`
   - Password: `donor123!`
4. Click "Sign in"

### 1.3 Expected Results
- **Console**: Should show successful login
- **Network**: Should see `POST /api/v1/auth/login` with `200` status
- **Redirect**: Should redirect to `/dashboard`
- **Local Storage**: Should have `auth_token` key with JWT value

### 1.4 Verify Token Storage
In **Application → Local Storage → http://localhost:3000**:
```javascript
// Should have:
auth_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Test 2: Main Dashboard Donor Portal Visibility

### 2.1 Navigate to Main Dashboard
```
URL: http://localhost:3000/dashboard
```

### 2.2 Expected Dashboard Content
Look for the **"Donor Portal"** card with:
- ✅ Green border (`border-emerald-200 bg-emerald-50/30`)
- ✅ Title: "Donor Portal" 
- ✅ Description: "Access donor dashboard, manage profiles, view assessments, and track contribution impact"
- ✅ Badges: "Story 5.1", "Donor Role", "Complete"

### 2.3 Expected Donor Portal Links
The card should contain these links:

1. **Donor Dashboard** 
   - Button text: "Donor Dashboard"
   - Icon: Heart
   - URL: `/donor/dashboard`
   - Style: Green button (`bg-emerald-600 hover:bg-emerald-700`)

2. **View Assessments**
   - Button text: "View Assessments"
   - Icon: FileText  
   - URL: `/rapid-assessments`
   - Style: Outline button

3. **Donor Profile**
   - Button text: "Donor Profile"
   - Icon: User
   - URL: `/donor/profile`
   - Style: Outline button

4. **Assigned Entities**
   - Button text: "Assigned Entities"
   - Icon: MapPin
   - URL: `/donor/entities`
   - Style: Outline button

### 2.4 What Should NOT Be Visible
- ❌ No assessor-specific tiles (like "Create New Assessment")
- ❌ No coordinator-specific tiles (like "Entity Assignment Management")
- ❌ No responder-specific tiles (like "Response Planning")

---

## Test 3: Donor Dashboard Navigation

### 3.1 Navigate to Donor Dashboard
Click "Donor Dashboard" button or visit:
```
URL: http://localhost:3000/donor/dashboard
```

### 3.2 Expected Content
- **Page Title**: "Donor Dashboard"
- **Subtitle**: "Donor Dashboard" 
- **Current Role Badge**: Should show "DONOR"
- **Navigation Tabs**: Overview, Entities, Profile, Analytics

### 3.3 API Calls to Verify
In **Network** tab, should see:
- `GET /api/v1/donors/profile` → `200` (not `401`)
- `GET /api/v1/donors/entities` → `200` (not `401`)

### 3.4 Expected Data Display
- **Header**: User name and avatar
- **Metrics Cards**: 
  - Assigned Entities: Number
  - Total Commitments: Number  
  - Delivery Rate: Percentage
  - Total Responses: Number

---

## Test 4: View Assessments (Read-Only)

### 4.1 Navigate to Assessments
Click "View Assessments" button or visit:
```
URL: http://localhost:3000/rapid-assessments
```

### 4.2 Expected Redirect Behavior
Should automatically redirect to:
```
URL: http://localhost:3000/donor/rapid-assessments
```

### 4.3 Expected Assessment Page
- **Page Title**: "Assessments"
- **Subtitle**: "View disaster assessments and response needs (Read-only access)"
- **No Creation Button**: Should NOT see "Create New Assessment" button
- **Read-Only View**: Should see existing assessments with no edit capabilities

### 4.4 API Calls
- `GET /api/v1/rapid-assessments` → `200` (not `401`)

---

## Test 5: Donor Profile Management

### 5.1 Navigate to Donor Profile
Click "Donor Profile" button or visit:
```
URL: http://localhost:3000/donor/profile
```

### 5.2 Expected Content
- **Page Title**: "Donor Profile"
- **Subtitle**: "Manage your organization profile and settings"
- **Profile Form**: Should load with existing donor data
- **No Redirect**: Should NOT redirect to `/assessor/dashboard`

### 5.3 API Calls
- `GET /api/v1/donors/profile` → `200` (not `401`)

---

## Test 6: Assigned Entities Management

### 6.1 Navigate to Entities
Click "Assigned Entities" button or visit:
```
URL: http://localhost:3000/donor/entities
```

### 6.2 Expected Content
- **Page Title**: "Assigned Entities"
- **Subtitle**: "View and manage entities assigned to your organization"
- **Entity List**: Should show entities donor can support
- **No Redirect**: Should NOT redirect to `/assessor/dashboard`

### 6.3 API Calls
- `GET /api/v1/donors/entities` → `200` (not `401`)

---

## Test 7: Role-Based Access Control

### 7.1 Test Assessment Creation Restriction
Try to access assessment creation URLs:
```
http://localhost:3000/assessor/rapid-assessments/new
http://localhost:3000/rapid-assessments/new
```

**Expected**: Should be redirected away or shown access denied

### 7.2 Verify Current Role
In **Console**, check current role:
```javascript
// In browser console, verify auth store state
localStorage.getItem('auth_token') // Should not be null
// Check if user has correct role assignment
```

### 7.3 Test Multi-Role Comparison (Optional)
Log out and log in as multi-role user:
- **User**: multirole@dms.gov.ng
- **Password**: multirole123!
- **Expected**: Should see MORE tiles than donor user

---

## Test 8: Registration Flow

### 8.1 Test New Donor Registration
1. Log out current user
2. Navigate to:
```
URL: http://localhost:3000/register
```

### 8.2 Complete Registration Form
Fill out the multi-step form:
- Step 1: Contact Information
- Step 2: Organization Details  
- Step 3: Account Setup

### 8.3 Expected Registration Behavior
- **API Call**: `POST /api/v1/donors` → `201`
- **Success Message**: "Registration successful! Welcome to the platform."
- **Redirect**: Should redirect to `/donor/dashboard` (not `/dashboard`)

---

## Test 9: Token Validation and Error Handling

### 9.1 Test Token Expiration
1. Clear local storage:
   ```javascript
   localStorage.clear()
   ```
2. Try to access donor pages
3. **Expected**: Should redirect to login page

### 9.2 Test Invalid Token
1. Manually set invalid token:
   ```javascript
   localStorage.setItem('auth_token', 'invalid_token')
   ```
2. Refresh donor dashboard
3. **Expected**: Should get `401` errors and redirect to login

---

## Test 10: Console Error Checking

### 10.1 Check for JavaScript Errors
In **Console** tab, look for:
- ❌ No "Failed to load resource: net::ERR_FAILED" 
- ❌ No "401 Unauthorized" errors
- ❌ No "TypeError: Cannot read properties" errors
- ✅ Minimal warnings (only development-related)

### 10.2 Check Network Errors
In **Network** tab, verify:
- ✅ All API calls return `200` status codes
- ✅ No `401 Unauthorized` responses
- ✅ Authentication headers properly sent
- ✅ Request payloads are correctly formatted

---

## Troubleshooting Guide

### If 401 Errors Persist:
1. Check **Application → Local Storage** for `auth_token`
2. Verify token value looks like JWT (starts with `eyJ`)
3. Check **Network** tab Authorization headers
4. Refresh page and log in again

### If Dashboard Tiles Missing:
1. Verify user has `VIEW_DONOR_DASHBOARD` permission
2. Check current role in auth store state
3. Look for JavaScript errors in console
4. Verify CSS classes aren't hiding elements

### If Redirects Fail:
1. Check URL paths in browser address bar
2. Look for routing errors in console
3. Verify RoleBasedRoute component is working
4. Check for infinite redirect loops

---

## Success Criteria

### ✅ Complete Success Indicators:
- [ ] Donor user logs in successfully
- [ ] Donor Portal tile appears on main dashboard
- [ ] All donor-specific links work correctly
- [ ] No 401 errors on donor API calls
- [ ] Token persists in localStorage
- [ ] Role-based restrictions work correctly
- [ ] Registration flow works as expected
- [ ] No console errors or network failures

### 📱 Mobile Testing:
Test the same flow on mobile viewport in DevTools to ensure responsive design works correctly.

---

## Reporting Results

Document any issues found:
1. **URL**: Where the issue occurred
2. **Expected**: What should happen
3. **Actual**: What actually happened  
4. **Console Errors**: Any JavaScript errors
5. **Network Status**: HTTP response codes
6. **Screenshots**: Visual evidence of issues