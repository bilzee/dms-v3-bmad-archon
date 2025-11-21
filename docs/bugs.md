# Bugs and Solutions

## Current Bug Fixes (2025-11-21)

### **Bug 9: Prisma orderBy Nested Array Structure Error**
**Problem**: Assessment Verification API returning PrismaClientValidationError for invalid orderBy structure
**Root Cause**: Extra array nesting in orderBy construction created `[[{rapidAssessmentDate: "desc"}, {priority: "desc"}]]` instead of expected flat array structure `[{rapidAssessmentDate: "desc"}, {priority: "desc"}]`
**Location**: `src/app/api/v1/verification/queue/assessments/route.ts:105-110`
**Error Details**: 
```
Argument `orderBy`: Invalid value provided. Expected RapidAssessmentOrderByWithRelationInput, provided ((Object, Object))
```

**Solution Implemented**: 
Fixed orderBy construction logic to build proper flat array structure:
```typescript
// Before (problematic - nested array)
const orderBy: any[] = [
  { [sortBy]: sortOrder }
];
if (sortBy !== 'priority') {
  orderBy.push({ priority: 'desc' });
}
// Prisma call used: orderBy: [orderBy] ❌

// After (fixed - flat array)  
const orderBy: any[] = [];
orderBy.push({ [sortBy]: sortOrder });
if (sortBy !== 'priority') {
  orderBy.push({ priority: 'desc' });
}
// Prisma call used: orderBy: orderBy ✅
```

**Key Changes**:
1. Removed extra array wrapper around orderBy objects
2. Changed from `orderBy: [orderBy]` to `orderBy: orderBy` in Prisma query
3. Maintained secondary sort by priority for stable ordering

**Pattern**: When building dynamic Prisma orderBy clauses with multiple criteria, construct a flat array of objects and pass it directly to Prisma, not wrapped in additional array brackets

### **Bug 8: currentRole Not Set to DONOR for Donor-Only Users**
**Problem**: Donor-only users were getting default role from persisted state instead of correct DONOR role, causing dashboard routing issues
**Root Cause**: Auth store initialization logic prioritized persisted `currentRole` over recalculating highest priority role for single-role users
**Location**: `src/stores/auth.store.ts:89-93`
**Error Details**: 
```
Symptoms:
- Donor users redirected to /assessor/dashboard instead of /donor/dashboard
- currentRole remained as previous role from persisted state
- Single-role users should always get their only assigned role
```

**Solution Implemented**: 
Updated role initialization logic in `src/stores/auth.store.ts` to prioritize single-role users:
```typescript
// Before (problematic)
const currentRole = (get().currentRole && roles.includes(get().currentRole) ? get().currentRole : getHighestPriorityRole(roles)) || null;

// After (fixed)  
const currentRole = roles.length === 1 ? roles[0] : (get().currentRole && roles.includes(get().currentRole) ? get().currentRole : getHighestPriorityRole(roles)) || null;
```

**Key Changes**:
1. Added `roles.length === 1 ? roles[0]` check to always assign the only available role to single-role users
2. Maintained existing priority logic for multi-role users
3. Ensured donor-only users always get `DONOR` role regardless of persisted state

**Pattern**: For role-based authentication, always check if user has only one role and assign it directly, bypassing persisted state which may contain stale data

## Current Bug Fixes (2025-11-12)

### **Bug 1: useAuth.getState() is not a function in LoginForm**
**Problem**: Users getting "TypeError: _hooks_useAuth__WEBPACK_IMPORTED_MODULE_11__.useAuth.getState is not a function" runtime error when attempting to login
**Root Cause**: LoginForm component was incorrectly calling `useAuth.getState()` instead of `useAuthStore.getState()`. The `useAuth` hook is a wrapper that returns store methods/data, while `useAuthStore` is the actual Zustand store with the `getState()` method.
**Location**: `src/components/auth/LoginForm.tsx:117`
**Error Details**: 
```
TypeError: useAuth.getState is not a function
Source: src\components\auth\LoginForm.tsx (117:57) @ getState
```

**Solution Implemented**: 
1. Added import for `useAuthStore` from `@/stores/auth.store`
2. Changed line 117 from `useAuth.getState()` to `useAuthStore.getState()`
```typescript
// Before (incorrect)
const { currentRole, availableRoles } = useAuth.getState()

// After (correct)  
const { currentRole, availableRoles } = useAuthStore.getState()
```

**Pattern**: When accessing Zustand store state directly (like in timeouts or callbacks), use the store directly (`useAuthStore.getState()`), not the hook wrapper (`useAuth`)

### **Bug 2: Donor user password hash mismatch after Story 5.2**
**Problem**: Donor user (`donor@test.com`) getting "401 Unauthorized" error during login while multirole user authentication worked correctly
**Root Cause**: Database contained stale donor user data with incorrect password hash. The Prisma seed script uses `upsert` with `update: {}`, which doesn't update existing user passwords when they already exist in the database.
**Investigation**: 
- Git history showed donor authentication was working after Story 5.1 (commit 949215e)
- Issue appeared after Story 5.2 implementation (commit a7ec373)
- Debug script revealed password hash mismatch for stored vs expected password
- Stored hash: `$2b$12$wJH54tas3Em0XYBv.xIaA.QeCOQo4qvzD/0.A0My/xBJHZuk01vnq`
- Expected password: `donor123!`

**Solution Implemented**: 
1. Created `fix-donor-password.js` script to update the donor user with correct password hash
2. Updated user data to match seed file expectations:
```javascript
await prisma.user.update({
  where: { email: 'donor@test.com' },
  data: {
    passwordHash: await bcrypt.hash('donor123!', 10),
    name: 'Donor Organization Contact',
    organization: 'Test Donor Organization',
    isActive: true,
    isLocked: false
  }
});
```

**Pattern**: When using Prisma `upsert` with `update: {}`, existing records won't be updated. For test environments, consider using `update: create` to ensure data consistency, or run explicit update scripts to fix stale test data.

## Story 5.1 Bug Fixes (2025-11-09)

### **Bug 1: Missing React Import in Donor Components**
**Problem**: All donor components in Story 5.1 were missing `import React from 'react'` statements
**Root Cause**: Next.js App Router with 'use client' directive still requires explicit React import for JSX to work properly
**Affected Components**:
- `src/components/donor/DonorRegistrationForm.tsx`
- `src/components/donor/DonorProfile.tsx` 
- `src/components/donor/DonorDashboard.tsx`
- `src/components/donor/EntitySelector.tsx`

**Solution Implemented**: Added `import React from 'react'` to all affected donor components
**Pattern**: Always include React import when using JSX in Next.js App Router client components, even with 'use client' directive

### **Bug 2: Authentication Token Not Persisting to LocalStorage**
**Problem**: Donor users getting 401 Unauthorized errors on all API calls despite successful login
**Root Cause**: Auth store `setUser()` function wasn't persisting JWT token to localStorage, causing token to be lost on page reload
**Symptoms**: 
- Login succeeds (200 OK) but subsequent API calls fail (401 Unauthorized)
- Server logs show successful authentication but browser shows auth failures
- User gets logged out immediately after page refresh

**Solution Implemented**: 
```typescript
// In src/stores/auth.store.ts - setUser() function
if (typeof window !== 'undefined') {
  localStorage.setItem('auth_token', token)
}
```

**Pattern**: Always persist authentication tokens to localStorage in client-side auth state management

### **Bug 3: Incorrect Post-Registration Redirect URL**
**Problem**: Donor registration redirected to `/dashboard` instead of `/donor/dashboard` after successful registration
**Root Cause**: Hardcoded redirect URL in DonorRegistrationForm.tsx didn't account for role-based routing
**Solution Implemented**: Updated redirect to `/donor/dashboard` for donor users
**Pattern**: Use role-specific redirect URLs after authentication flows

### **Bug 4: Login API Response Structure Mismatch**
**Problem**: Auth store expected nested role/permission structure but API returned flat structure
**Root Cause**: Login API wasn't reconstructing user object with proper role relationships from Prisma
**Solution Implemented**: Reconstructed user object in login route with nested role.permissions structure
**Pattern**: Ensure API response structure matches frontend expectations, especially for nested relationships

### **Bug 5: Role Priority Logic Missing in Auth Store**
**Problem**: Multi-role users getting assigned wrong primary role (donor instead of coordinator)
**Root Cause**: Auth store didn't implement role priority logic when user has multiple roles
**Solution Implemented**: Added role priority system with COORDINATOR > ASSESSOR > RESPONDER > DONOR hierarchy
**Pattern**: Implement role priority logic for multi-role user scenarios

### **Bug 6: Permission Checks Using Wrong Permission Codes**
**Problem**: Dashboard visibility checks using `hasPermission('DONOR')` instead of actual permission codes
**Root Cause**: Confusion between role names and permission codes in permission system
**Solution Implemented**: Changed to `hasPermission('VIEW_DONOR_DASHBOARD')` and other specific permission codes
**Pattern**: Use specific permission codes, not role names, for access control checks

### **Bug 7: Select Component Empty String Value Validation**
**Problem**: "A <Select.Item /> must have a value prop that is not an empty string" error on /donor/entities page
**Root Cause**: Radix UI Select component doesn't allow empty string values for SelectItem components
**Solution Implemented**: Changed `<SelectItem value="">` to `<SelectItem value="all">` and updated filter logic
**Pattern**: Use semantic identifiers instead of empty strings for Select component values

## Recent Bug Fixes (2025-11-07)

### **Bug 1: Missing userId Parameter in API Call**
**Problem**: `ZodError: userId is Required` when accessing commitment import tab
**Root Cause**: Frontend component called `/api/v1/entities/assigned` without required `userId` query parameter
**Solution**: Added proper `URLSearchParams` construction with `userId` from authenticated user context
**Pattern**: Always ensure API calls include all required parameters defined in the endpoint schema

### **Bug 2: Empty String Value in Select Component**
**Problem**: `A <Select.Item /> must have a value prop that is not an empty string` runtime error
**Root Cause**: Radix UI Select component doesn't allow empty string values for SelectItem
**Solution**: Replace empty string values with meaningful identifiers (e.g., `value="all"` instead of `value=""`)
**Pattern**: Use semantic values like "all", "none", "default" instead of empty strings for Select components

## Prisma Client Browser Environment Error

### **Problem**
When users went to `/responder/planning/new`, they could select an entity from the dropdown but the verified assessments dropdown showed "No verified assessments are available for this entity" even though verified assessments existed in the database.

### **Root Cause** 
The application had a fundamental architectural issue: frontend components were trying to call Prisma directly from the browser environment. Prisma Client cannot run in the browser and will throw the error:

```
Error: PrismaClient is unable to run in this browser environment, or has been bundled for the browser
```

### **Technical Details**
- **Affected Components**: 
  - `AssessmentSelector.tsx` (calling `entityAssignmentService.getVerifiedAssessments()`)
  - `ResponsePlanningForm.tsx` (calling `entityAssignmentService.getAssignedEntities()`)
  - `EntitySelector.tsx` (importing service instead of just types)

- **Wrong Architecture**:
  ```
  Frontend (Browser) → Direct Prisma Call ❌ (Not supported)
  ```

- **Correct Architecture**:
  ```
  Frontend (Browser) → API Route → Server-side Service → Database ✅
  ```

### **Solution Implemented**

#### 1. **Created API Endpoints**
- **`/api/v1/assessments/verified`** - Fetches verified assessments for an entity
  - Accepts `entityId` query parameter
  - Returns assessments with `VERIFIED` or `AUTO_VERIFIED` status
  - Properly secured with authentication middleware

- **`/api/v1/entities/assigned`** - Fetches entities assigned to a user
  - Accepts `userId` query parameter  
  - Returns entities where user has ASSESSOR or RESPONDER role
  - Authentication required

#### 2. **Updated Frontend Components**
- **AssessmentSelector**: 
  - Removed direct service import
  - Added authenticated API calls to `/api/v1/assessments/verified`
  - Added proper error handling and loading states

- **ResponsePlanningForm**:
  - Removed direct service import
  - Added authenticated API calls to `/api/v1/entities/assigned`
  - Updated query dependencies to include auth token

- **EntitySelector**:
  - Changed to import only `Entity` type, not the service
  - Uses proper `import type { Entity }` syntax

#### 3. **Fixed Validation Issues**
- Updated UUID validation to accept any string entity ID format
- Frontend uses non-UUID IDs like `entity-4`, so validation was too strict
- Changed from `z.string().uuid()` to `z.string().min(1)`

#### 4. **Proper Authentication**
- All API calls include `Authorization: Bearer <token>` headers
- Added token dependencies to React Query enabled conditions
- Proper error handling for unauthorized requests

### **Files Modified**

#### **New API Endpoints:**
- `src/app/api/v1/assessments/verified/route.ts`
- `src/app/api/v1/entities/assigned/route.ts`

#### **Updated Components:**
- `src/components/response/AssessmentSelector.tsx`
- `src/components/forms/response/ResponsePlanningForm.tsx`
- `src/components/shared/EntitySelector.tsx`

#### **Cleaned Up:**
- `src/lib/services/entity-assignment.service.ts` - Removed debugging logs

### **Lessons Learned**

1. **Never call Prisma from client-side code** - Prisma is Node.js only
2. **Always use API routes for database operations** in Next.js App Router
3. **Import types only** in client components when possible
4. **Test in both development and production browsers** - Chrome DevTools can mask client-side issues
5. **Watch console logs carefully** for environment-specific errors

### **Verification**
The solution was verified by:
- Testing API endpoints directly with curl
- Checking browser console for no more Prisma environment errors
- Confirming verified assessments now appear in dropdown
- Validating proper authentication flow
- Testing with non-UUID entity IDs