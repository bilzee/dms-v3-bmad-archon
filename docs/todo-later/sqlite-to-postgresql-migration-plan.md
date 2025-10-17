# SQLite → PostgreSQL Migration Plan

## Current Situation Analysis

**Critical Findings:**
1. **Schema Inconsistency**: Current `schema.prisma` uses SQLite while design documents (including Story 3.3) assume PostgreSQL
2. **Environment Mismatch**: `.env` shows `DATABASE_URL="file:./dev.db"` (SQLite) while `.env.example` shows PostgreSQL URL
3. **Story 3.3 Dependencies**: Assessment verification workflow assumes PostgreSQL-specific features like proper JSON support and advanced indexing

## Key Differences Identified

| **Feature** | **Current SQLite** | **Target PostgreSQL** | **Impact** |
|-------------|-------------------|----------------------|------------|
| **ID Generation** | `@default(cuid())` | `@default(uuid())` | ⚠️ **HIGH** - Different ID formats |
| **Field Mapping** | No snake_case mapping | Snake_case with `@map()` | ⚠️ **HIGH** - Column name differences |
| **JSON Support** | Basic JSON | Advanced JSON/JSONB | 🔥 **CRITICAL** - Performance impact |
| **Indexes** | Limited indexing | Rich indexing support | ⚠️ **HIGH** - Query performance |
| **Text Fields** | No `@db.Text` | `@db.Text` for large text | ⚠️ **MEDIUM** - Data integrity |

## Migration Challenges

**🔥 Critical Issues:**
1. **Data Loss Risk**: Existing SQLite data in `prisma/dev.db` will be lost
2. **ID Format Change**: `cuid()` → `uuid()` breaks existing relationships
3. **Field Mapping**: Current schema lacks PostgreSQL field mappings
4. **Story 3.3 Blocker**: Verification workflow depends on PostgreSQL features

**🛠️ Technical Challenges:**
1. **Local Development**: Need PostgreSQL instance running
2. **Environment Setup**: Docker/local PostgreSQL configuration
3. **Migration Scripts**: Data preservation during transition
4. **Testing Impact**: All existing tests may need database reset

## Comprehensive Migration Plan

### Phase 1: Pre-Migration Setup ⏱️ *~30 minutes*

**1.1 Environment Preparation**
```bash
# Option A: Docker PostgreSQL (Recommended)
docker run --name postgres-dms \
  -e POSTGRES_DB=disaster_management \
  -e POSTGRES_USER=dms_user \
  -e POSTGRES_PASSWORD=dev_password \
  -p 5432:5432 -d postgres:15

# Option B: Local PostgreSQL Installation
# (Instructions vary by OS)
```

**1.2 Environment Configuration**
- Backup current `.env` → `.env.sqlite.backup`
- Update `.env` with PostgreSQL URL:
  ```bash
  DATABASE_URL="postgresql://dms_user:dev_password@localhost:5432/disaster_management?schema=public"
  ```

### Phase 2: Schema Migration ⏱️ *~45 minutes*

**2.1 Update Prisma Schema** 
- Change datasource from `sqlite` to `postgresql`
- Update all `@default(cuid())` → `@default(uuid())`
- Add proper field mappings with `@map()` directives
- Add `@db.Text` for large text fields
- Enhance indexes for PostgreSQL optimization

**2.2 Data Preservation Strategy**
```bash
# Export existing SQLite data
npx prisma db pull --schema=schema.sqlite.prisma
npx prisma generate --schema=schema.sqlite.prisma

# Create data migration script
# (Export JSON → Transform → Import to PostgreSQL)
```

### Phase 3: Database Migration ⏱️ *~20 minutes*

**3.1 Schema Deployment**
```bash
npx prisma db push              # Deploy new schema
npx prisma generate             # Generate new client
npx prisma db seed             # Seed with test data
```

**3.2 Data Migration (if needed)**
```bash
node scripts/migrate-sqlite-to-postgres.js
npx prisma db validate         # Verify integrity
```

### Phase 4: Application Updates ⏱️ *~15 minutes*

**4.1 Code Updates**
- Update any hardcoded CUID references
- Verify Prisma client imports
- Test database connections
- Update development scripts

**4.2 Testing Validation**
```bash
npm run type-check             # TypeScript validation
npm run test:unit              # Unit test validation
npm run dev                    # Development server test
```

### Phase 5: Story 3.3 Enablement ⏱️ *~10 minutes*

**5.1 Verification Features**
- Validate PostgreSQL JSON support for `additionalDetails`
- Test advanced indexing for verification queries
- Confirm performance improvements for queue operations

**5.2 Final Validation**
```bash
npm run lint                   # Code quality check
npm run build                  # Production build test
```

## Ready to Execute?

**Total Estimated Time: ~2 hours**

**Prerequisites Check:**
- [ ] PostgreSQL available (Docker/Local)
- [ ] Current SQLite data backed up
- [ ] Development environment ready
- [ ] Team coordination for breaking changes

**Risk Mitigation:**
- ✅ Backup strategy in place
- ✅ Rollback plan (restore `.env.sqlite.backup`)
- ✅ Data preservation scripts ready
- ✅ Testing validation at each phase

**Post-Migration Benefits:**
- 🎯 **Story 3.3 Unblocked** - Full verification workflow support
- ⚡ **Performance** - Better JSON operations and indexing
- 🔄 **Production Ready** - Matches production PostgreSQL environment
- 📊 **Advanced Features** - Full PostgreSQL feature set available

## Execution Notes

- Created: 2025-10-17
- Author: Winston (Architect Agent)
- Purpose: Enable Story 3.3 implementation by migrating from SQLite to PostgreSQL
- Priority: High - Blocking Story 3.3 development