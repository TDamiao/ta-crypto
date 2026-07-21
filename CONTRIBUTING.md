# Contributing to ta-crypto

Thanks for contributing.

## Current release line

`v0.3.2` is the current stable release.
The v0.4 contribution priority is core hardening:
1. Financial semantics and numeric validation.
2. Compatibility and reproducibility depth.
3. Rolling performance with deterministic parity benchmarks.
4. Stateful batch parity and reset coverage.
5. Release, supply-chain, and documentation integrity.

## Highest impact first

If you want to contribute but do not know where to start, select a scoped issue from the v0.4 gate in GitHub issue #21.

Prioritized contribution types:
1. Correctness and edge-case tests.
2. External compatibility evidence (TA-Lib, pandas-ta, technicalindicators).
3. Benchmarks and rolling performance improvements.
4. Stateful/streaming parity for approved indicators.
5. Documentation that matches current exports and behavior.

## Run locally

```bash
npm ci
npm run build
```

Quick validation:

```bash
npm test
```

Full validation matrix:

```bash
npm run test:golden
npm run test:compat:technicalindicators
# python deps: pip install -r scripts/requirements-compat.txt
npm run test:compat:python
npm run bench
npm run bench:rolling
```

## Code standards

1. Keep functions deterministic and side-effect free unless the API is explicitly stateful.
2. Validate numeric inputs and keep error messages specific.
3. Follow existing warmup semantics (`null` for insufficient history).
4. Preserve public API compatibility, or document breaking changes.
5. Add or update tests for every behavior change.
6. Keep TypeScript and ESM style consistent with `src/`.

## Expected contribution tracks

### New indicators

1. Add implementation in `src/core/` (or `src/stateful.ts` for streaming APIs).
2. Export via `src/index.ts` and module barrels if applicable.
3. Add parity tests and golden vectors.

### Benchmarks

1. Extend `scripts/bench.js` with realistic input sizes.
2. Include before/after numbers and methodology in the PR description.
3. For rolling-window changes, preserve the warmup and alignment invariants in `docs/rolling-engine.md`.

### Examples

1. Add practical files in `examples/`.
2. Keep examples runnable and focused on one idea per file.

### Docs

1. Keep `README.md` as a concise navigation and capability index.
2. Put detailed contracts in focused pages under `docs/`.
3. Document only APIs exported by the current package.
4. Include input/output shape, warmup, null behavior, limitations, and a runnable example.
5. Link technical claims to code, tests, compatibility policy, or release evidence.
6. Avoid generic promotional copy and unsupported trust or performance claims.
7. Mark future APIs as roadmap work rather than current capability.

### TA-Lib validation

1. Add fixtures/scripts that compare outputs against TA-Lib.
2. Define tolerance and warmup alignment explicitly.
3. Gate new indicators with compatibility checks where possible.

## Non-code contributions are welcome

You can contribute without touching core math:
1. Write examples or notebooks.
2. Validate outputs with external libraries.
3. Improve README and onboarding docs.
4. Share production usage scripts and edge-case datasets.

## Issues and labels

Use the issue templates in `.github/ISSUE_TEMPLATE/`.
Strategic labels used by this project:
- `good first issue`
- `help wanted`
- `documentation`
- `performance`
- `crypto-specific`

Labels are defined in `.github/labels.yml`.

Each issue should define:
1. Goal
2. Reference implementation/spec
3. Acceptance criteria
4. Test plan

Example issue shape:

Add streaming version of EMA
- Goal: stateful `EMA.next(value)`.
- Reference: TA-Lib EMA.
- Acceptance: matches batch version within tolerance.
