# General Instructions

1. Do not mock values on the frontend; mock at the database with seeded data. 
2. Dev agent and qa agent should always search the Archon Knowledge Base using the archon mcp or REST API (see below) 
3. Testing strategy can be found in docs/prd/testing-strategy.md
4. When troubleshooting, do not take shortcuts, instead, first search the Archon knowledge base for solution, and if no solution is found, create a detailed report on the problem and what has been tried in docs/to-toubleshoot/ so it can be fixed separately.

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



