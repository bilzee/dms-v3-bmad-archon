# General Instructions

1. Do not mock values on the frontend; mock at the database with seeded data. 
2. Dev agent and qa agent should always search the Archon Knowledge Base using the archon mcp or REST API (see below) 
3. Testing strategy can be found in docs/prd/testing-strategy.md
4. When troubleshooting, do not take shortcuts, instead, first search the Archon knowledge base for solution, and if no solution is found, create a detailed report on the problem and what has been tried in docs/to-toubleshoot/ so it can be fixed separately.

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

## Project Context
Disaster Management PWA for Nigeria - offline-first humanitarian assessment and response coordination.

**Tech Stack**: Next.js 14, TypeScript, Shadcn/ui, Zustand, PostgreSQL/Prisma, IndexedDB

## Essential Reading
- **Requirements**: [`docs/prd/index.md`](docs/prd/index.md)
- **Architecture**: [`docs/architecture/index.md`](docs/architecture/index.md)
- **🎨 Design System**: [`docs/design-system/index.md`](docs/design-system/index.md) - Complete UI/UX reference

## Development Workflow
1. Load story from `docs/stories/`
2. Reference design system for UI components and patterns
3. Follow architecture guidelines for data/API patterns
4. Implement offline-first with Zustand + IndexedDB

## Core Principles
- **Design System First**: Always check [`docs/design-system/`](docs/design-system/) before creating components
- **Offline-First**: IndexedDB → sync when online
- **Role-Based**: Assessor, Coordinator, Responder, Donor workflows
- **Context Optimized**: All docs sharded for 200k window efficiency

## Package Manager
**Use pnpm for this project** (PWA optimization + Windows performance):
```bash
# Setup (if needed)
npm install -g pnpm
pnpm import  # Converts existing package-lock.json

# Install dependencies
pnpm install
```

## Quick Commands
```bash
# Development
pnpm dev
pnpm dlx shadcn-ui@latest add [component]

# Database  
pnpm dlx prisma generate && pnpm dlx prisma db push

# Quality
pnpm type-check && pnpm lint && pnpm test
```

*See [`docs/design-system/index.md`](docs/design-system/index.md) for detailed implementation guidance.*





