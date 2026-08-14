# Release Verification Checklist & Recovery Procedures for ta-crypto

This reference details the release verification rules and Release Please automation boundaries for `ta-crypto`.

---

## 1. Release Authority & Policy

- **Single Release Authority**: [Release Please](../../../../.github/workflows/release-please.yml) and GitHub Actions are the **ONLY** release authority.
- **Strict Prohibition**: Codex and local developers must NEVER:
  - Manually bump versions in `package.json` or `.release-please-manifest.json`.
  - Create manual git tags (e.g. `v0.4.0`).
  - Publish manually to npm (`npm publish`).
  - Create manual GitHub Releases.
- **Commit Conventional Standard**: Only Conventional Commit messages (`fix:`, `feat:`, `docs:`, `perf:`, `refactor:`) trigger Release Please PR generation on `main`.

---

## 2. Mandatory Pre-Release Audit Ladder

Perform these 7 audit checks before declaring a PR or commit ready to merge to `main`:

### 1. Working Tree Cleanliness
`git status` must confirm no untracked scratch files, temporary logs, or uncommitted modifications remain.

### 2. Package Manifest Validation
Verify `package.json`:
- `name`: `"ta-crypto"`
- `type`: `"module"`
- `exports` map accurately points to existing `.d.ts` and `.js` files in `dist/`.
- `dependencies`: MUST BE EMPTY `{}`. No runtime dependencies permitted.

### 3. Test Suite Execution
`npm test` must compile TypeScript and pass all contract assertions.

### 4. Golden Regression Suite
`npm run test:golden` must pass without numerical drift.

### 5. External Compatibility Checks
`npm run test:compat:technicalindicators` (and Python checks if available) must pass clean within policy tolerances.

### 6. Packaging Dry-Run (`npm pack --dry-run`)
Inspect tarball contents via `npm pack --dry-run`.
- **Included**: `dist/`, `docs/`, `README.md`, `LICENSE`, `package.json`.
- **Excluded**: `src/`, `test/`, `.github/`, `.agents/`, `scripts/`, `examples/`, `tsconfig.json`.

### 7. Documentation & Version Sync
Confirm `README.md`, `docs/trust.md`, and `docs/` pages reference correct stable version annotations and state limitations accurately.

---

## 3. Failure Recovery Boundaries

If a release workflow fails in GitHub Actions after a tag has been created:
1. Do **NOT** attempt to delete or move the immutable git tag or publish directly from local.
2. Fix the underlying CI failure cause in a new conventional commit on `main`.
3. Re-run the failed GitHub Actions job or allow Release Please to draft a patch release.
