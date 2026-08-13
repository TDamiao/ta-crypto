---
name: ta-code-review
description: Perform high-signal code reviews for ta-crypto PRs and changes. Trigger when conducting code reviews, auditing proposed pull requests, or evaluating pull-request diffs.
---

# Code Review Skill for ta-crypto

This skill guides high-signal, rigorous code reviews for `ta-crypto` pull requests and code modifications.

---

## 1. Review Priority Order

Focus review effort strictly in this prioritized hierarchy. Do NOT spend review bandwidth on formatting or stylistic preferences that auto-formatters enforce.

```text
1. Mathematical Correctness         (Exact formula derivation and seeding)
2. Financial-Domain Correctness     (Log zero/negative, NATR close domain, returns compounding)
3. Public API Stability             (Export signatures, parameter names, types)
4. Batch / Stateful Parity          (Streaming outputs match batch within 1e-10)
5. Warmup & Alignment Preservation  (Null count, 1-to-1 array length match, zero offset shift)
6. Compatibility Regressions       (TA-Lib & technicalindicators compatibility tolerance)
7. Release Integrity                (No version bumps in PRs, conventional commit prefix)
8. Performance Regressions          (O(N*K) window slicing loops, missing rolling primitives)
9. Test Coverage Gaps               (Unit, edge-case, and golden vector test gaps)
10. Documentation Drift             (README, docs/ contract tables out of sync)
11. Maintainability & Type Safety   (Clean TypeScript types, ESM import extension `.js`)
```

---

## 2. High-Risk Inspection Checklist

Aggressively audit these 9 high-risk areas in every code diff:

### 1. Array Boundaries & Edge Inputs
- Does the function handle empty arrays `[]` without throwing exceptions?
- Does it handle short input arrays (`length < period`) by returning an array of `null` values equal to input length?
- Are single-element arrays `[100]` handled gracefully?

### 2. Warmup & Null Alignment
- Is the first emitted valid index exactly matching the documented warmup contract?
- Are leading un-initialized elements strictly set to `null`?

### 3. Financial Domain Guardrails
- **`logReturn`**: Are prices checked for $P \le 0$? (See [#28](https://github.com/TDamiao/ta-crypto/issues/28)).
- **`natr`**: Are closing prices checked for $close \le 0$? (See [#29](https://github.com/TDamiao/ta-crypto/issues/29)).
- **`percentReturn`**: Is cumulative return compounding vs arithmetic summation clear and intentional? (See [#27](https://github.com/TDamiao/ta-crypto/issues/27)).
- **Periods**: Is `period > 0` validated across all entry points? (See [#30](https://github.com/TDamiao/ta-crypto/issues/30)).

### 4. Zero & Division Handling
- Are denominators checked before division? (Volume in VWAP, high-low range in Stochastic, loss in RSI).
- Does division by zero return defined fallbacks (`null`, `0`, or `100`) rather than producing `NaN` or `Infinity`?

### 5. Floating-Point Precision & Non-Finite Propagation
- Are non-finite values (`NaN`, `Infinity`) guarded with `assertFiniteSeries` or `Number.isFinite`?
- Are floating-point calculations using `1e-10` tolerance for assertions?

### 6. Batch vs Stateful Parity
- If modifying a batch function or stateful indicator, do stateful `.next()` calls produce identical values to batch execution?
- Does `.reset()` completely restore stateful objects to pristine condition?

### 7. Performance & Rolling Primitives
- Did the author introduce repeated `.slice()` or inner window loops ($O(N \cdot K)$)?
- Could the calculation use `RollingSum`, `RollingMean`, `RollingStdDev`, `RollingMin`, or `RollingMax` from `src/core/rolling.ts`?

### 8. Exports & ESM Extensions
- Are relative imports using explicit `.js` extensions (e.g. `import { sma } from "./core/overlap.js"`) required for native Node ESM?
- Are new functions exported from `src/index.ts` and modular barrels (`src/indicators.ts`, `src/crypto.ts`, `src/stateful.ts`, `src/candles.ts`)?

### 9. Release Authority Constraints
- Does the PR inappropriately modify `package.json` version, `.release-please-manifest.json`, git tags, or release workflows?

---

## 3. Review Finding Format

Report findings clearly using this template. Include findings ONLY when there is a concrete, plausible failure mode.

```markdown
### Code Review Summary

#### Findings

- **[BLOCKING] Math / Alignment Error**: `src/core/volatility.ts:L45`
  - **Problem**: Output array length is `N - period + 1` instead of `N`.
  - **Why it matters**: Breaks 1-to-1 index alignment invariant and causes array length mismatch downstream.
  - **Fix**: Left-pad output array with `period - 1` `null` values.

- **[WARNING] Missing Input Guard**: `src/core/performance.ts:L12`
  - **Problem**: `logReturn` does not reject non-positive prices ($P \le 0$).
  - **Why it matters**: Passing 0 or negative prices causes `Math.log()` to return `NaN` or `-Infinity`.
  - **Fix**: Add domain check: `if (price <= 0) throw new Error("price must be > 0")`.

- **[NOTE] Missing Unit Test**: `test/contracts.test.mjs:L120`
  - **Problem**: No unit test verifies `.reset()` on the new stateful indicator.
  - **Fix**: Add reset test assertion matching standard stateful suite.
```
