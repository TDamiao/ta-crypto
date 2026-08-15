# Trust and verification

This page describes the checks, release process, and limitations of `ta-crypto`.

## Current stable release line

- Release line: `v0.4`
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
- [Security policy](../SECURITY.md)
- [Dependency security policy](dependency-security.md)
- [Release policy](release-policy.md)
- [GitHub releases](https://github.com/TDamiao/ta-crypto/releases)
- [npm package](https://www.npmjs.com/package/ta-crypto)
- [CI workflow](../.github/workflows/ci.yml)
- [Compatibility policy](../scripts/compat-policy.json)

GitHub Actions and [Release Please](../.github/workflows/release-please.yml) are the single release authority:

1. A qualifying conventional commit on `main` creates or updates one Release PR.
2. The Release PR contains the package version, manifest, lockfile, and changelog changes.
3. Merging the Release PR creates the matching Git tag and GitHub Release.
4. The workflow checks out that tag, installs locked dependencies, runs tests, compatibility checks, and builds the distribution.
5. The workflow packs the exact `.tgz` artifact and generates canonical SPDX 2.3 and CycloneDX 1.5 SBOMs.
6. The workflow validates tag alignment, package version, checksums, and tests against duplicate npm publication.
7. The workflow uploads the tarball and SBOMs as immutable release artifacts.
8. The workflow publishes to npm via **npm Trusted Publishing** (OIDC identity federation) with cryptographic provenance attestations.

Local commands do not create release commits, tags, GitHub Releases, or npm publications. `npm run release:check` is the supported local validation and dry-run entry point.

### Supply-Chain Security & Provenance Verification

`ta-crypto` enforces verifiable supply-chain security:

- **npm Trusted Publishing (OIDC)**: npm authenticates publication requests directly against GitHub's OpenID Connect identity provider using short-lived tokens generated per workflow run (`id-token: write`) under the protected GitHub Environment `npm-publish` (`TDamiao/ta-crypto`, workflow: `.github/workflows/release-please.yml`, environment: `npm-publish`). No permanent npm tokens are used in the publication workflow.
- **Cryptographic Provenance (SLSA)**: Packages are published with `--provenance`. Consumers can inspect the cryptographic attestation linking the published tarball to the exact GitHub repository, commit SHA, workflow (`.github/workflows/release-please.yml`), environment (`npm-publish`), and tag.
- **How Consumers Verify Provenance**:
  ```bash
  # Verify provenance and signatures via npm CLI
  npm audit signatures
  ```
- **Software Bill of Materials (SBOM)**: Every release generates canonical SPDX 2.3 (`ta-crypto-<version>.sbom.spdx.json`) and CycloneDX 1.5 (`ta-crypto-<version>.sbom.cdx.json`) SBOMs capturing exact artifact SHA-256/SHA-512 hashes, licensing, and package contents.
- **Immutable GitHub Actions Pinning**: All GitHub Actions in `.github/workflows/*.yml` are pinned to immutable 40-character commit SHAs with version comments, continuously enforced by `npm run check:actions` and updated via Dependabot.
- **Automated Dependency Audit Gate**: CI and release pipelines execute `npm run security:audit`. Critical vulnerabilities and unexcepted High vulnerabilities block publication immediately. Full policy is detailed in [Dependency Security Policy](dependency-security.md).

### Environment Protection Rules (`npm-publish`)

To ensure that npm publications occur exclusively through deliberate maintainer authorization, the repository configures the following protection rules on `GitHub → Settings → Environments → npm-publish`:

1. **Required Reviewers**: **Enabled** (designated reviewer: maintainer `@TDamiao`). Every deployment to `npm-publish` pauses and requires explicit manual human approval in the GitHub Actions UI before the publication job executes.
2. **Allow Administrators to Bypass**: **Disabled** (unchecked). All publication runs, regardless of user role, must go through the formal environment approval gate.
3. **Wait Timer**: **Disabled** (0 minutes).
4. **Environment Secrets**: **None** (0 secrets needed; publishing uses pure OIDC identity federation).
5. **Deployment Branches and Tags**: **Restricted to `main`**.
   - *Rationale*: Release Please triggers on `push` to `main` and then checks out the release tag within the job. Restricting the environment to `main` ensures that only release runs originating from the canonical branch can request `npm-publish` deployment credentials.
   - *Tag Policy Evaluation*: After the first controlled OIDC release is executed and empirical deployment ref logs are captured, the tag protection rule may be evaluated and hardened.

If validation or npm publication fails after the tag and GitHub Release exist, fix the external cause and rerun only the failed GitHub Actions jobs. The npm version check prevents a rerun from attempting to overwrite an existing version. Published npm versions and Git tags are immutable recovery boundaries; corrections require a new patch release.

## Known limitations

- Some external libraries use different warmup and initialization conventions.
- External compatibility currently covers a subset of exported indicators and fixtures.
- `percentReturn(values, { cumulative: true })` compounds cumulative return in v0.4 ([issue #27](https://github.com/TDamiao/ta-crypto/issues/27)). Arithmetic summation is available via `sumPeriodicReturns` or `{ mode: "sum" }`. The deprecated boolean signature is supported with compound semantics during the v0.4 migration window.
- `logReturn`, `realizedVolatility`, `volatilityRegime`, and `natr` enforce strictly positive prices in v0.4 ([issues #28, #29](https://github.com/TDamiao/ta-crypto/issues/28)). Period-bearing APIs uniformly validate positive integer periods ([issue #30](https://github.com/TDamiao/ta-crypto/issues/30)).
- Candle-derived orderflow functions are not L2/L3 order-book analytics.
- Backtesting, built-in strategies, screeners, broad adapters, resampling, and complete multi-timeframe support are not current features.

Trust claims in project documentation should point to a real test, policy, workflow, tag, or artifact. Roadmap intentions are not release evidence.
