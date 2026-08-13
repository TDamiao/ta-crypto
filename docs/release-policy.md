# Release Policy for ta-crypto

This document establishes the official release governance, cadence, semantic versioning policy, and publication rules for `ta-crypto`.

---

## 1. Core Release Principle

> **A merged change is NOT automatically a release.**

Commits merged into `main` accumulate in the repository and in the Release Please PR. A release is an intentional, deliberate event driven by product value, stability, and risk management—not by commit count or code merges.

---

## 2. Release Cadence & Emergency Hotfixes

### Normal Release Cadence
- **Frequency**: At most **once per week**, and only when there is meaningful releasable content.
- **Accumulation**: Multiple minor fixes, performance refactors, or documentation updates should accumulate into a single coherent release rather than triggering rapid sequential versions.
- **Same-Day Prohibition**: Multiple normal releases on the same day are prohibited unless correcting a broken release.

### Emergency Releases (Hotfixes)
The weekly cadence restriction may be bypassed for urgent defects:
- Critical mathematical or financial calculation correctness regressions.
- Security vulnerabilities or compromised build artifacts.
- Broken npm packages or installation failures.
- Severe public API regressions.

*Note: Emergency hotfixes still require full test, compatibility, and packaging validation. Urgency does not justify bypassing math correctness or release gates.*

---

## 3. Semantic Versioning Policy (Pre-1.0 & Post-1.0)

`ta-crypto` follows [Semantic Versioning 2.0.0](https://semver.org/). While in the `0.x` pre-1.0 phase, version transitions are governed by the following rules:

### PATCH Releases (`0.3.x` $\to$ `0.3.y`)
Used for backward-compatible bug fixes and corrections:
- Mathematical corrections that preserve the intended public contract.
- Input validation or domain restriction fixes.
- External compatibility alignment fixes.
- Packaging, bundle size, or export mapping fixes.
- Performance improvements that preserve exact output parity (`1e-10`).

*Do NOT publish a PATCH release solely for internal refactoring, CI updates, or documentation edits unless users require an updated npm artifact.*

### MINOR Releases (`0.3.x` $\to$ `0.4.0`)
Used for capability additions and pre-1.0 breaking corrections:
- New batch indicators, stateful APIs, or crypto utilities.
- Meaningful backward-compatible API additions.
- **Planned Breaking Changes in `0.x`**: Controlled breaking corrections (e.g. issue [#27](https://github.com/TDamiao/ta-crypto/issues/27) percentReturn compounding correction).

Any breaking change included in a pre-1.0 MINOR release MUST satisfy **6 mandatory conditions**:
1. An approved GitHub Issue defining the change.
2. Explicit acceptance criteria and test plan.
3. Migration guidance in documentation.
4. Clear visibility in `CHANGELOG.md`.
5. External compatibility impact analysis.
6. Deliberate release approval.

### MAJOR Releases (`1.0.0` and beyond)
`1.0.0` represents a formal stability milestone. Before reaching `1.0.0`, the library must establish:
- Stable public API contracts across all barrels.
- Supported Node.js and TypeScript runtime baseline.
- Formal deprecation policy for public methods.
- Complete compatibility policy coverage.
- Package trust baseline (npm provenance, SBOM attestations per issue [#41](https://github.com/TDamiao/ta-crypto/issues/41)).

After `1.0.0`, any breaking public API change strictly requires a MAJOR version bump.

---

## 4. Changes That Do NOT Trigger a Release By Themselves

The following changes MUST accumulate on `main` without triggering an immediate release:
- Documentation-only edits (`docs/`, `README.md` formatting).
- Test suite additions or refactorings (`test/`).
- CI/CD workflow updates (`.github/workflows/`).
- GitHub issue templates or labels.
- Code comments, formatting, or internal developer tooling.
- Agent operating instructions or skill updates (`AGENTS.md`, `.agents/`).
- Benchmark infrastructure updates (`scripts/bench.js`).

*These changes ship automatically as part of the next meaningful PATCH or MINOR release.*

---

## 5. Conventional Commits & Release Intent

Release Please interprets commit prefixes on `main` to determine candidate release types:

| Commit Prefix | Candidate Release Classification | Notes |
| --- | --- | --- |
| `fix:` | **PATCH Candidate** | Bug fixes and contract corrections |
| `feat:` | **MINOR Candidate** | New features or pre-1.0 MINOR enhancements |
| `feat!:`, `fix!:`, `BREAKING CHANGE:` | **MINOR Candidate (in 0.x)** | Pre-1.0 breaking change |
| `perf:` | **PATCH Candidate** | Only if material performance gain with benchmark evidence |
| `docs:`, `test:`, `ci:`, `chore:`, `refactor:` | **Non-Release** | Accumulates without triggering release |

Commit prefixes must truthfully describe the work performed. Do NOT alter commit types merely to manipulate Release Please PR generation.

---

## 6. Release Please PR Management

- The Release Please PR generated by GitHub Actions serves as a release staging area.
- **No Automatic PR Merging**: The existence or update of a Release Please PR does **NOT** authorize immediate merging.
- A Release Please PR should remain open while:
  1. The planned milestone scope is still accumulating.
  2. Active release gate issues remain incomplete.
  3. Release governance recommends `HOLD`.
- Merging the Release PR is an **explicit human/governance release decision**.

---

## 7. Publication Authority & Automation Chain

Local development tools, Codex agents, and individual developers are strictly forbidden from executing local releases.

The authoritative release flow is strictly:
```text
Release Decision (Governance HOLD -> RELEASE)
        ↓
Explicit Release Please PR Merge on GitHub
        ↓
Release Please creates Version Commit & Git Tag
        ↓
GitHub Release created automatically
        ↓
GitHub Actions triggers publish job (ci.yml / release-please.yml)
        ↓
Automated test & dry-run package validation
        ↓
npm Publication via Trusted Publisher token
```

---

## 8. Post-Release Verification & Recovery

After a release workflow completes, verify:
1. GitHub Release exists and matches the Git tag (`vX.Y.Z`).
2. Published npm package version exists on registry.
3. Package version matches `CHANGELOG.md` and `.release-please-manifest.json`.
4. Installed package contains built artifacts (`dist/`, `docs/`, `README.md`, `LICENSE`).

### Failure Recovery Policy
- Published npm packages and Git tags are **immutable**.
- If a release job fails midway or a bad package is published, **NEVER** overwrite existing npm versions or rewrite tags.
- Fix the issue on `main` and execute a new PATCH release.
