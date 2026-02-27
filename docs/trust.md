# Trust and Verification

This page summarizes how to verify `ta-crypto` behavior and release integrity.

## What is verified before release

- Build and tests across Node versions (CI matrix).
- Golden parity checks for core indicators.
- Compatibility checks against external references.
- Typed API contracts and input validation behavior.

Primary workflow:
- `.github/workflows/ci.yml`

## Compatibility trust model

Policy source:
- `scripts/compat-policy.json`

Rules:
- Reference series are aligned to equal length before comparison.
- Indicator-specific burn-in is applied before measuring differences.
- Blocking references: `TA-Lib`, `technicalindicators`.
- Non-blocking telemetry: `pandas-ta` (environment dependent).

Related scripts:
- `scripts/export-compat-vectors.js`
- `scripts/compare-technicalindicators.js`
- `scripts/compare-python-refs.py`

## How to verify locally

```bash
npm ci
npm run build
npm test
npm run test:golden
npm run test:compat:technicalindicators
# python deps: pip install -r scripts/requirements-compat.txt
npm run test:compat:python
```

## Release traceability

- Changelog history: `CHANGELOG.md`
- Git tags and releases: GitHub Releases page
- Current stable line: `v0.3.0`

Recommended verification checks:
1. Confirm release tag exists and matches expected commit.
2. Confirm CI run on `main` is green for the release commit.
3. Confirm compatibility scripts pass in CI logs.

## Limitations and transparency

- Some reference libraries differ in warmup semantics; comparisons use overlapping non-null windows.
- Python reference checks depend on environment packages (`TA-Lib`, `pandas-ta`).
- Crypto orderflow proxies are candle-derived and not equivalent to L2/L3 order book signals.
