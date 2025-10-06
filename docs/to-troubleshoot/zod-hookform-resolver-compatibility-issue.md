# Zod + @hookform/resolvers Compatibility Issue

**Date:** 2025-10-05  
**Reporter:** Quinn (Test Architect)  
**Priority:** HIGH - Blocking authentication UI and Playwright tests  
**Status:** IDENTIFIED - Solution Required

## Problem Summary

Authentication UI components are failing to load due to a dependency compatibility issue between Zod v3.23.8 and @hookform/resolvers@5.2.2.

## Error Details

**Error Message:**
```
Module not found: Package path ./v4/core is not exported from package 
B:\Dev\Claude Code\dms-v3-bmad-archon\node_modules\zod 
(see exports field in B:\Dev\Claude Code\dms-v3-bmad-archon\node_modules\zod\package.json)

Import trace for requested module:
./src/components/auth/RegisterForm.tsx
```

**Root Cause:** 
- @hookform/resolvers@5.2.2 expects Zod v4 and tries to import `zod/v4/core`
- Project uses Zod v3.23.8 which doesn't export the `v4/core` path
- Node.js package exports field prevents access to non-exported paths

## Impact Assessment

**Immediate Impact:**
- ❌ Authentication UI pages (/login, /register, /admin/users) are inaccessible (500 errors)
- ❌ Playwright tests cannot run (no login forms to test)
- ❌ Epic 2 completion blocked
- ❌ End-to-end authentication testing impossible

**Components Affected:**
- `src/components/auth/LoginForm.tsx` - Working (only uses basic Zod)
- `src/components/auth/RegisterForm.tsx` - **BLOCKED** (uses zodResolver)
- `src/app/admin/users/page.tsx` - **BLOCKED** (imports RegisterForm)

## Research Findings

From Archon Knowledge Base search on "package exports field error":

> *"The `exports` provides a modern alternative to `main` allowing multiple entry points to be defined, conditional entry resolution support between environments, and **preventing any other entry points besides those defined in `exports`**"*

This confirms that Zod v3's exports field blocks access to paths not explicitly exported, preventing @hookform/resolvers from accessing the expected `v4/core` path.

## Solutions Attempted

### ✅ Attempted: Downgrade @hookform/resolvers
```bash
pnpm add @hookform/resolvers@3.9.1
```
**Result:** Dependency installed but error persists due to Next.js caching

### ⏳ Pending: Clear Next.js Cache
```bash
rm -rf .next
```
**Status:** Required but interrupted

## Recommended Solutions

### Option 1: Complete Downgrade Process (IMMEDIATE)
1. Clear Next.js cache: `rm -rf .next`
2. Restart dev server: `pnpm dev`
3. Verify compatibility with Zod v3.23.8

### Option 2: Upgrade to Zod v4 (COMPREHENSIVE)
1. Upgrade Zod: `pnpm add zod@^4.0.0`
2. Update all Zod schemas for v4 compatibility
3. Test all form validation across the application
4. Update any breaking changes in validation logic

### Option 3: Alternative Form Validation (FALLBACK)
1. Replace React Hook Form + Zod with alternative
2. Use native HTML5 validation with custom validation functions
3. Maintain same UX but different underlying implementation

## Recommendation

**Proceed with Option 1** (Complete Downgrade Process) as it:
- ✅ Minimal changes required
- ✅ Maintains existing Zod v3 schemas
- ✅ @hookform/resolvers@3.9.1 is proven compatible with Zod v3
- ✅ Fastest path to unblock Epic 2 completion

## Implementation Steps

1. **Clear Next.js cache and restart** (IMMEDIATE)
2. **Verify authentication UI loads** (5 minutes)
3. **Run Playwright tests** (10 minutes)
4. **Update QA assessment** (15 minutes)

## Dependencies Map

**Current State:**
- Zod: v3.23.8
- @hookform/resolvers: v3.9.1 (downgraded from 5.2.2)
- Next.js: v14.2.5

**Expected Compatibility:**
- @hookform/resolvers@3.9.1 + Zod v3.23.8 = ✅ Compatible
- @hookform/resolvers@5.2.2 + Zod v4.x = ✅ Compatible  
- @hookform/resolvers@5.2.2 + Zod v3.x = ❌ **INCOMPATIBLE**

## Next Actions

1. Complete cache clearing and server restart
2. Test authentication flow end-to-end
3. Execute Playwright test suite
4. Update final QA assessment with resolved issues
5. Mark Epic 2 authentication components as production-ready