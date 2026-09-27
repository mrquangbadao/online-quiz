# Pre-Code Senior Checklist

This checklist is for planning and scoping before implementation.
It is not the final quality gate after code changes.

Use this checklist before writing or changing code.

## 1. Problem And Scope
- What exact user or business problem is being solved?
- What is explicitly in scope?
- What is explicitly out of scope?
- What is the smallest safe change that solves the problem?

## 2. Current Code Path
- Which files currently implement this flow?
- Which controller, service, repository, API client, page, or store are on the path?
- What existing abstractions should be reused instead of creating new ones?
- Are there existing constraints or conventions in nearby code that must be preserved?

## 3. Business Rules
- Which document is the source of truth?
- Which rules are already decided?
- Which rules are still ambiguous and should be clarified before coding?
- Are there edge cases that will change behavior for users or admins?

## 4. Data And State
- Does this change require new persistence?
- Should the invariant live in the database, service layer, or both?
- Are normalization rules needed for identifiers such as email or phone?
- Is there any race condition or duplicate-write risk?
- If the flow saves security or retry state and then throws a business exception, should that state still commit, or will the current transaction roll it back?

## 5. API And Contracts
- Will this change add or modify endpoints?
- Will request or response DTOs change?
- Will frontend types or API clients need updating?
- Is backward compatibility required for existing clients?

## 6. Security And Abuse
- Can the new logic be bypassed through another public endpoint?
- Are auth, rate limit, CAPTCHA, OTP, validation, or permission checks needed?
- Is any client-provided field being trusted too much?
- Are secrets, tokens, or OTP values handled safely?

## 7. Operational Concerns
- What should be logged?
- What metrics or audit signals would help detect regressions or abuse?
- What happens if a dependency such as Redis, email, or third-party verification is unavailable?
- Does configuration need new env vars or application settings?

## 8. Test Strategy
- What should be unit-tested?
- What should be integration-tested?
- What manual checks are still necessary?
- What regression path is most likely to break?

## 9. Rollout Safety
- Can this ship in phases?
- Is there a migration or compatibility concern?
- Can the change be enabled safely before the full frontend flow is live?
- Is there any cleanup or backfill required?

## 10. Code Quality Bar
- Are names clear and consistent with the codebase?
- Is the design simpler if one more abstraction is removed?
- Is there any duplicated logic that should be consolidated now?
- Will a reviewer understand the intent from the code and comments alone?

## Required Output Before Coding
- Impacted files or folders
- Proposed approach
- Invariants to enforce
- Risks or open questions
- Verification plan

## Commenting Rule
- Use English comments.
- Comment intent and constraints, not obvious syntax.
- Add comments for non-trivial branches, security-sensitive logic, data invariants, and cross-step flows.
- Do not add noisy comments to every line.
