# Archon MCP Server Session Authentication Issue

## Issue Summary
All Archon MCP functions return "Error POSTing to endpoint (HTTP 400): Bad Request: No valid session ID provided" error, preventing access to knowledge base search capabilities.

## Investigation Details

### Environment
- **Project**: DMS v3 Disaster Management System
- **Platform**: Windows (WSL2)
- **Archon Server Status**: Running in Docker containers
- **MCP Server**: `archon-mcp` container on port 8051
- **Main Server**: `archon-server` container on port 8181

### Troubleshooting Steps Taken

#### 1. MCP Configuration Check
**Result**: No specific MCP configuration found in project
- Checked for `.claude_code_config.json` - not found
- Checked `.bmad-core/core-config.yaml` - contains BMad configuration only
- **Finding**: Claude Code MCP configuration appears to be handled internally

#### 2. Server Status Verification
**Result**: Both Archon servers running correctly
```bash
# Docker containers status
✅ archon-mcp: Up 2 hours, healthy (port 8051)
✅ archon-server: Up 2 hours, healthy (port 8181)

# Health checks passed
✅ archon-mcp: {"status":"ok","uptime":"2h1m2s"}
✅ archon-server: {"status":"ok","uptime":"2h1m3s","services":{"database":"ok","knowledge_base":"ok"}}
```

#### 3. Server Logs Analysis
**MCP Server Logs Pattern**:
- Repeated "Cleaning up crashed session" messages
- "Session request failed" errors
- "Invalid session ID provided" responses

**Main Server Logs**:
- Shows normal operation with credentials loaded:
  - Supabase service key loaded
  - GPG key loaded
  - Knowledge base initialized

#### 4. MCP Functions Tested
All functions return identical 400 error:
- `rag_get_available_sources()`
- `rag_search_knowledge_base(query="test")`
- `rag_search_code_examples(query="test")`
- `mcp__archon__health_check()`

**Error Pattern**:
```
Error POSTing to endpoint (HTTP 400): Bad Request: No valid session ID provided
```

### Root Cause Analysis
**Hypothesis**: MCP server requires session initialization/authentication handshake that Claude Code is not performing correctly.

**Evidence**:
1. Server connectivity confirmed (ports responsive, health checks OK)
2. Server functionality confirmed (RAG works via browser interface)
3. All MCP calls fail with identical session ID error
4. Server logs indicate session management issues

### Possible Solutions

#### Immediate (Requires System Administrator)
1. **MCP Server Configuration**: Check MCP server startup parameters for session handling
2. **Authentication Keys**: Verify MCP server has correct authentication credentials
3. **Session Initialization**: Check if Claude Code requires specific MCP session initialization

#### Development Team
1. **Alternative Access**: Use browser interface for Archon knowledge base access
2. **Direct API**: Use Archon REST API directly if MCP continues to fail
3. **Documentation**: Check internal Archon documentation for MCP setup requirements

### Workaround Implemented
For Story 2.2 QA review:
- Used browser-based testing instead of knowledge base research
- Implemented comprehensive testing without Archon MCP assistance
- All acceptance criteria validated through direct testing

### Next Steps Required
1. **System Administrator**: Investigate MCP server session configuration
2. **Infrastructure Team**: Verify Claude Code MCP integration setup
3. **Development**: Document alternative knowledge base access methods

### Impact Assessment
- **Current**: Blocks knowledge base search capabilities via MCP
- **Workaround**: Direct browser access to Archon interface available
- **Priority**: Medium - does not block development but reduces efficiency

## Technical Details

### Server Configuration
```yaml
# Docker Compose (excerpt)
services:
  archon-mcp:
    image: archon-mcp:latest
    ports:
      - "8051:8051"
    environment:
      - ARCHON_SERVER_URL=http://archon-server:8181
      - MCP_SESSION_TIMEOUT=3600
    depends_on:
      - archon-server
```

### Error Reproduction
```typescript
// Any MCP function call
await rag_get_available_sources();
// Returns: Error POSTing to endpoint (HTTP 400): Bad Request: No valid session ID provided
```

### Server Response Headers
```
HTTP/1.1 400 Bad Request
Content-Type: application/json
Content-Length: 45
Date: [timestamp]
Server: Archon MCP Server
```

## Resolution Checklist
- [ ] System Administrator reviews MCP server session configuration
- [ ] Verify Claude Code MCP integration credentials
- [ ] Test MCP session initialization process
- [ ] Update documentation with working configuration
- [ ] Validate all MCP functions post-resolution

---
**Report Created**: October 6, 2025  
**Issue Status**: Open - Requires infrastructure investigation  
**Workaround Available**: Yes - Browser interface access