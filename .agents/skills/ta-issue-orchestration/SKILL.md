---
name: ta-issue-orchestration
description: Manage ta-crypto engineering work through GitHub Issues, including issue discovery, creation, scoping, acceptance criteria, implementation linkage, status updates, validation, and evidence-based closure.
---

# GitHub Issue Orchestration Skill

This skill governs how engineering tasks in `ta-crypto` are scoped, tracked, linked, validated, and closed using GitHub Issues as the single operational backlog and task source of truth.

---

## 1. Issue Governance Policy

In `ta-crypto`, **GitHub Issues are the requirements source of truth**. Code changes must be traceable to a defined Issue unless they are trivial maintenance.

```text
Issue (Requirement)  ──>  PR / Commit (Implementation)  ──>  Tests / CI (Evidence)
```

---

## 2. Working Against Existing Issues

Before commencing non-trivial work:

1. **Issue Discovery**: Check open GitHub Issues to identify whether an issue already exists for the task.
2. **Inspect Issue Context**:
   - Read the complete issue description and all comments.
   - Extract defined **Scope** and **Out of Scope** boundaries.
   - Extract mandatory **Acceptance Criteria**.
   - Note any assigned **Milestone** (e.g. `v0.4`) or Release Gate issue (e.g. [#21](https://github.com/TDamiao/ta-crypto/issues/21)).
3. **Scope Discipline**: Implement strictly what is specified in the issue. Do NOT silently broaden the issue's scope.
4. **Handling Out-of-Scope Discoveries**: If unexpected work or follow-up improvements are discovered during implementation, do not bloat the current issue. Create or recommend a separate follow-up Issue.

---

## 3. Creating New Issues

Create a new GitHub Issue when:
- A mathematical or financial correctness defect is identified.
- A new indicator, stateful constructor, or crypto utility is proposed.
- An external compatibility gap (TA-Lib, technicalindicators) requires work.
- A rolling optimization or benchmark suite is planned.
- Release, security, or supply-chain work needs tracking.
- Newly discovered work falls outside the current issue's scope.

*Do NOT create issues for trivial mechanical edits (e.g. fixing a typo in a docstring during an existing task).*

### Standard Issue Template Structure

```markdown
## Context
[Background and motivation for this task]

## Problem
[Description of the defect, gap, or missing capability]

## Evidence
[Log output, test failure, math discrepancy, or benchmark result]

## Scope
- [Explicit deliverable 1]
- [Explicit deliverable 2]

## Out of Scope
- [Explicitly excluded item 1]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Test Plan
- [Unit / contract test description]
- [Golden vector or benchmark expectation]

## Compatibility Impact
[TA-Lib / technicalindicators compatibility impact, or None]

## Documentation Impact
[docs/ page or README updates required, or None]

## Release Impact
[Target version class: PATCH / MINOR / None]

## Dependencies
[PR or Issue dependencies]
```

### Additional Fields for Mathematical / Financial Work
```markdown
## Mathematical Reference
[Authoritative spec, formula, or library reference]

## Initialization Convention
[Seeding method, e.g. SMA of first N prices]

## Warmup/Alignment Expectations
[First non-null output index and null count]

## Numerical Tolerance
[Target parity tolerance, e.g., 1e-10]
```

---

## 4. Labeling & Milestone Conventions

Use existing repository labels from `.github/labels.yml`:

- **Type**: `bug`, `enhancement`, `documentation`, `performance`, `crypto-specific`, `security`, `release`, `good first issue`, `help wanted`.
- **Milestones / Release Labels**: Apply version labels (`v0.4`, `v0.5`) ONLY when work is formally assigned to that milestone or release gate. Do not invent arbitrary custom labels.

---

## 5. Issue Closure Policy

> **NEVER close an Issue merely because code was written or a PR was opened.**

An Issue may be closed **ONLY** when ALL seven closure criteria are empirically satisfied:

1. **Acceptance Criteria Satisfied**: Every checklist item in the issue's acceptance criteria is fulfilled.
2. **Tests Passing**: Contract, unit, or golden tests verify the implementation.
3. **Compatibility Validated**: Required external compatibility checks (`npm run test:compat`) pass clean.
4. **Documentation Synchronized**: `docs/` contracts and `README.md` reflect the implementation.
5. **No Regressions**: `npm test` and `npm run test:golden` run clean.
6. **Delivered Scope Matches**: No unfulfilled promises remain in the issue scope.
7. **Traceable Evidence Provided**: Closing comment links to the commit, PR, or test output.

### Incomplete Work Policy
- If validation is incomplete, **keep the Issue open**.
- If only part of the issue is completed, either:
  - Keep the issue open and document progress, or
  - Split remaining incomplete work into an explicitly linked follow-up Issue before closing the original.

---

## 6. Issue / PR Traceability Checklist

When submitting code changes or opening PR summaries:
- Always reference the target issue (e.g. `Fixes #28` or `Addresses #21`).
- List completed scope against acceptance criteria.
- Provide empirical test / benchmark evidence.
- Indicate documentation and release impact.
