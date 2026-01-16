# Fixing Docker Container Crashes After Successful Builds

## **Problem Summary**
Docker containers were building successfully on Dockploy but immediately crashing and being restarted in an infinite loop. The containers would start, show "Ready in 95ms", then terminate immediately.

## **Root Causes Identified**

### **1. Missing Standalone Build Output**
- **Issue**: Next.js standalone build output (`/app/.next/standalone/`) was not being generated
- **Symptoms**: Container crashed because `server.js` was either missing or invalid
- **Cause**: Next.js was not properly generating the standalone build despite having `output: 'standalone'` in next.config.js

### **2. Build-Time Database Connection Attempts**
- **Issue**: API routes were attempting database connections during Docker build phase
- **Symptoms**: Build errors showing "Can't reach database server at localhost:5432"
- **Cause**: Next.js static generation was trying to prerender API routes that query the database

### **3. Static Generation of Dynamic Routes**
- **Issue**: Next.js was attempting to generate static pages for dynamic API routes
- **Symptoms**: "Dynamic server usage" errors for routes using `request.url`, `request.headers`, `nextUrl.searchParams`
- **Cause**: API routes that should always be dynamic were being statically generated during build

## **Solutions Implemented**

### **Phase 1: Initial Debugging**
- Added early debug commands to Dockerfile.builder stage to identify issue
- Confirmed build logs were not showing in Dockploy UI (known platform limitation)
- Discovered containers were starting but missing critical files

### **Phase 2: Build-Time Database Prevention**
**File**: `src/app/api/v1/entities/public/route.ts`
```typescript
// Skip database calls during Docker build phase
if (process.env.NEXT_BUILD === "true") {
  return NextResponse.json({ success: true, data: [] });
}
```

**File**: `Dockerfile.production`
```dockerfile
# Add dummy DATABASE_URL for build phase
ARG DATABASE_URL="postgresql://user:pass@localhost:5432/db"
ENV DATABASE_URL=$DATABASE_URL

# Flag to skip database calls during build
ENV NEXT_BUILD=true
```

### **Phase 3: Dynamic Route Configuration**
Added `export const dynamic = 'force-dynamic'` to all sync API routes to prevent static generation:

**Files Modified:**
- `src/app/api/v1/sync/pull/route.ts`
- `src/app/api/v1/sync/status/route.ts` 
- `src/app/api/v1/sync/resolve/route.ts`
- `src/app/api/v1/sync/conflicts/route.ts`
- `src/app/api/v1/sync/conflicts/export/route.ts`
- `src/app/api/v1/sync/conflicts/summary/route.ts`

**Pattern Applied:**
```typescript
// Prevent static generation during build
export const dynamic = 'force-dynamic';
```

### **Phase 4: Dockerfile Optimizations**
**File**: `Dockerfile.production`

1. **Added Build-Time Environment Variables:**
   ```dockerfile
   # Dummy DATABASE_URL for Prisma client generation
   ARG DATABASE_URL="postgresql://user:pass@localhost:5432/db"
   ENV DATABASE_URL=$DATABASE_URL
   
   # Flag to prevent build-time DB calls
   ENV NEXT_BUILD=true
   ```

2. **Removed Problematic Prisma Client Copy:**
   ```dockerfile
   # OLD (caused "not found" error):
   # COPY --from=builder /app/node_modules/.prisma/client ./node_modules/.prisma/client
   
   # NEW (client bundled in standalone):
   COPY --from=builder /app/prisma ./prisma
   ```

3. **Added Debug Commands:**
   ```dockerfile
   # Early debug to confirm builder stage is running
   RUN echo "=== BUILDER STAGE STARTED ==="
   
   # Check if standalone build was generated
   RUN echo "=== Checking for standalone folder ===" && ls -la /app/.next/standalone/ || echo "standalone folder not found"
   ```

## **Technical Insights**

### **Why Standalone Build Was Failing**
1. **NEXT_BUILD flag interference**: Initially suspected but ruled out through testing
2. **Build process timing**: Database calls during static generation prevented proper build completion
3. **Docker layer caching**: Dockploy was caching old builds without proper standalone output

### **Why Next.js Was Static Generating Dynamic Routes**
- Next.js 14 attempts to preroute API routes by default
- Routes using `request.url`, `request.headers`, `searchParams` cannot be statically generated
- The `dynamic = 'force-dynamic'` export explicitly tells Next.js to skip static generation

### **Dockploy Log Display Issues**
- Build logs often don't display properly in Dockploy UI (known issue)
- Runtime logs show, but build-stage logs are hidden
- Solution: Use early debug commands and check for "Ready in Xms" as success indicator

## **Final Configuration**

### **Build-Time Configuration:**
- `DATABASE_URL`: Dummy connection string for Prisma client generation
- `NEXT_BUILD=true`: Flag to skip database calls in application code
- `output: 'standalone'`: Next.js standalone build mode

### **Runtime Configuration (Dockploy Environment):**
- `DATABASE_URL`: Real database connection from Dockploy
- `NEXT_BUILD`: Not set (or false), allowing normal database operations
- All other environment variables provided by Dockploy

### **Route Configuration:**
- All sync API routes: `export const dynamic = 'force-dynamic'`
- Database-dependent routes: `NEXT_BUILD` flag checks
- Static routes: Default Next.js behavior

## **Error Messages Encountered and Resolved**

### **1. "Can't reach database server at localhost:5432"**
**Cause**: Build-time database connection attempts  
**Solution**: NEXT_BUILD flag + dummy DATABASE_URL

### **2. "No such container: select-a-container"**  
**Cause**: Invalid CMD path using Next.js node_modules  
**Solution**: Reverted to `node server.js` (standalone includes this)

### **3. "Dynamic server usage: Route couldn't be rendered statically"**
**Cause**: Static generation of routes using request properties  
**Solution**: `export const dynamic = 'force-dynamic'` on problematic routes

### **4. "/app/node_modules/.prisma/client: not found"**
**Cause**: Trying to copy non-existent path in standalone build  
**Solution**: Removed explicit copy (client bundled in standalone)

## **Deployment Strategy**

### **Current Working Configuration:**
1. **Docker Build**:
   - Uses dummy DATABASE_URL
   - Sets NEXT_BUILD=true
   - All routes marked as dynamic where needed
   - Generates proper standalone output

2. **Runtime**:
   - Real DATABASE_URL from Dockploy
   - NEXT_BUILD flag not active
   - Normal database operations
   - Standalone server handles all routes

### **Monitoring Success:**
- Build logs show "✓ Compiled successfully" without database errors
- Container starts and shows "Ready in Xms"
- No continuous restart loops
- API endpoints respond normally at runtime

## **Key Files Modified**

### **Core Configuration:**
- `next.config.js`: Already had `output: 'standalone'` (line 90)
- `Dockerfile.production`: Multi-stage build with environment variables
- `package.json`: Build scripts and dependencies

### **API Routes (6 files):**
- All sync API routes now have dynamic exports
- Entities public route has NEXT_BUILD flag check
- Prevents static generation of dynamic endpoints

### **Git Commits:**
1. `fix: Add dummy DATABASE_URL for Docker build stage`
2. `fix: Add NEXT_BUILD flag to prevent Docker build database errors`
3. `fix: Remove explicit Prisma client copy in Docker production build`
4. `fix: Replace missing server.js with Next.js built-in server` (reverted)
5. `fix: Revert to server.js and add debug commands`
6. `fix: Add debug commands in builder stage`
7. `test: Remove NEXT_BUILD flag to test if it interferes with standalone build`
8. `fix: Restore NEXT_BUILD flag and add dynamic route exports`
9. `fix: Add dynamic exports to all sync API routes to prevent static generation`

## **Lessons Learned**

### **Docker + Next.js Standalone Builds:**
- Standalone output is essential for production Docker deployments
- Build-time and runtime environments must be carefully separated
- Environment variables control build vs runtime behavior

### **Next.js Static Generation:**
- Next.js tries to statically generate everything by default
- API routes using request properties must be explicitly marked dynamic
- The `dynamic = 'force-dynamic'` export is crucial for API routes

### **Dockploy Specific:**
- Build logs may not display properly in the UI
- Container startup success can be gauged by "Ready in Xms" message
- Real database connection only available at runtime, not build time

### **Debugging Docker Builds:**
- Start with early-stage debug commands to confirm Docker is reaching stages
- Use build process output to identify missing files or configuration issues
- Test changes incrementally and monitor both build and runtime behavior

## **Status: ✅ RESOLVED**

The Docker container crash issue has been fully resolved. The application now:
- Builds successfully without database connection errors
- Generates proper standalone build output
- Starts and runs without crashes or restart loops
- Handles all API routes correctly at runtime
- Uses real database connections only during runtime