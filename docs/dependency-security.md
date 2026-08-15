# Dependency Security Policy & Review Governance

`ta-crypto` maintains a zero-runtime-dependency core and enforces an automated, policy-driven vulnerability gate across development, build, test, and release toolchains.

---

## 1. Dependency Inventory & Classification

All dependencies in the repository are explicitly categorized by lifecycle role:

| Category | Packages / Tools | Scope | Enters Published Tarball? | Criticality |
|---|---|---|---|---|
| **Runtime** | *None* (`dependencies: {}`) | Production | Yes (core code) | **Highest**: 0 runtime dependencies permitted. |
| **Build** | `typescript`, `rimraf` | Dev / Compile | No (`dist/` only) | **High**: Compiles TS to ESM and cleans build output. |
| **Test & Compat (npm)** | `technicalindicators` | Dev / Testing | No | **Medium**: Golden fixture and parity validation. |
| **Test & Compat (Python)** | `numpy`, `pandas`, `pandas-ta`, `TA-Lib` | CI / Scripts | No | **Medium**: Python reference comparisons. |
| **Release Automation** | `release-please-action` | GitHub Actions | No | **High**: Pinned by immutable 40-character commit SHA. |

---

## 2. Approved Severity Policy & Blocking Rules

The repository enforces an automated security gate (`npm run security:audit`) based on vulnerability severity:

```text
┌──────────────┬──────────────────┬────────────────────────────────────────────────────────┐
│ Severity     │ CI/Release Gate  │ Policy & Exception Rules                               │
├──────────────┼──────────────────┼────────────────────────────────────────────────────────┤
│ CRITICAL     │ BLOCKS           │ Immediate block. No normal exception permitted.       │
│ HIGH         │ BLOCKS           │ Blocks unless a valid, unexpired exception exists.      │
│ MODERATE     │ PASS (LOGGED)    │ Non-blocking; logged and evaluated in audit report.    │
│ LOW          │ PASS (TRACKED)   │ Non-blocking; reviewed periodically.                   │
└──────────────┴──────────────────┴────────────────────────────────────────────────────────┘
```

---

## 3. Temporary Exception Process for High Vulnerabilities

If an upstream vulnerability cannot be fixed immediately without breaking changes or while waiting for an upstream patch, a temporary exception may be recorded in [`security/audit-exceptions.json`](../security/audit-exceptions.json).

### Exception Rules:
1. **Severity Restriction**: Only `high` severity findings may be excepted. `critical` findings **cannot** be excepted.
2. **Maximum Duration**: At most **30 days** (`expiresAt - createdAt <= 30 days`).
3. **Automatic Expiration Enforcement**: When the current date exceeds `expiresAt`, the gate automatically invalidates the exception and restores blocking behavior in CI.
4. **Mandatory Documentation**: Every entry must declare:
   - `advisoryId`: The GHSA or CVE identifier.
   - `package`: The affected package name.
   - `severity`: Must be `"high"`.
   - `scope`: Dependency scope (e.g. `"dev"`, `"build"`).
   - `reachability`: Explanation of code execution paths (e.g. `"unreachable in production runtime; limited to local build"`).
   - `impact`: Assessment of local risk.
   - `justification`: Rationale for temporary exception.
   - `owner`: Named maintainer responsible for resolution.
   - `createdAt` / `expiresAt`: ISO 8601 timestamps.
   - `trackingIssue`: GitHub Issue tracking permanent remediation.

---

## 4. Automated Execution & Verification

### Local Commands:
```bash
# Run security audit gate
npm run security:audit

# Run full pre-release validation (actions check, security audit, docs check, tests, compat, regression benchmark, pack)
npm run release:check
```

### Machine-Readable Audit Evidence & CI Retention:
The gate writes `security-audit-report.json`, which is automatically captured and retained as a CI build artifact (`security-audit-report-node-<version>` with 30-day retention even upon audit failure) containing:
- Exact evaluation timestamp
- System toolchain metadata (Node version, platform)
- Full list of advisories, severities, affected package ranges, dependency nodes (paths in `node_modules`), and effects (dependents)
- Evaluated temporary exceptions and their validation status
- Final pass/fail outcome

---

## 5. Python Compatibility Dependencies

Python dependencies used for reference parity testing are declared in [`scripts/requirements-compat.txt`](../scripts/requirements-compat.txt):
- `numpy>=1.26`
- `pandas>=2.2`
- `pandas-ta>=0.3.14b`
- `TA-Lib>=0.4.28`

**Policy & Review Cadence**:
- **Scope**: Strictly isolated to CI reference parity validation (`npm run test:compat:python`).
- **Isolation**: Python packages do not enter the published npm package and do not execute in Node.js production runtime.
- **Review Cadence**: Managed automatically via weekly Dependabot updates (`package-ecosystem: "pip"`, directory: `/scripts`).

---

## 6. Dependabot & Proactive Updates

Automated dependency updates are managed via [`.github/dependabot.yml`](../.github/dependabot.yml):
- **Ecosystems**:
  - `github-actions` (directory: `/`, schedule: weekly)
  - `npm` (directory: `/`, schedule: weekly)
  - `pip` (directory: `/scripts`, schedule: weekly)
- **Governance**: Security advisories and patch/minor updates are prioritized; major upgrades require explicit maintainer review and full regression validation.
