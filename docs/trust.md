# Trust and verification

This page describes the checks, release process, and limitations of `ta-crypto@0.3.4`.

## Current stable release

- Package version: `0.3.4`
- Git tag: `v0.3.4`
- Changelog entry: [`CHANGELOG.md`](../CHANGELOG.md)

When verifying an installation, confirm that the npm version, Git tag, release commit, and changelog entry agree.

## What CI verifies

The primary workflow is [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). It runs:

- builds and tests across the supported Node.js matrix;
- golden regression tests for selected indicators;
- external compatibility checks;
- typed input and runtime contract tests.

Release workflows repeat build, test, and compatibility checks before publication.

## Compatibility model

The source of truth for tolerance, burn-in, alignment, and blocking references is [`scripts/compat-policy.json`](../scripts/compat-policy.json).

- TA-Lib and `technicalindicators` are blocking references for the current matrix.
- pandas-ta is non-blocking telemetry because availability and behavior can vary by environment.
- Comparisons use overlapping non-null points after indicator-specific burn-in.
- Golden fixtures detect project regressions but are not independent formula proof.

See [Compatibility](compatibility.md) for the complete matrix and ATR/ADX initialization notes.

## Verify locally

```bash
npm ci
npm test
npm run test:golden
npm run test:compat:technicalindicators
```

For Python references:

```bash
python -m pip install -r scripts/requirements-compat.txt
npm run test:compat:python
```

CI uses Linux and Python 3.12 for the full Python reference job. TA-Lib and pandas-ta availability may differ locally.

## Release traceability

Useful evidence:

- [Changelog](../CHANGELOG.md)
- [GitHub releases](https://github.com/TDamiao/ta-crypto/releases)
- [npm package](https://www.npmjs.com/package/ta-crypto)
- [CI workflow](../.github/workflows/ci.yml)
- [Compatibility policy](../scripts/compat-policy.json)

GitHub Actions and [Release Please](../.github/workflows/release-please.yml) are the single release authority:

1. A qualifying conventional commit on `main` creates or updates one Release PR.
2. The Release PR contains the package version, manifest, lockfile, and changelog changes.
3. Merging the Release PR creates the matching Git tag and GitHub Release.
4. The workflow checks out that tag, installs locked dependencies, and runs tests, compatibility checks, and `npm pack --dry-run`.
5. The workflow publishes to npm only when that exact version is not already present.

Local commands do not create release commits, tags, GitHub Releases, or npm publications. `npm run release:check` is the supported local validation and dry-run entry point.

If validation or npm publication fails after the tag and GitHub Release exist, fix the external cause and rerun only the failed GitHub Actions jobs. The npm version check prevents a rerun from attempting to overwrite an existing version. Published npm versions and Git tags are immutable recovery boundaries; corrections require a new patch release.

npm Trusted Publishing, provenance, and SBOM work is tracked in [issue #41](https://github.com/TDamiao/ta-crypto/issues/41). Do not claim those controls are active before that issue is completed and verified.

## Known limitations

- Some external libraries use different warmup and initialization conventions.
- External compatibility currently covers a subset of exported indicators and fixtures.
- `percentReturn(values, { cumulative: true })` compounds cumulative return in v0.4 ([issue #27](https://github.com/TDamiao/ta-crypto/issues/27)). Arithmetic summation is available via `sumPeriodicReturns` or `{ mode: "sum" }`. The deprecated boolean signature is supported with compound semantics during the v0.4 migration window.
- `logReturn`, `realizedVolatility`, and `volatilityRegime` enforce strictly positive prices ($P_t > 0$) in v0.4 ([issue #28](https://github.com/TDamiao/ta-crypto/issues/28)). NATR positive close domain validation is being hardened in [#29](https://github.com/TDamiao/ta-crypto/issues/29).
- Candle-derived orderflow functions are not L2/L3 order-book analytics.
- Backtesting, built-in strategies, screeners, broad adapters, resampling, and complete multi-timeframe support are not current features.

Trust claims in project documentation should point to a real test, policy, workflow, tag, or artifact. Roadmap intentions are not release evidence.
