# BMAD QA-Dev Manual Handoff Process

## Overview

This document defines the manual handoff process between QA and Dev agents in the enhanced BMAD workflow with regression prevention and living test integration.

## 🔄 Complete Handoff Workflow

### **Phase 1: QA Pre-Analysis**
QA agent performs risk assessment and provides specific commands for Dev execution.

### **Phase 2: Manual Handoff Execution** 
Dev agent must manually execute QA-provided commands before and during implementation.

### **Phase 3: QA Post-Analysis**
QA agent analyzes Dev results and captured data for quality gate decision.

---

## 📋 Detailed Handoff Instructions

### **Step 1: QA Risk Assessment**

**QA Agent runs:**
```bash
*risk-profile {story-id}
*test-design {story-id}
```

**QA Output includes:**
- Risk assessment with baseline requirements
- **Specific Dev commands** to execute during implementation
- Living test context setup instructions
- High-risk files for validation

### **Step 2: Manual Command Execution**

**Dev Agent must execute these commands in order:**

#### **2.1 Pre-Implementation Baseline**
```bash
# MANDATORY: Run before starting any implementation
npm run verify:baseline
```
✅ **Verification:** Build must pass and no critical issues detected

#### **2.2 Living Test Setup (if regression risks identified)**
```bash
# If QA identifies regression risks in risk-profile output
npm run living-tests start --context "{story-id}-regression-monitoring"
```
✅ **Verification:** Living test session started successfully

#### **2.3 Real-Time Validation During Development**
```bash
# Run continuously during development for high-risk files
npm run dev:validate src/components/HighRiskFile.tsx
npm run dev:validate src/lib/services/CriticalService.ts
# (Use specific files from QA risk-profile output)
```
✅ **Verification:** No validation errors for modified files

#### **2.4 Post-Implementation Cleanup**
```bash
# When implementation is complete
npm run living-tests stop
```
✅ **Verification:** Living test session stopped and data captured

### **Step 3: QA Post-Analysis**

**QA Agent runs:**
```bash
*review {story-id}
*gate {story-id}
```

**QA analyzes:**
- Living test capture results
- Baseline health comparison
- Captured fixes and their quality
- Traditional review factors

---

## 🚨 Critical Handoff Points

### **Mandatory Execution Order:**
1. ✅ `npm run verify:baseline` (BEFORE implementation)
2. ✅ `npm run living-tests start` (IF regression risks identified)
3. ✅ `npm run dev:validate` (DURING implementation)
4. ✅ `npm run living-tests stop` (AFTER implementation)

### **Failure Scenarios:**

**If baseline verification fails:**
```bash
npm run verify:baseline
# ❌ Build failed or critical issues detected
```
➡️ **Action:** Fix issues before proceeding with story implementation

**If living test capture fails:**
```bash
npm run living-tests start --context "story-4.3"
# ❌ Cannot start capture session
```
➡️ **Action:** Proceed without living test capture, note in implementation

**If validation detects issues:**
```bash
npm run dev:validate src/components/NewFeature.tsx
# ❌ Validation errors detected
```
➡️ **Action:** Fix validation issues before continuing development

---

## 📝 Communication Protocol

### **QA-to-Dev Handoff Message Format:**

```markdown
## 🔄 QA-Dev Handoff: Story {story-id}

### 📊 Risk Assessment Complete
- **Risk Level:** [HIGH/MEDIUM/LOW]
- **Regression Risks Identified:** [X risks requiring living test capture]
- **Baseline Health:** [HEALTHY/DEGRADED/CRITICAL]

### 🛠️ Required Dev Commands:
Execute in this exact order:

**Pre-Implementation:**
```bash
npm run verify:baseline
```

**Setup (if regression risks):**
```bash
npm run living-tests start --context "{story-id}-regression-monitoring"
```

**During Development:**
```bash
npm run dev:validate [specific files from risk assessment]
```

**Post-Implementation:**
```bash
npm run living-tests stop
```

### 🎯 High-Risk Files to Monitor:
- [List specific files from risk assessment]

### 📋 Success Criteria:
- [ ] Baseline verification passes
- [ ] All validation checks pass during development
- [ ] Living test capture completes successfully (if applicable)

Ready for implementation!
```

### **Dev-to-QA Completion Message Format:**

```markdown
## ✅ Implementation Complete: Story {story-id}

### 🔄 Handoff Commands Executed:
- [x] `npm run verify:baseline` - ✅ PASSED
- [x] `npm run living-tests start` - ✅ STARTED
- [x] `npm run dev:validate` - ✅ ALL FILES VALIDATED
- [x] `npm run living-tests stop` - ✅ CAPTURE COMPLETE

### 🛠️ Files Modified:
- [List of files modified during implementation]

### ⚠️ Issues Encountered:
- [Any validation issues found and resolved]
- [Any living test capture issues]

### 📊 Living Test Results:
- **Capture Session:** {story-id}-regression-monitoring
- **Manual Fixes Detected:** [X fixes captured]
- **Quality Score:** [High/Medium/Low based on fix patterns]

Ready for QA review and gate decision!
```

---

## 🎯 Success Metrics

### **Handoff Quality Indicators:**

**✅ Successful Handoff:**
- All commands executed in correct order
- No critical validation failures
- Living test capture completed (when applicable)
- Clear communication between QA and Dev

**⚠️ Partial Success:**
- Baseline passes but validation issues found and resolved
- Living test capture had minor issues but completed
- Some manual intervention required

**❌ Failed Handoff:**
- Baseline verification fails and not resolved
- Critical validation errors not addressed
- Living test capture completely failed
- Communication breakdown between agents

---

## 🔧 Troubleshooting Common Issues

### **Baseline Verification Fails:**
```bash
npm run verify:baseline
# ❌ Build failed
```
**Solution:** Review build.log, fix linting/compilation errors before proceeding

### **Living Test CLI Issues:**
```bash
npm run living-tests start
# ❌ Commander module not found
```
**Solution:** Install missing dependencies: `npm install commander @types/commander`

### **Validation Script Errors:**
```bash
npm run dev:validate src/file.tsx
# ❌ File not found
```
**Solution:** Verify file path is correct relative to project root

### **Permission/Access Issues:**
```bash
npm run living-tests start
# ❌ Permission denied
```
**Solution:** Check file permissions on scripts directory: `chmod +x scripts/testing/living-tests/*`

---

## 📚 Quick Reference

### **Dev Agent Checklist:**
- [ ] Received QA risk assessment with specific commands
- [ ] Executed baseline verification before implementation
- [ ] Started living test capture (if regression risks identified)  
- [ ] Ran validation during development for high-risk files
- [ ] Stopped living test capture after implementation
- [ ] Communicated results back to QA

### **QA Agent Checklist:**
- [ ] Provided clear, specific commands in risk assessment
- [ ] Identified high-risk files for validation
- [ ] Specified living test context if needed
- [ ] Received Dev completion confirmation
- [ ] Analyzed living test results in review
- [ ] Made gate decision based on all factors

This manual handoff process ensures the enhanced BMAD workflow operates effectively while maintaining clear communication and systematic quality assurance.