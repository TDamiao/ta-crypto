# Contributing to ta-crypto

Thanks for contributing.

## Highest impact first

If you want to contribute but don't know where to start, pick an indicator from the roadmap and add tests comparing with TA-Lib.

Prioritized contribution types:
1. New indicators (batch or stateful/streaming).
2. Golden and compatibility tests (TA-Lib, pandas-ta, technicalindicators).
3. Benchmarks and performance improvements.
4. Real-world examples and playbooks.
5. Documentation clarity and API ergonomics.

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

### Examples

1. Add practical files in `examples/`.
2. Keep examples runnable and focused on one idea per file.

### Docs

1. Improve `README.md`, comments, and usage snippets.
2. Keep docs aligned with current exports and behavior.

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
