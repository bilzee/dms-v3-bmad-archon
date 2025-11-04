# Dev Agent Quick Reference: Simplified Enhanced BMAD Workflow

## 🚀 Quick Start

**Simplified workflow - no interruptions during dev implementation!**

### **1. Get QA Handoff** *(Before Starting)*
Wait for QA agent to run `*risk-profile {story-id}` and provide handoff message.

### **2. Execute Pre-Implementation Commands** *(User Executes)*
```bash
# Step 1: ALWAYS run first
npm run verify:baseline

# Step 2: IF QA identified regression risks
npm run living-tests start --context "{story-id}-regression-monitoring"
```

### **3. Dev Implementation** *(Normal Dev Agent Process)*
```bash
# Dev agent implements normally - no interruptions!
/dev implement story {story-id}
```

### **4. Post-Implementation Cleanup** *(User Executes)*
```bash
# Step 3: ALWAYS run after dev completion
npm run living-tests stop
```

### **5. Report to QA** *(After Completion)*
Confirm commands executed and dev implementation completed.

---

## 📋 Command Reference

### **Baseline Verification**
```bash
npm run verify:baseline
```
**Purpose:** Validates system health before implementation  
**When:** Always run FIRST, before any coding  
**Success:** Build passes, no critical issues  
**Failure:** Fix all issues before proceeding  

### **Living Test Capture**
```bash
# Start capture
npm run living-tests start --context "{story-id}-monitoring"

# Stop capture  
npm run living-tests stop
```
**Purpose:** Captures manual fixes during development  
**When:** Only if QA identifies regression risks  
**Success:** Session starts/stops without errors  
**Failure:** Note in completion report, proceed anyway  

### **Development Implementation**
```bash
/dev implement story {story-id}
```
**Purpose:** Normal dev agent story implementation  
**When:** After baseline verification and living test setup  
**Process:** Dev agent implements without interruption  
**Success:** All story acceptance criteria implemented  

---

## ⚠️ Critical Rules

### **🛑 STOP Implementation If:**
- `npm run verify:baseline` fails
- Cannot resolve baseline verification issues
- QA has not provided handoff with clear commands

### **🔄 During Development:**
- **No interruptions required** - dev agent implements normally
- **No real-time validation needed** - simplified process
- Keep living test capture running throughout implementation (if started)

### **✅ Before Marking Complete:**
- Pre-implementation commands executed successfully
- Dev implementation completed normally
- Post-implementation cleanup executed (living test stopped)
- Completion report ready for QA

---

## 📝 Completion Report Template

Copy and customize this template for QA handoff:

```markdown
## ✅ Implementation Complete: Story {story-id}

### 🔄 Commands Executed:
- [x] `npm run verify:baseline` - ✅ PASSED
- [x] `npm run living-tests start` - ✅ STARTED (if applicable)
- [x] `/dev implement story {story-id}` - ✅ COMPLETED
- [x] `npm run living-tests stop` - ✅ COMPLETED (if applicable)

### 🛠️ Files Modified:
- src/components/NewFeature.tsx
- src/lib/services/enhanced-service.ts
- src/types/new-interfaces.ts

### ⚠️ Issues Encountered & Resolved:
- Fixed TypeScript compilation error in NewFeature component
- Resolved SSR hydration issue with conditional rendering
- Updated entity validation to handle new field types

### 📊 Living Test Results:
- **Session ID:** {story-id}-regression-monitoring
- **Manual Fixes Captured:** 3 debugging sessions
- **Quality Assessment:** High reliability (consistent fix patterns)

### 🧪 Validation Summary:
- **High-Risk Files Validated:** 3 of 3 files passed
- **Validation Issues Found:** 2 issues (both resolved)
- **Final Validation Status:** All clear ✅

Ready for QA review and gate decision!
```

---

## 🔧 Troubleshooting

### **Common Issues & Quick Fixes:**

#### **Baseline Verification Fails**
```bash
npm run verify:baseline
# ❌ Build failed. Check build.log for details.
```
**Fix:** Check build.log, resolve lint/compilation errors, retry

#### **Living Test Start Fails**
```bash
npm run living-tests start
# ❌ Commander module not found
```
**Fix:** `npm install commander @types/commander`, retry

#### **Validation File Not Found**
```bash
npm run dev:validate src/missing-file.tsx
# ❌ ENOENT: no such file or directory
```
**Fix:** Verify file path is correct relative to project root

#### **Permission Denied Errors**
```bash
npm run verify:baseline
# ❌ Permission denied
```
**Fix:** `chmod +x scripts/testing/**/*.sh`, retry

---

## 📚 Command Locations

All scripts are organized in `scripts/testing/`:

```
scripts/testing/
├── regression-prevention/
│   ├── verify-baseline.sh
│   ├── create-regression-tests.sh
│   └── feature-impact-analyzer.js
├── living-tests/
│   └── living-tests.cli.ts
└── validation/
    └── development-validator.js
```

---

## 🎯 Success Checklist

### **Pre-Implementation:**
- [ ] Received QA handoff with specific commands
- [ ] Baseline verification passed
- [ ] Living test capture started (if required)

### **During Implementation:**
- [ ] Validated each high-risk file after modification
- [ ] Fixed all validation issues immediately
- [ ] Maintained living test capture session

### **Post-Implementation:**
- [ ] All story requirements implemented
- [ ] All validation checks passing
- [ ] Living test capture stopped
- [ ] Completion report prepared for QA

### **Communication:**
- [ ] Clear documentation of all command results
- [ ] Issues and resolutions documented
- [ ] Ready for QA review phase

Remember: This enhanced workflow prevents the cycle of implementing features → breaking old features → spending time fixing them. Follow the process systematically for best results!