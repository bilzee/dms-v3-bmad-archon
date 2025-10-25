# Authentication Pattern Fixes - Remaining Tasks

## Overview

Following the fix for the Authentication Middleware Inconsistency bug (see `bugs.md`), several API routes still use the broken `requireRole` decorator pattern that is incompatible with Next.js 14.2.5 async route parameters.

**✅ RESOLVED**: Critical 500 error in `/api/v1/users/assignable` fixed successfully (10/25)

## Priority: High

### **Phase 1: Critical Routes (Immediate)**

**⚠️ These routes are actively used and will break when users try to access them:**

1. **`/api/v1/preliminary-assessments/[id]/route.ts`**
   - **Issue**: Uses `requireRole('ASSESSOR')` for PUT and DELETE methods
   - **Impact**: Assessors cannot update/delete preliminary assessments
   - **Fix**: Replace with manual role check inside handler
   - **Pattern**: `if (!roles.includes('ASSESSOR')) { return NextResponse.json(...) }`

2. **`/api/v1/rapid-assessments/route.ts`**
   - **Issue**: Uses `requireRole('ASSESSOR')` for POST method
   - **Impact**: Assessors cannot create rapid assessments
   - **Fix**: Replace with manual role check inside handler
   - **Pattern**: `if (!roles.includes('ASSESSOR')) { return NextResponse.json(...) }`

3. **`/api/v1/responses/[id]/route.ts`**
   - **Issue**: Uses `requireRole('RESPONDER')` for GET and PUT methods
   - **Impact**: Responders cannot view/update their responses
   - **Fix**: Replace with manual role check inside handler  
   - **Pattern**: `if (!roles.includes('RESPONDER')) { return NextResponse.json(...) }`

### **Phase 2: Medium Priority (Within 1 week)**

4. **`/api/v1/responses/[id]/collaboration/route.ts`**
   - **Issue**: Uses `requireRole('RESPONDER')` for GET, POST, PUT methods
   - **Impact**: Response collaboration features broken for responders

5. **`/api/v1/responses/planned/route.ts`**
   - **Issue**: Uses `requireRole('RESPONDER')` for GET method
   - **Impact**: Responders cannot view planned responses

6. **`/api/v1/responses/planned/assigned/route.ts`**
   - **Issue**: Uses `requireRole('RESPONDER')` for GET method
   - **Impact**: Responders cannot view assigned responses

### **Phase 3: Coordinator Routes (Lower Priority)**

7. **`/api/v1/entity-assignments/[id]/route.ts`**
   - **Issue**: Uses `requireRole('COORDINATOR')` for PUT and DELETE methods
   - **Impact**: Coordinators cannot update/delete entity assignments

8. **`/api/v1/entity-assignments/suggestions/route.ts`**
   - **Issue**: Uses `requireRole('COORDINATOR')` for POST method
   - **Impact**: Coordinators cannot create assignment suggestions

9. **`/api/v1/responses/conflicts/[assessmentId]/route.ts`**
   - **Issue**: Uses `requireRole('RESPONDER')` for POST method
   - **Impact**: Responders cannot manage assessment conflicts

### **Phase 4: System Features (Lowest Priority)**

10. **`/api/v1/entity-assignments/bulk/route.ts`**
    - **Issue**: Uses `requireRole('COORDINATOR')` for POST method
    - **Impact**: Coordinators cannot create bulk assignments

11. **`/api/v1/auto-assignment/trigger/route.ts`**
    - **Issue**: Uses `requireRole('COORDINATOR')` for POST method
    - **Impact**: Coordinators cannot trigger auto-assignment

12. **`/api/v1/auto-assignment/config/route.ts`**
    - **Issue**: Uses `requireRole('COORDINATOR')` for GET, PUT, POST methods
    - **Impact**: Coordinators cannot manage auto-assignment configuration

## Implementation Steps

### **For Each Route That Needs Fixing:**

1. **Remove broken imports:**
   ```typescript
   // Remove these lines:
   import { requireRole, requireAnyRole, requirePermission } from '@/lib/auth/middleware';
   ```

2. **Add working authentication pattern:**
   ```typescript
   export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
     const { user, roles } = context;
     
     if (!roles.includes('REQUIRED_ROLE')) {
       return NextResponse.json(
         { 
           success: false, 
           error: 'Insufficient permissions. Required role needed.' 
         }, 
         { status: 403 }
       );
     }
     
     // ... existing code
   });
   ```

3. **For multiple role checks:**
   ```typescript
   if (!roles.includes('ROLE1') && !roles.includes('ROLE2')) {
     return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
   }
   ```

4. **Fix function signatures:**
   - Add `AuthContext` type if needed: `import { withAuth, AuthContext } from '@/lib/auth/middleware';`
   - Ensure proper async/await structure
   - Remove decorator wrapper functions

## Quick Reference Patterns

### **Single Role Check**
```typescript
if (!roles.includes('ASSESSOR')) {
  return NextResponse.json(
    { success: false, error: 'Insufficient permissions. Assessor role required.' },
    { status: 403 }
  );
}
```

### **Multiple Role Check**
```typescript
if (!roles.includes('COORDINATOR') && !roles.includes('ADMIN')) {
  return NextResponse.json(
    { success: false, error: 'Insufficient permissions. Coordinator or Admin role required.' },
    { status: 403 }
  );
}
```

### **Permission-Based Check**
```typescript
if (!permissions.includes('MANAGE_ASSESSMENTS')) {
  return NextResponse.json(
    { success: false, error: 'Insufficient permissions. Manage Assessment permission required.' },
    { status: 403 }
  );
}
```

## Testing Strategy

### **For Each Fixed Route:**
1. **Authentication Test**: Verify role-based access works correctly
2. **Functionality Test**: Verify core functionality still works
3. **Error Handling Test**: Verify proper error responses
4. **Integration Test**: Test end-to-end workflows

### **Test Scenarios:**
- **ASSESSOR role**: Create, view, update, delete assessments
- **RESPONDER role**: View, create, update responses
- **COORDINATOR role**: Manage entities, assignments, assessments

## Success Criteria

- [ ] All authentication decorators removed from codebase
- [ ] All API routes use manual role checks
- [ ] No 401/403 errors for properly authenticated users
- [ ] All user workflows function correctly
- [ ] Integration tests pass
- [ ] Documentation updated

## Related Files

- `bugs.md` - Root cause analysis and fix patterns
- `src/lib/auth/middleware.ts` - Middleware cleanup
- `docs/architecture/9-backend-services.md` - Architecture documentation
- `docs/architecture/coding-standards/02-react-nextjs.md` - Coding standards

## Current Status

**Last Updated**: 2025-10-25  
**Fixed Routes**: 
- ✅ `/api/v1/users/assignable/route.ts` - Critical 500 error resolved
- ✅ `/api/v1/preliminary-assessments/route.ts` - GET endpoint restored

**Remaining**: 10+ routes still need authentication pattern fixes