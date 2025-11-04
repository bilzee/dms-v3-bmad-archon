<!-- Powered by BMAD™ Core -->

# risk-profile

Generate a comprehensive risk assessment matrix for a story implementation using probability × impact analysis.

## Inputs

```yaml
required:
  - story_id: '{epic}.{story}' # e.g., "1.3"
  - story_path: 'docs/stories/{epic}.{story}.*.md'
  - story_title: '{title}' # If missing, derive from story file H1
  - story_slug: '{slug}' # If missing, derive from title (lowercase, hyphenated)
```

## Purpose

Identify, assess, and prioritize risks in the story implementation. Provide risk mitigation strategies and testing focus areas based on risk levels.

## Risk Assessment Framework

### Risk Categories

**Category Prefixes:**

- `TECH`: Technical Risks
- `SEC`: Security Risks
- `PERF`: Performance Risks
- `DATA`: Data Risks
- `BUS`: Business Risks
- `OPS`: Operational Risks
- `REG`: Regression Risks (New)

1. **Technical Risks (TECH)**
   - Architecture complexity
   - Integration challenges
   - Technical debt
   - Scalability concerns
   - System dependencies

2. **Security Risks (SEC)**
   - Authentication/authorization flaws
   - Data exposure vulnerabilities
   - Injection attacks
   - Session management issues
   - Cryptographic weaknesses

3. **Performance Risks (PERF)**
   - Response time degradation
   - Throughput bottlenecks
   - Resource exhaustion
   - Database query optimization
   - Caching failures

4. **Data Risks (DATA)**
   - Data loss potential
   - Data corruption
   - Privacy violations
   - Compliance issues
   - Backup/recovery gaps

5. **Business Risks (BUS)**
   - Feature doesn't meet user needs
   - Revenue impact
   - Reputation damage
   - Regulatory non-compliance
   - Market timing

6. **Operational Risks (OPS)**
   - Deployment failures
   - Monitoring gaps
   - Incident response readiness
   - Documentation inadequacy
   - Knowledge transfer issues

7. **Regression Risks (REG)**
   - Breaking existing functionality
   - Component dependency conflicts
   - Role-based workflow disruption
   - SSR/Client hydration mismatches
   - Entity assignment cascade failures
   - Authentication flow interruptions

## Risk Analysis Process

### 0. Baseline Assessment (New - Regression Prevention)

**Before identifying risks, establish system baseline:**

1. **System Health Check**
   - Run baseline verification: `npm run verify:baseline`
   - Document current functionality status
   - Identify existing technical debt hotspots

2. **Dependency Analysis**
   - Map component dependencies affected by story
   - Identify role-based workflow touchpoints
   - Assess database schema impact areas

3. **Impact Prediction**
   - Files likely to be modified
   - Integration points at risk
   - Authentication/authorization chains affected

```yaml
baseline_assessment:
  system_health: 'HEALTHY|DEGRADED|CRITICAL'
  baseline_command: 'npm run verify:baseline'
  dependency_map:
    - component: 'UserAuth'
      risk_level: 'HIGH'
      reason: 'Story touches authentication flows'
  predicted_impact:
    high_risk_files:
      - 'src/lib/auth/session.ts'
      - 'src/components/auth/LoginForm.tsx'
    integration_points:
      - 'API authentication middleware'
      - 'Role-based route protection'
```

### 1. Risk Identification

For each category, identify specific risks:

```yaml
risk:
  id: 'SEC-001' # Use prefixes: SEC, PERF, DATA, BUS, OPS, TECH, REG
  category: security
  title: 'Insufficient input validation on user forms'
  description: 'Form inputs not properly sanitized could lead to XSS attacks'
  affected_components:
    - 'UserRegistrationForm'
    - 'ProfileUpdateForm'
  detection_method: 'Code review revealed missing validation'

# Example regression risk:
regression_risk:
  id: 'REG-001'
  category: regression
  title: 'Entity assignment cascades may break after auth changes'
  description: 'Modifying authentication flows could disrupt existing entity assignment logic'
  affected_components:
    - 'EntityAssignmentService'
    - 'RoleBasedAccess'
  detection_method: 'Baseline assessment identified dependency'
  baseline_verification: 'npm run verify:baseline && npm test -- --grep="entity assignment"'
```

### 2. Risk Assessment

Evaluate each risk using probability × impact:

**Probability Levels:**

- `High (3)`: Likely to occur (>70% chance)
- `Medium (2)`: Possible occurrence (30-70% chance)
- `Low (1)`: Unlikely to occur (<30% chance)

**Impact Levels:**

- `High (3)`: Severe consequences (data breach, system down, major financial loss)
- `Medium (2)`: Moderate consequences (degraded performance, minor data issues)
- `Low (1)`: Minor consequences (cosmetic issues, slight inconvenience)

### Risk Score = Probability × Impact

- 9: Critical Risk (Red)
- 6: High Risk (Orange)
- 4: Medium Risk (Yellow)
- 2-3: Low Risk (Green)
- 1: Minimal Risk (Blue)

### 3. Risk Prioritization

Create risk matrix:

```markdown
## Risk Matrix

| Risk ID  | Description             | Probability | Impact     | Score | Priority |
| -------- | ----------------------- | ----------- | ---------- | ----- | -------- |
| SEC-001  | XSS vulnerability       | High (3)    | High (3)   | 9     | Critical |
| PERF-001 | Slow query on dashboard | Medium (2)  | Medium (2) | 4     | Medium   |
| DATA-001 | Backup failure          | Low (1)     | High (3)   | 3     | Low      |
```

### 4. Risk Mitigation Strategies

For each identified risk, provide mitigation:

```yaml
mitigation:
  risk_id: 'SEC-001'
  strategy: 'preventive' # preventive|detective|corrective
  actions:
    - 'Implement input validation library (e.g., validator.js)'
    - 'Add CSP headers to prevent XSS execution'
    - 'Sanitize all user inputs before storage'
    - 'Escape all outputs in templates'
  testing_requirements:
    - 'Security testing with OWASP ZAP'
    - 'Manual penetration testing of forms'
    - 'Unit tests for validation functions'
  residual_risk: 'Low - Some zero-day vulnerabilities may remain'
  owner: 'dev'
  timeline: 'Before deployment'
```

## Outputs

### Output 1: Gate YAML Block

Generate for pasting into gate file under `risk_summary`:

**Output rules:**

- Only include assessed risks; do not emit placeholders
- Sort risks by score (desc) when emitting highest and any tabular lists
- If no risks: totals all zeros, omit highest, keep recommendations arrays empty

```yaml
# risk_summary (paste into gate file):
risk_summary:
  totals:
    critical: X # score 9
    high: Y # score 6
    medium: Z # score 4
    low: W # score 2-3
  highest:
    id: SEC-001
    score: 9
    title: 'XSS on profile form'
  recommendations:
    must_fix:
      - 'Add input sanitization & CSP'
    monitor:
      - 'Add security alerts for auth endpoints'
```

### Output 2: Markdown Report

**Save to:** `qa.qaLocation/assessments/{epic}.{story}-risk-{YYYYMMDD}.md`

```markdown
# Risk Profile: Story {epic}.{story}

Date: {date}
Reviewer: Quinn (Test Architect)

## Executive Summary

- Total Risks Identified: X
- Critical Risks: Y
- High Risks: Z
- Risk Score: XX/100 (calculated)

## Critical Risks Requiring Immediate Attention

### 1. [ID]: Risk Title

**Score: 9 (Critical)**
**Probability**: High - Detailed reasoning
**Impact**: High - Potential consequences
**Mitigation**:

- Immediate action required
- Specific steps to take
  **Testing Focus**: Specific test scenarios needed

## Risk Distribution

### By Category

- Security: X risks (Y critical)
- Performance: X risks (Y critical)
- Data: X risks (Y critical)
- Business: X risks (Y critical)
- Operational: X risks (Y critical)

### By Component

- Frontend: X risks
- Backend: X risks
- Database: X risks
- Infrastructure: X risks

## Detailed Risk Register

[Full table of all risks with scores and mitigations]

## Risk-Based Testing Strategy

### Priority 1: Critical Risk Tests

- Test scenarios for critical risks
- Required test types (security, load, chaos)
- Test data requirements

### Priority 2: High Risk Tests

- Integration test scenarios
- Edge case coverage

### Priority 3: Medium/Low Risk Tests

- Standard functional tests
- Regression test suite

## Risk Acceptance Criteria

### Must Fix Before Production

- All critical risks (score 9)
- High risks affecting security/data

### Can Deploy with Mitigation

- Medium risks with compensating controls
- Low risks with monitoring in place

### Accepted Risks

- Document any risks team accepts
- Include sign-off from appropriate authority

## Monitoring Requirements

Post-deployment monitoring for:

- Performance metrics for PERF risks
- Security alerts for SEC risks
- Error rates for operational risks
- Business KPIs for business risks

## Risk Review Triggers

Review and update risk profile when:

- Architecture changes significantly
- New integrations added
- Security vulnerabilities discovered
- Performance issues reported
- Regulatory requirements change
```

## Risk Scoring Algorithm

Calculate overall story risk score:

```text
Base Score = 100
For each risk:
  - Critical (9): Deduct 20 points
  - High (6): Deduct 10 points
  - Medium (4): Deduct 5 points
  - Low (2-3): Deduct 2 points

Minimum score = 0 (extremely risky)
Maximum score = 100 (minimal risk)
```

## Risk-Based Recommendations

Based on risk profile, recommend:

1. **Testing Priority**
   - Which tests to run first
   - Additional test types needed
   - Test environment requirements

2. **Development Focus**
   - Code review emphasis areas
   - Additional validation needed
   - Security controls to implement

3. **Deployment Strategy**
   - Phased rollout for high-risk changes
   - Feature flags for risky features
   - Rollback procedures

4. **Monitoring Setup**
   - Metrics to track
   - Alerts to configure
   - Dashboard requirements

## Integration with Quality Gates

**Deterministic gate mapping:**

- Any risk with score ≥ 9 → Gate = FAIL (unless waived)
- Else if any score ≥ 6 → Gate = CONCERNS
- Else → Gate = PASS
- Unmitigated risks → Document in gate

### Output 3: QA-to-User Simplified Handoff Instructions

**Print this complete handoff message for User:**

```markdown
## 🔄 QA-User Handoff: Story {epic}.{story}

### 📊 Risk Assessment Complete
- **Risk Level:** [HIGH/MEDIUM/LOW based on highest risk score]
- **Regression Risks:** [Yes/No - if Yes, living test capture recommended]
- **Baseline Health:** [HEALTHY/DEGRADED/CRITICAL based on current state]

### 🛠️ Pre-Implementation Commands (Execute Before Dev Implementation):

**Step 1: Baseline Verification (MANDATORY)**
```bash
npm run verify:baseline
```
✅ **Must Pass:** Build succeeds, no critical system health issues
❌ **If Fails:** Fix all issues before proceeding with implementation

**Step 2: Living Test Setup (If Regression Risks = Yes)**
```bash
npm run living-tests start --context "{epic}.{story}-regression-monitoring"
```
✅ **Success:** Living test session started successfully
⚠️ **If Fails:** Note failure, proceed without capture, inform QA

### 🎯 Implementation Ready
Once pre-implementation commands succeed, proceed with normal dev implementation:
```bash
/dev implement story {epic}.{story}
```

### 🧹 Post-Implementation Cleanup (Execute After Dev Completion):
```bash
npm run living-tests stop
```
✅ **Success:** Living test session stopped, capture data saved

### 📋 Simplified Workflow Checklist:
- [ ] Baseline verification passes
- [ ] Living test capture started (if regression risks identified)
- [ ] Dev agent implements story normally (no interruptions)
- [ ] Living test capture stopped after implementation
- [ ] Ready for QA review

### 🎯 Key Benefits of Simplified Process:
- **No real-time validation required** - dev agent implements without interruption
- **Focused dev implementation** - no context bloat or complex handoffs
- **80% regression prevention** with minimal token overhead
- **Practical workflow** that matches actual usage patterns

Ready for implementation! Dev agent can proceed normally after baseline verification.
```

### Output 4: Story Hook Line

**Print this line for review task to quote:**

```text
Risk profile: qa.qaLocation/assessments/{epic}.{story}-risk-{YYYYMMDD}.md
```

## Key Principles

- Identify risks early and systematically
- Use consistent probability × impact scoring
- Provide actionable mitigation strategies
- Link risks to specific test requirements
- Track residual risk after mitigation
- Update risk profile as story evolves
- **Establish baseline before assessing new risks (regression prevention)**
- **Provide Dev agent with specific validation commands**
- **Consider regression risks as critical as security risks**
