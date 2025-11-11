# General Instructions

1. Do not mock values on the frontend; mock at the database with seeded data. 
2. Dev agent and qa agent should always search the Archon Knowledge Base using the archon mcp or REST API (see below) 
3. Testing strategy can be found in docs/prd/testing-strategy.md
4. When troubleshooting, do not take shortcuts, instead, first search the Archon knowledge base for solution, and if no solution is found, create a detailed report on the problem and what has been tried in docs/to-toubleshoot/ so it can be fixed separately.

# 🧪 Pre-Story Testing Validation

## Critical Workflow Rules

### Before Story Implementation
1. **Run Pre-Story Validation**: `bash scripts/validate-pre-story.sh`
2. **Reload Testing Standards**: Always reload `docs/architecture/coding-standards/05-testing.md` when context is compacted
3. **Framework Consistency**: This project uses **Jest** (NOT Vitest) - enforce strictly
4. **Component Mocks**: Ensure UI mocks support React Hook Form `{...field}` props

### During Story Implementation
- **Use Jest Syntax**: `jest.mock()` not `vi.mock()`
- **Form Testing**: Test React Hook Form with proper user interactions
- **UI Components**: Mock Radix UI components with proper event handling
- **Context Loading**: Reload testing standards if context becomes compacted

### After Story Implementation
1. **Run All Tests**: `npm run test:unit` and `npm run test:e2e`
2. **Schema Validation**: `npm run validate:schema`
3. **Framework Check**: `grep -r "vi\.mock" tests/` should return nothing
4. **Coverage Check**: Ensure coverage thresholds are met

## Quick Testing Commands
```bash
# Validate before story implementation
bash scripts/validate-pre-story.sh

# Check for framework consistency issues
grep -r "vi\.mock" tests/  # Should return nothing
grep -r "jest\.mock" tests/ # Should show mock usage

# Run full test suite
npm run test:unit
npm run test:e2e
npm run validate:schema
```

## Common Testing Issues & Solutions
- **Missing React Import**: Add `import React from 'react';` to components
- **Framework Mixing**: Replace all `vi.mock()` with `jest.mock()`
- **Form Validation**: Use `user.keyboard('{ArrowDown}{Enter}')` for Radix UI Select
- **Context Loss**: Reload `05-testing.md` when session is compacted

# 📚 Sharded Coding Standards

The coding standards are **sharded** for optimal context usage (8-13KB per shard vs 63KB total).

## **📁 Available Shards**
 - **Core & TypeScript**: `01-core-typescript.md` - TypeScript, file organization, imports
 - **React & Next.js**: `02-react-nextjs.md` - Components, server/client patterns
 - **State & Performance**: `03-state-performance.md` - Zustand, TanStack Query, PWA
 - **Database & API**: `04-database-api.md` - Prisma, Supabase, API routes
 - **Testing**: `05-testing.md` - Unit tests, integration tests, E2E patterns
 - **Anti-Patterns**: `06-anti-patterns.md` - Common issues to avoid

## **🎯 Quick Reference**
 - **🚨 Debugging Issues**: Load `06-anti-patterns.md` first
 - **⚛️ Component Work**: Load `02-react-nextjs.md` + `01-core-typescript.md`
 - **🗄️ Database/API**: Load `04-database-api.md` + `01-core-typescript.md`
 - **🧪 Testing**: Load `05-testing.md` + `01-core-typescript.md`
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



