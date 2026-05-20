# Workflow: Fix Bug

## Goal
Resolve a specific defect without accidental refactor sprawl.

## Steps
1. Reproduce or inspect the failing path.
2. Trace the smallest code path that can explain the bug.
3. Fix the root cause, not only the symptom.
4. Add a regression check when practical.
5. Verify the affected area and describe remaining uncertainty.

## Prompt Shape
- Symptom
- Suspected area
- Scope limits
- Verification target

## Example
- "Investigate why login rate limit does not match the anti-spam plan. Fix backend only, keep the current architecture, and verify the affected code path."
