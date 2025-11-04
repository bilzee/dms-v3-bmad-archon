# Testing Scripts Directory

This directory contains all testing-related scripts organized by purpose.

## Directory Structure

### `regression-prevention/`
Scripts for preventing regressions and maintaining system baseline:

- **`verify-baseline.sh`** - Validates system health before implementation
- **`create-regression-tests.sh`** - Auto-generates regression tests for stories
- **`feature-impact-analyzer.js`** - Analyzes potential impact of changes

### `living-tests/`
Scripts for the Living Test System that captures manual fixes:

- **`living-tests.cli.ts`** - Main CLI for living test system
- **`demo-living-tests.ts`** - Demo/example of living test capabilities

### `validation/`
Scripts for real-time development validation:

- **`development-validator.js`** - Real-time validation during development

## Usage Integration

These scripts integrate with the BMAD QA workflow:

1. **Pre-Implementation**: Use `regression-prevention/` scripts
2. **During Implementation**: Use `validation/` scripts + `living-tests/` CLI
3. **Post-Implementation**: Analyze results from `living-tests/` system

## Commands Reference

```bash
# Baseline verification
npm run verify:baseline
# -> Executes: scripts/testing/regression-prevention/verify-baseline.sh

# Development validation
npm run dev:validate <file>
# -> Executes: scripts/testing/validation/development-validator.js

# Living test system
npx ts-node scripts/testing/living-tests/living-tests.cli.ts start --context "story-4.3"
npx ts-node scripts/testing/living-tests/living-tests.cli.ts stop
```