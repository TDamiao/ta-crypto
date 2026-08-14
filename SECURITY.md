# Security Policy

`ta-crypto` takes supply-chain security, deterministic correctness, and release integrity seriously.

## Supported Versions

Only the latest release line receives active security updates and vulnerability fixes.

| Version | Supported          |
| ------- | ------------------ |
| 0.4.x   | :white_check_mark: |
| < 0.4   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability or supply-chain defect in `ta-crypto`, please do **not** open a public issue.

Instead, please report security concerns privately through:
- **GitHub Private Vulnerability Reporting**: Open an advisory draft under the [Security Advisories](https://github.com/TDamiao/ta-crypto/security/advisories) tab of the repository.
- **Maintainer Contact**: `thiagodamiaosoares@gmail.com`

Please provide:
1. Description of the vulnerability or supply-chain concern.
2. Steps or proof-of-concept to reproduce the behavior.
3. Potential impact on downstream consumers.

You will receive an initial response acknowledging receipt within 48 hours. If confirmed, a fix will be developed in a private security advisory branch and published as a patch release.

## Supply-Chain Security & Release Integrity

`ta-crypto` enforces strict supply-chain controls:
1. **Zero Runtime Dependencies**: The published npm package has 0 production dependencies (`dependencies: {}`).
2. **Immutable Action Pinning**: All GitHub Actions workflows pin third-party actions to immutable 40-character commit SHAs. Pinned references are tracked by Dependabot and verified by automated CI gates (`npm run check:actions`).
3. **Least-Privilege Permissions**: Workflows default to `contents: read`. Elevated permissions are scoped strictly per job (e.g. `id-token: write` for OIDC release publication).
4. **npm Trusted Publishing & OIDC**: Releases use OpenID Connect (OIDC) identity federation between GitHub Actions and npm, eliminating long-lived npm tokens.
5. **Cryptographic Provenance**: Published packages include verifiable SLSA provenance attestations signed by npm/Sigstore.
6. **Software Bill of Materials (SBOM)**: Every release generates canonical SPDX 2.3 and CycloneDX 1.5 SBOMs matching the exact packed `.tgz` artifact.
