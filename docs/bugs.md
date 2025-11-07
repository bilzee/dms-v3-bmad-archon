# Bugs and Solutions

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