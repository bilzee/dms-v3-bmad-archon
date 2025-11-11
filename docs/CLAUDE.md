# General Instructions

1. Do not mock values on the frontend; mock at the database with seeded data. 
2. Dev agent and qa agent should always search the Archon Knowledge Base using the archon mcp or REST API (see below) 
3. Testing strategy can be found in docs/prd/testing-strategy.md
4. When troubleshooting, do not take shortcuts, instead, first search the Archon knowledge base for solution, and if no solution is found, create a detailed report on the problem and what has been tried in docs/to-toubleshoot/ so it can be fixed separately.

# 🧪 Streamlined Testing Workflow

## **SINGLE SOURCE OF TRUTH**: Use `docs/architecture/coding-standards/testing-guide.md`

This document consolidates ALL testing standards. The workflow below provides quick access to critical validation steps.

### **Pre-Story Implementation (MANDATORY)**
```bash
# 1. Run enhanced validation script
bash scripts/validate-pre-story.sh

# 2. Framework consistency check (CRITICAL)
grep -r "vi\.mock" tests/  # Must return nothing
npm run validate:schema
```

### **During Story Implementation**
- **✅ JEST ONLY**: Use `jest.mock()` - NEVER `vi.mock()` (blocked by ESLint)
- **✅ USE TEMPLATES**: Copy from `tests/templates/` for consistent patterns
- **✅ CONSOLIDATED GUIDE**: Follow `docs/architecture/coding-standards/testing-guide.md`
- **✅ CONTEXT LOADING**: Reload consolidated guide if session is compacted

### **Post-Implementation Validation (MANDATORY)**
```bash
# 1. Run all test suites
npm run test:unit
npm run test:e2e

# 2. Framework consistency validation
grep -r "vi\.mock" tests/  # Must return nothing

# 3. Schema validation
npm run validate:schema

# 4. Coverage verification
npm run test:coverage  # Must meet 80% thresholds
```

## **Quick Reference - Test Templates Available**
```bash
# Unit Component Tests
cp tests/templates/unit-component.template.test.tsx tests/unit/components/[feature]/[Component].test.tsx

# Integration API Tests  
cp tests/templates/integration-api.template.test.ts tests/integration/api/[feature]/[endpoint].test.ts

# E2E Workflow Tests
cp tests/templates/e2e-workflow.template.spec.ts tests/e2e/[role]/[workflow].spec.ts
```

## **Critical Quality Gates**
- **✅ Framework Consistency**: Automated ESLint rules prevent Vitest usage
- **✅ Schema Compatibility**: All tests must use actual Prisma schema
- **✅ Template Usage**: Use provided templates for consistent patterns
- **✅ Real Database**: Integration tests use seeded data, no API mocking
- **✅ E2E Workflows**: Complete user journeys with role-based access

## **Common Issues & Solutions**
- **❌ Framework Mixing**: ESLint will block Vitest imports automatically
- **❌ Missing React Import**: Add `import React from 'react';` to components  
- **❌ Form Testing**: Use `user.keyboard('{ArrowDown}{Enter}')` for Radix UI Select
- **❌ Context Loss**: Reload `testing-guide.md` when session is compacted

## **Story 5.2 (Commitment Management) Test Requirements**
```bash
# Before implementing Story 5.2:
bash scripts/validate-pre-story.sh  # Must pass

# Required test files:
- tests/unit/components/commitments/CommitmentForm.test.tsx
- tests/unit/components/commitments/CommitmentDashboard.test.tsx  
- tests/integration/api/commitments.test.ts
- tests/e2e/donor/commitment-management.spec.ts

# Validation after implementation:
npm run test:unit && npm run test:e2e && npm run validate:schema
```

# 📚 Sharded Coding Standards

The coding standards are **sharded** for optimal context usage (8-13KB per shard vs 63KB total).

## **📁 Available Shards**
 - **Core & TypeScript**: `01-core-typescript.md` - TypeScript, file organization, imports
 - **React & Next.js**: `02-react-nextjs.md` - Components, server/client patterns
 - **State & Performance**: `03-state-performance.md` - Zustand, TanStack Query, PWA
 - **Database & API**: `04-database-api.md` - Prisma, Supabase, API routes
 - **🧪 Testing Guide**: `testing-guide.md` - **CONSOLIDATED**: All testing standards, patterns, templates
 - **Anti-Patterns**: `06-anti-patterns.md` - Common issues to avoid

## **🎯 Quick Reference**
 - **🚨 Debugging Issues**: Load `06-anti-patterns.md` first
 - **⚛️ Component Work**: Load `02-react-nextjs.md` + `01-core-typescript.md`
 - **🗄️ Database/API**: Load `04-database-api.md` + `01-core-typescript.md`
 - **🧪 Testing**: **USE `testing-guide.md` ONLY** - Single source of truth for all testing
 - **📊 Performance**: Load `03-state-performance.md` + `06-anti-patterns.md`

## **💡 Usage Tips**
 - **Dev agents** automatically load essential shards via core-config.yaml
 - **Manual work** - Load only relevant shards for your current task
 - **Start with anti-patterns** when debugging unfamiliar code
 - **Reference**: `docs/architecture/coding-standards/README.md` for complete index

# Archon MCP Integration & Workflow

**CRITICAL: This project uses Archon MCP server for knowledge management.**

## Archon Workflow:

**MANDATORY task cycle before coding:**

1. **Research** → Use knowledge base (see RAG workflow below)
2. **Implement** → Write code based on research

## RAG Workflow (Research Before Implementation)

### Searching Specific Documentation:
1. **Get sources** → `rag_get_available_sources()` - Returns list with id, title, url
2. **Find source ID** → Match to documentation (e.g., "Supabase docs" → "src_abc123")
3. **Search** → `rag_search_knowledge_base(query="vector functions", source_id="src_abc123")`

### General Research:
```bash
# Search knowledge base (2-5 keywords only!)
rag_search_knowledge_base(query="authentication JWT", match_count=5)

# Find code examples
rag_search_code_examples(query="React hooks", match_count=3)
```
### Tool Reference

**Knowledge Base (Primary - MCP):**
- `rag_get_available_sources()` - List all sources
- `rag_search_knowledge_base(query="...", source_id="...")` - Search docs
- `rag_search_code_examples(query="...", source_id="...")` - Find code

**Fallback REST API (when MCP fails):**
```bash
# Get available sources
curl -s http://localhost:8181/api/rag/sources

# Search knowledge base (2-5 keywords)
curl -s -X POST "http://localhost:8181/api/rag/query" \
  -H "Content-Type: application/json" \
  -d '{"query": "React hooks", "match_count": 5}'

# Search code examples
curl -s -X POST "http://localhost:8181/api/rag/code-examples" \
  -H "Content-Type: application/json" \
  -d '{"query": "useState useEffect", "match_count": 3}'

# Search specific source (use source_id from /api/rag/sources)
curl -s -X POST "http://localhost:8181/api/rag/query" \
  -H "Content-Type: application/json" \
  -d '{"query": "authentication", "match_count": 5, "source_id": "9529d5dabe8a726a"}'
```

**MCP Troubleshooting**: If MCP calls return "No valid session ID provided", use REST API fallback

# Fronten Development Guidelines
## Core Principles
- **Design System First**: Always check [`docs/design-system/`](docs/design-system/) before creating components
- **Offline-First**: IndexedDB → sync when online
- **Role-Based**: Assessor, Coordinator, Responder, Donor workflows
- **Context Optimized**: All docs sharded for 200k window efficiency
- **Use pnpm for this project** (PWA optimization + Windows performance):



