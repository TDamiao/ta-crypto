# Security Policy

`ta-crypto` takes supply-chain security, mathematical correctness, and release integrity seriously. This document outlines supported release lines, the private vulnerability reporting process, and disclosure expectations.

---

## Supported Versions

Security patches and vulnerability remediations are delivered exclusively to active release lines. When a new minor version is released, previous minor versions reach End-of-Life (EOL).

| Release Line | Supported          | Status |
| ------------ | ------------------ | ------ |
| `0.4.x`      | :white_check_mark: | Active development & current target |
| `0.3.x`      | :white_check_mark: | Active maintenance (security fixes until `0.4.0` ships) |
| `< 0.3.0`    | :x:                | End of Life (unsupported) |

---

## Reporting a Vulnerability

If you discover a security vulnerability, mathematical integrity bug affecting financial calculations, or supply-chain defect in `ta-crypto`, please do **not** open a public GitHub issue.

### Private Reporting Channels:

1. **GitHub Private Vulnerability Reporting (Preferred)**:
   - Navigate to the [Security Advisories](https://github.com/TDamiao/ta-crypto/security/advisories) tab of the repository.
   - Click **"Report a vulnerability"** to open a private advisory draft.
2. **Direct Maintainer Contact (Fallback)**:
   - Email: `thiagodamiaosoares@gmail.com`
   - Subject line: `[SECURITY] ta-crypto vulnerability report`

---

## What to Include in a Report

To help us investigate and triage effectively, please provide:
1. **Description**: Clear summary of the vulnerability, bug, or supply-chain concern.
2. **Affected Component**: Affected functions, barrel exports (`ta-crypto`, `ta-crypto/indicators`, etc.), dependencies, or workflows.
3. **Proof of Concept**: Minimal reproducible example, test vector, or step-by-step instructions.
4. **Impact Assessment**: Estimated severity and potential consequences for downstream consumers (e.g. DoS, financial calculation distortion, unauthorized execution).
5. **Proposed Remediation (Optional)**: Suggested fix or patch if available.

---

## Response & Coordinated Disclosure Process

We follow a coordinated vulnerability disclosure workflow:

1. **Acknowledgement**: The maintainer will acknowledge receipt of the report within **48 hours**.
2. **Triage & Assessment**: The report will be investigated to determine validity, affected versions, and severity.
3. **Private Remediation**: Confirmed vulnerabilities will be addressed in a private GitHub advisory workspace without public exposure before a fix is ready.
4. **Release & Advisory**:
   - A patched version will be published to npm following the standard automated release process.
   - A public GitHub Security Advisory will be published with appropriate CVE/GHSA credit.

---

## Scope of Security Concerns

Security reports are welcome for:
- **Core Library & Math**: Calculation vulnerabilities leading to integer overflow, unbounded loops, memory exhaustion, or financial distortion.
- **Dependency & Supply Chain**: Vulnerabilities in build, test, compatibility, or release dependencies governed under the [Dependency Security Policy](docs/dependency-security.md).
- **Release Integrity & Provenance**: Discrepancies in OIDC Trusted Publishing, SLSA provenance attestations, or SBOM metadata.
- **Workflow Security**: Permissions escalation or action pinning concerns in GitHub Actions.

---

## Supply-Chain Security Controls

`ta-crypto` enforces strict supply-chain assurances:
1. **Zero Runtime Dependencies**: The published npm package has 0 production dependencies (`dependencies: {}`).
2. **Immutable Action Pinning**: All GitHub Actions workflows pin third-party actions to immutable 40-character commit SHAs, tracked by Dependabot and verified by `npm run check:actions`.
3. **Least-Privilege Permissions**: Workflows default to `contents: read`. Elevated permissions are scoped strictly per job (e.g. `id-token: write` for OIDC release publication).
4. **npm Trusted Publishing & OIDC**: Releases use OpenID Connect (OIDC) identity federation within the protected GitHub Environment `npm-publish` with required human approval (`@TDamiao`), eliminating long-lived npm tokens.
5. **Cryptographic Provenance**: Published packages include verifiable SLSA provenance attestations signed by npm/Sigstore (`npm audit signatures`).
6. **Software Bill of Materials (SBOM)**: Every release generates canonical SPDX 2.3 and CycloneDX 1.5 SBOMs matching the exact packed `.tgz` artifact.
7. **Automated Dependency Audit Gate**: CI and release pipelines enforce `npm run security:audit`. Critical and unexcepted High findings block builds immediately. See [Dependency Security Policy](docs/dependency-security.md).
