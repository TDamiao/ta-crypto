# Codex Operating Instructions for ta-crypto

This document establishes the repository-wide rules, architectural precedents, issue governance, and validation standards for AI assistants (Codex) working on `ta-crypto`.

---

## 1. Project Identity

`ta-crypto` is a high-performance TypeScript/ESM technical-analysis and crypto-market utility library for Node.js. It focuses on:

- **Deterministic mathematical behavior**: Exact, reproducible numeric output across executions.
- **Financial correctness**: Rigorous domain checks and financial boundary handling.
- **Stable input/output alignment**: Output arrays match input array length 1-to-1.
- **External compatibility**: Verified parity against TA-Lib and `technicalindicators`.
- **Stateful/batch parity**: Streaming API (`src/stateful.ts`) outputs match batch API (`src/core/`) outputs within `1e-10`.
- **Measurable performance**: Algorithmic optimizations backed by deterministic benchmarks (`scripts/bench-rolling.js`).
- **Reproducible releases**: Automated versioning and publication driven exclusively by Release Please and GitHub Actions.

---

## 2. Sources of Truth

When requirements or behavior appear ambiguous, resolve conflicts using this explicit precedence ladder:

1. **Current Implementation & Tests**: Code in `src/` and test suites in `test/`.
2. **Documented Public Contracts & Release Policy**: Technical contracts in `docs/` (`inputs.md`, `indicators.md`, `crypto.md`, `stateful.md`, `compatibility.md`, `trust.md`, `rolling-engine.md`, and `release-policy.md`).
3. **Compatibility Policy**: Explicit tolerance and burn-in rules in `scripts/compat-policy.json`.
4. **Current GitHub Issue Acceptance Criteria**: Active release gates and issue specs (e.g., v0.4 core hardening gate [#21](https://github.com/TDamiao/ta-crypto/issues/21), issues #27–#30, #31–#34, #35–#36, #38–#41).
5. **Roadmap**: `ROADMAP.md` proposals and future features.

> **Important**: `ROADMAP.md` entries are planned work, not shipped capabilities. Never treat roadmap items as existing APIs.

---

## 3. Core Engineering Principles

- **Correctness over API Surface Growth**: Hardening numeric precision, domain validation, and parity takes precedence over adding unvetted indicators.
- **Deterministic Behavior**: Avoid non-deterministic algorithms, external network requests, or environment-dependent floating-point assumptions.
- **Preserve Financial Semantics**: Never silently alter returns, initialization math, or indicator parameters without an explicit issue approval and deprecation plan.
- **1-to-1 Index Alignment**: Output array length MUST equal input array length. The $i$-th element of the output corresponds to the $i$-th input.
- **Documented Warmup (`null`)**: Use `null` for indices with insufficient history. Never drop leading warmup elements or shift array offsets.
- **Stateful Parity**: Streaming implementations (`createSMA`, `createEMA`, `createRSI`, `createVWAPSession`) must match batch indicators point-by-point.
- **Parity-Backed Optimization**: Performance optimizations must preserve numerical output within `1e-10` parity against golden fixtures.
- **Zero Runtime Dependencies**: Keep `dependencies` empty in `package.json`. Use internal helpers (`src/core/math.ts`, `src/core/rolling.ts`) for mathematical primitives.
- **ESM & TypeScript Conventions**: Maintain native ESM imports with `.js` extensions in imports, strict TypeScript types in `src/types.ts`, and clean module exports.

---

## 4. GitHub Issue Governance

GitHub Issues serve as the single operational task source of truth and backlog:

1. **Non-Trivial Work Requires an Issue**: Non-trivial engineering work must be tied to an open GitHub Issue before or during implementation.
2. **Acceptance Criteria Govern Completion**: Implementation must satisfy the issue's acceptance criteria without unauthorized scope expansion.
3. **Evidence-Based Issue Closure**: Never close an Issue merely because code was written. An Issue may be closed ONLY when acceptance criteria, tests, compatibility, documentation, and regression checks are verified with empirical evidence.
4. **Milestones & Release Gates**: Group related work into milestones (e.g. `v0.4`, `v0.5`). Major release gates (e.g. [#21](https://github.com/TDamiao/ta-crypto/issues/21)) govern release readiness.

---

## 5. Scope Discipline

Codex must strictly distinguish between **shipped functionality** (`v0.4.0`), **approved current scope** (v0.4.1 patch hardening), and **deferred roadmap work**.

Do NOT implement or advertise deferred roadmap scope unless explicitly instructed by a scoped issue:
- Backtesting or portfolio accounting engines
- First-class strategy signal generators
- Multi-symbol screeners
- L2/L3 order-book depth analyzers
- Broad exchange/network data ingestion adapters
- Multi-timeframe alignment / candle resampling engines (tracked for future scope in [#6](https://github.com/TDamiao/ta-crypto/issues/6))

---

## 6. Testing & Proportional Validation Policy

Validation must be proportional to the scope of change:

| Change Scope | Required Validation Ladder |
| --- | --- |
| **Documentation / README edit** | Inspect `git diff` and verify Markdown links / examples. |
| **Core Indicator Math (`src/core/`)** | `npm test && npm run test:golden` |
| **Rolling Engine / Optimization** | `npm test && npm run test:golden && npm run bench:rolling` |
| **External Compatibility Change** | `npm test && npm run test:golden && npm run test:compat:technicalindicators` |
| **Stateful API (`src/stateful.ts`)** | `npm test && npm run test:golden` |
| **Public API / Export Change** | `npm test && npm run example:all && npm run release:check` |

---

## 7. Release Governance & Safety Rules

All release decisions are governed by [`docs/release-policy.md`](docs/release-policy.md). Key rules:

1. **Commits Do Not Trigger Releases**: A merged commit is NOT automatically a release. Changes accumulate until a coherent release candidate exists.
2. **Weekly Cadence Limit**: Normal releases occur at most once per week. Emergency hotfixes bypass cadence only for critical bugs or broken builds.
3. **Release Please Accumulates Changes**: The Release Please PR acts as a staging area. Updating the PR does NOT authorize merging or publishing.
4. **Explicit Release PR Merge Decision**: Merging a Release Please PR is an explicit human/governance decision based on release readiness audit.
5. **Automation Authority**: GitHub Actions and Release Please are the ONLY release authority. Codex must **NEVER** manually bump package versions, create Git tags, publish to npm, or create GitHub Releases.
6. **Post-Release Verification**: Every release requires post-release artifact verification (GitHub Release, npm version, tag, manifest).

---

## 8. Working Method

For any non-trivial task, follow this 8-step sequence:

1. **Inspect Issue & Scope**: Review target GitHub Issue, acceptance criteria, and milestone.
2. **Inspect Implementation**: Examine relevant code in `src/`.
3. **Inspect Tests**: Check corresponding test suites in `test/`.
4. **Inspect Contracts**: Review contracts in `docs/` and policy in `scripts/compat-policy.json`.
5. **Execute Smallest Coherent Change**: Make minimal, precise code or documentation updates.
6. **Validate Empirical Results**: Run the appropriate validation commands from the testing ladder.
7. **Inspect Diff**: Review `git diff` to ensure no unintended modifications or stray files.
8. **Report & Link**: Provide clear summary, validation evidence, and issue status updates.

---

## 9. Available Repository Skills

Codex must use specialized repository skills located in `.agents/skills/` when triggered:

- [`ta-issue-orchestration`](.agents/skills/ta-issue-orchestration/SKILL.md): Managing GitHub Issues, scoping, acceptance criteria, PR linkage, and evidence-based closure.
- [`ta-indicator-development`](.agents/skills/ta-indicator-development/SKILL.md): Implementing or modifying batch technical indicators in `src/core/` and `src/api.ts`.
- [`ta-correctness-audit`](.agents/skills/ta-correctness-audit/SKILL.md): Auditing mathematical, financial-domain, initialization, alignment, and numerical correctness.
- [`ta-compatibility-validation`](.agents/skills/ta-compatibility-validation/SKILL.md): Validating outputs against TA-Lib, `technicalindicators`, and `pandas-ta` via `scripts/compat-policy.json`.
- [`ta-stateful-development`](.agents/skills/ta-stateful-development/SKILL.md): Implementing or auditing streaming/stateful indicator objects (`.next()` and `.reset()`) in `src/stateful.ts`.
- [`ta-performance-optimization`](.agents/skills/ta-performance-optimization/SKILL.md): Optimizing rolling indicators using `src/core/rolling.ts` primitives while guaranteeing mathematical parity.
- [`ta-documentation-sync`](.agents/skills/ta-documentation-sync/SKILL.md): Keeping `README.md`, `docs/`, and runnable `examples/` synchronized with exported behavior.
- [`ta-release-governance`](.agents/skills/ta-release-governance/SKILL.md): Enforcing release cadence, semantic versioning policy (`docs/release-policy.md`), and release candidate decisions (`HOLD` vs `RELEASE`).
- [`ta-release-readiness`](.agents/skills/ta-release-readiness/SKILL.md): Auditing technical readiness (`READY` vs `NOT READY`) across tests, golden suite, packaging, and CI.
- [`ta-code-review`](.agents/skills/ta-code-review/SKILL.md): Performing high-signal, structured code reviews for `ta-crypto` changes.

---

## 10. Cross-Skill Workflow Patterns

Skills coordinate according to explicit engineering patterns:

```text
New Feature Workflow:
  ta-issue-orchestration
  └──> implementation skill (ta-indicator-development / ta-stateful-development)
       └──> ta-correctness-audit
            └──> ta-compatibility-validation (when applicable)
                 └──> ta-documentation-sync
                      └──> issue completion (evidence-based closure)

Performance Optimization Workflow:
  ta-issue-orchestration
  └──> ta-performance-optimization
       └──> ta-correctness-audit (golden parity check)
            └──> benchmark validation (bench:rolling)
                 └──> ta-documentation-sync (when applicable)
                      └──> issue completion

Release Workflow:
  ta-release-governance (evaluate cadence & version candidate)
  └──> ta-release-readiness (technical readiness audit: READY / NOT READY)
       └──> explicit human merge of Release Please PR
            └──> GitHub Actions publish pipeline
                 └──> post-release verification

Emergency Hotfix Workflow:
  ta-issue-orchestration (critical issue)
  └──> correctness/security fix
       └──> ta-release-governance (EMERGENCY HOTFIX decision)
            └──> ta-release-readiness
                 └──> Release Please merge & GitHub Actions publication
```
