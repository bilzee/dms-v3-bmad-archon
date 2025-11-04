<!-- Powered by BMAD™ Core -->

# qa-gate

Create or update a quality gate decision file for a story based on review findings.

## Purpose

Generate a standalone quality gate file that provides a clear pass/fail decision with actionable feedback. This gate serves as an advisory checkpoint for teams to understand quality status.

## Prerequisites

- Story has been reviewed (manually or via review-story task)
- Review findings are available
- Understanding of story requirements and implementation

## Gate File Location

**ALWAYS** check the `.bmad-core/core-config.yaml` for the `qa.qaLocation/gates`

Slug rules:

- Convert to lowercase
- Replace spaces with hyphens
- Strip punctuation
- Example: "User Auth - Login!" becomes "user-auth-login"

## Minimal Required Schema

```yaml
schema: 1
story: '{epic}.{story}'
gate: PASS|CONCERNS|FAIL|WAIVED
status_reason: '1-2 sentence explanation of gate decision'
reviewer: 'Quinn'
updated: '{ISO-8601 timestamp}'
top_issues: [] # Empty array if no issues
waiver: { active: false } # Only set active: true if WAIVED
```

## Schema with Issues

```yaml
schema: 1
story: '1.3'
gate: CONCERNS
status_reason: 'Missing rate limiting on auth endpoints poses security risk.'
reviewer: 'Quinn'
updated: '2025-01-12T10:15:00Z'
top_issues:
  - id: 'SEC-001'
    severity: high # ONLY: low|medium|high
    finding: 'No rate limiting on login endpoint'
    suggested_action: 'Add rate limiting middleware before production'
  - id: 'TEST-001'
    severity: medium
    finding: 'No integration tests for auth flow'
    suggested_action: 'Add integration test coverage'
waiver: { active: false }
```

## Schema when Waived

```yaml
schema: 1
story: '1.3'
gate: WAIVED
status_reason: 'Known issues accepted for MVP release.'
reviewer: 'Quinn'
updated: '2025-01-12T10:15:00Z'
top_issues:
  - id: 'PERF-001'
    severity: low
    finding: 'Dashboard loads slowly with 1000+ items'
    suggested_action: 'Implement pagination in next sprint'
waiver:
  active: true
  reason: 'MVP release - performance optimization deferred'
  approved_by: 'Product Owner'
```

## Gate Decision Criteria

**Enhanced Decision Logic (Applied in Order):**

1. **Living Test & Regression Factors (New - First Priority)**
   - If critical fixes captured but auto-generated tests have low quality score → CONCERNS
   - If baseline verification fails compared to pre-implementation → FAIL  
   - If recurring fix patterns indicate architectural issues not addressed → CONCERNS
   - If regression risks identified in risk-profile were not properly mitigated → FAIL

2. **Traditional Quality Factors**
   - All acceptance criteria met
   - No high-severity issues  
   - Test coverage meets project standards

### PASS

- All acceptance criteria met
- No high-severity issues
- Test coverage meets project standards
- **Baseline verification shows healthy system state**
- **Any captured fixes have been validated and integrated**

### CONCERNS

- Non-blocking issues present
- Should be tracked and scheduled
- Can proceed with awareness
- **Auto-generated tests from captured fixes need review**
- **Recurring fix patterns suggest architectural debt**

### FAIL

- Acceptance criteria not met
- High-severity issues present
- Recommend return to InProgress
- **Baseline verification shows system degradation**
- **Critical regression risks not properly mitigated**

### WAIVED

- Issues explicitly accepted
- Requires approval and reason
- Proceed despite known issues
- **Living test quality issues accepted for MVP**

## Severity Scale

**FIXED VALUES - NO VARIATIONS:**

- `low`: Minor issues, cosmetic problems
- `medium`: Should fix soon, not blocking
- `high`: Critical issues, should block release

## Issue ID Prefixes

- `SEC-`: Security issues
- `PERF-`: Performance issues
- `REL-`: Reliability issues
- `TEST-`: Testing gaps
- `MNT-`: Maintainability concerns
- `ARCH-`: Architecture issues
- `DOC-`: Documentation gaps
- `REQ-`: Requirements issues
- `REG-`: Regression issues (New)
- `LIVE-`: Living test quality issues (New)

## Output Requirements

1. **ALWAYS** create gate file at: `qa.qaLocation/gates` from `.bmad-core/core-config.yaml`
2. **ALWAYS** append this exact format to story's QA Results section:

   ```text
   Gate: {STATUS} → qa.qaLocation/gates/{epic}.{story}-{slug}.yml
   ```

3. Keep status_reason to 1-2 sentences maximum
4. Use severity values exactly: `low`, `medium`, or `high`

## Example Story Update

After creating gate file, append to story's QA Results section:

```markdown
## QA Results

### Review Date: 2025-01-12

### Reviewed By: Quinn (Test Architect)

[... existing review content ...]

### Gate Status

Gate: CONCERNS → qa.qaLocation/gates/{epic}.{story}-{slug}.yml
Living test analysis: [qa.qaLocation/assessments/{epic}.{story}-living-{YYYYMMDD}.md | No session detected]
```

## Key Principles

- Keep it minimal and predictable
- Fixed severity scale (low/medium/high)
- Always write to standard path
- Always update story with gate reference
- Clear, actionable findings
- **Prioritize regression and living test factors in gate decisions**
- **Include living test analysis reference when available**
- **Consider baseline health as critical gate factor**
