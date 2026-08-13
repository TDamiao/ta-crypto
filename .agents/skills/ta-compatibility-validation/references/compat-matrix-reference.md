# Compatibility Policy & Reference Matrix for ta-crypto

This reference details the compatibility validation system configured in `scripts/compat-policy.json`.

---

## 1. Compatibility Policy Source

`scripts/compat-policy.json` is the **sole source of truth** for compatibility testing.

```json
{
  "version": 1,
  "indicators": {
    "sma": { "tolerance": 1e-10, "burnIn": 14 },
    "ema": { "tolerance": 1e-10, "burnIn": 14 },
    "rsi": { "tolerance": 5e-2, "burnIn": 28 },
    "macd": { "tolerance": 2e-2, "burnIn": 80 },
    "bbands": { "tolerance": 1e-10, "burnIn": 20 },
    "atr": { "tolerance": 1.5e-1, "burnIn": 56 },
    "adx": { "tolerance": 1.5, "burnIn": 90 }
  },
  "rules": {
    "alignment": "left-pad reference series with null/NaN to full length and compare only overlapping non-null points",
    "blockingReferences": ["TA-Lib", "technicalindicators"],
    "nonBlockingReferences": ["pandas-ta"]
  }
}
```

---

## 2. Reference Classification

| Reference Library | Category | CI Behavior | Script |
| --- | --- | --- | --- |
| `technicalindicators` | **Blocking** | Fails CI job on mismatch | `scripts/compare-technicalindicators.js` |
| `TA-Lib` | **Blocking** | Fails CI job on mismatch | `scripts/compare-python-refs.py` |
| `pandas-ta` | **Non-Blocking Telemetry** | Warns on mismatch / missing env; does not block release | `scripts/compare-python-refs.py` |

---

## 3. Alignment & Burn-In Rules

1. **Left-Padding**: External libraries often return arrays without leading `null` values (truncated array length). The comparator scripts left-pad reference arrays with `null`/`NaN` to match `ta-crypto` input length.
2. **Burn-In Period**: RMA/EMA smoothing algorithms converge over time when seeded differently. Comparisons evaluate values only AFTER `burnIn` indices:
   - SMA / EMA (14): Burn-in = 14
   - BBANDS (20): Burn-in = 20
   - RSI (14): Burn-in = 28 ($2 \times \text{period}$)
   - MACD (12, 26, 9): Burn-in = 80
   - ATR (14): Burn-in = 56 ($4 \times \text{period}$)
   - ADX (14): Burn-in = 90
3. **Overlapping Non-Null Comparison**: Points are compared only when both `ta-crypto` output and reference output are non-null finite numbers.

---

## 4. Golden Fixtures vs External References

- **Golden Fixtures** (`test/fixtures/golden.json`, tested via `npm run test:golden`): Lock current `ta-crypto` output to prevent unintended internal regressions. They do NOT prove independent formula correctness.
- **External References** (`scripts/compare-*.js`, tested via `npm run test:compat`): Validate `ta-crypto` against established external implementations (`TA-Lib`, `technicalindicators`).

---

## 5. Exporting Vector Snapshots

When exporting compatibility vectors for external comparison scripts:
```bash
npm run generate:compat
```
This executes `scripts/export-compat-vectors.js` which builds `dist/` and writes vector files embedding `compat-policy.json` metadata.
