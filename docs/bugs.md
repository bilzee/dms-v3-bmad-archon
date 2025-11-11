# Bugs and Solutions

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