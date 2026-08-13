---
name: ta-documentation-sync
description: Keep README.md, focused docs pages, package exports, and runnable examples synchronized with shipped ta-crypto behavior. Trigger when modifying public APIs, updating documentation contracts, or adding examples.
---

# Documentation Sync Skill

This skill ensures documentation accurately mirrors shipped code exports, contracts, and release automation in `ta-crypto`.

---

## 1. Documentation Architecture & Ownership Boundaries

`ta-crypto` divides documentation into strict functional tiers:

```text
README.md                    <- Concise capability surface, quickstart, navigation index
docs/
├── inputs.md               <- Candle types, aliases (o/h/l/c/v/t), normalization rules
├── indicators.md           <- Classic batch indicators, output shapes, warmup index table
├── crypto.md               <- Funding, session VWAP, volatility regime, orderflow proxies
├── stateful.md             <- Streaming APIs (createSMA, createEMA, etc.), reset behavior
├── compatibility.md        <- External matrix, tolerances, burn-in periods, TA-Lib rules
├── trust.md                <- CI checks, Release Please flow, recovery boundaries, limitations
└── rolling-engine.md       <- Internal rolling primitives complexity & invariants
examples/                    <- Runnable Node.js ESM strategy & verification scripts
```

---

## 2. Invariants & Guardrails

1. **Exports Synchronization**: Every function documented in `docs/` MUST be exported by `src/index.ts` and mapped in `package.json` `exports`:
   - `ta-crypto` (root)
   - `ta-crypto/indicators`
   - `ta-crypto/crypto`
   - `ta-crypto/candles`
   - `ta-crypto/stateful`
2. **Roadmap Boundary**: NEVER document a planned API (e.g. backtest engine, screener, resampling) as an existing function. Planned features belong exclusively in `ROADMAP.md`.
3. **Supply-Chain Integrity**: NEVER document unverified security or supply-chain controls (e.g., claiming npm provenance or SBOM attestations before issue [#41](https://github.com/TDamiao/ta-crypto/issues/41) is completed and verified).
4. **Warmup & Null Transparency**: Every indicator entry in `docs/indicators.md` or `docs/crypto.md` MUST explicitly detail:
   - Input requirements
   - Return shape
   - First non-null output index formula
   - Edge case / null behavior (e.g., zero volume handling)
5. **Runnable Examples**: Example scripts in `examples/` MUST be valid ESM Node.js scripts executed by `npm run example:all`.

---

## 3. Workflow for Documentation Updates

When adding or modifying a feature:

### Step 1: Update Focused Document in `docs/`
- Locate the relevant Markdown page in `docs/`.
- Update signature, return types, warmup rules, and limitation notes.

### Step 2: Update Warmup Reference Table
If adding or changing an indicator, update the Warmup Reference Table in `docs/indicators.md`:
| Function | Default parameters | First potentially non-null index | Notes |

### Step 3: Update `README.md` Capability Matrix
If the public capability surface changed, update the summary table in `README.md`. Keep `README.md` high-level and concise.

### Step 4: Verify Runnable Examples
- If an example script in `examples/` is affected, update it.
- Run `npm run example:all` to verify all examples execute without errors.

---

## 4. Validation

Run example verification:
```bash
npm run build
npm run example:all
```
Inspect diff:
```bash
git diff docs/ README.md examples/
```
