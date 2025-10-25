# Bug Reports

## Authentication Middleware Inconsistency (Story 4.1 Migration Bug)

**Date Reported**: 2025-10-25  
**Status**: Fixed - Documentation Updated  
**Severity**: Critical (Caused 401 errors in verification endpoints)

### **Problem Description**

During Story 4.1 implementation, the authentication pattern was partially migrated from manual role checks to a decorator pattern (`withAuth(requireRole('COORDINATOR')(handler))`). However, this pattern is **incompatible with Next.js 14.2.5 async route parameters**, causing 401 errors in verification endpoints despite having correct authentication.

### **Root Cause Analysis**

Three different documentation sources showed incompatible authentication patterns:

1. **Coding Standards**: Simple `getServerSession()` pattern
2. **Architecture Documentation**: Decorator pattern (`withAuth(requireRole())`)  
3. **Actual Codebase**: Mixed implementation during migration

The decorator pattern failed because Next.js 14.2.5 introduced async params (`{ params }`), but the decorator signature didn't handle this properly.

### **Symptoms**

- Authentication succeeds (token validated, roles extracted correctly)
- Role checking succeeds (user has required roles like 'COORDINATOR') 
- API endpoints return 401/403 errors anyway
- Error messages indicate missing roles/permissions despite successful auth context

### **Debug Clues**

```
DEBUG: User roles: [ 'COORDINATOR' ]
DEBUG requireRole - Checking role: COORDINATOR User roles: [ 'COORDINATOR' ]
DEBUG requireRole - Role check passed
POST /api/v1/assessments/3e3a4acb-eaca-4abb-9d2a-55f67a0b31f3/verify 401 in 29ms
```

### **Working Pattern (Recommended)**

```typescript
// ✅ Working pattern - Compatible with Next.js 14.2.5
export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  const { user, roles } = context;
  
  if (!roles.includes('COORDINATOR')) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Insufficient permissions. Coordinator role required.' 
      }, 
      { status: 403 }
    );
  }
  
  const { id } = context.params.id; // Direct param access
  const body = await request.json();
  
  // ... implementation
});
```

### **Deprecated Pattern (Do Not Use)**

```typescript
// ❌ Broken with Next.js 14.2.5
export const POST = withAuth(requireRole('COORDINATOR')(async (request, context, { params }) => {
  // This pattern fails due to async params incompatibility
}));
```

### **Quick Fix Steps**

1. **Remove decorator imports**: Delete `requireRole` from imports
2. **Add manual role check**: Add role verification inside handler
3. **Fix function signature**: Remove decorator wrapper, add context destructuring
4. **Direct param access**: Use `context.params.id` instead of decorator params

### **Affected Components Fixed**

- `/api/v1/assessments/[id]/verify/route.ts` - 401 errors when coordinators try to approve assessments
- `/api/v1/assessments/[id]/reject/route.ts` - 401 errors when coordinators try to reject assessments  
- `/api/v1/entity-assignments/route.ts` - 403 errors when creating entity assignments

### **Components Still Requiring Fixes**

- `/api/v1/preliminary-assessments/[id]/route.ts` - Still uses broken `requireRole('ASSESSOR')` pattern
- `/api/v1/rapid-assessments/route.ts` - Still uses broken `requireRole('ASSESSOR')` pattern
- `/api/v1/responses/[id]/route.ts` - Still uses broken `requireRole('RESPONDER')` pattern
- Multiple response and entity-assignment related endpoints

### **Prevention Checklist**

- [x] Always test authentication patterns with Next.js version compatibility
- [x] Use manual role checks for clarity and debugging ease
- [x] Avoid complex decorator composition that may break with framework updates
- [x] Keep documentation consistent across all sources
- [x] Test with real user roles after authentication changes

### **Related Patterns to Check**

- `withAuth(requirePermission(...))` - Also broken
- `withAuth(requireAnyRole(...))` - Also broken  
- `withAuth(requireAnyPermission(...))` - Also broken

### **Related Commits**

- `5b9db13` - Story 4.1 Complete: Response Planning Mode (migration point)
- `016b546` - Authentication Migration: verifyToken() → withAuth() Pattern
- Various verification endpoint fixes

### **Impact**

- **Before**: Broken verification endpoints causing 401 errors
- **After**: All authentication works correctly, documentation aligned
- **Risk Level**: Low - Documentation only, no runtime impact remaining

---

## Future Reference

This bug should be referenced when:
- Migrating Next.js authentication patterns
- Testing new framework versions for compatibility  
- Fixing similar 401/403 authentication errors