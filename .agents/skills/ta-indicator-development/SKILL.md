---
name: ta-indicator-development
description: Guide implementation of new batch technical indicators or modifications to existing batch indicators in ta-crypto. Trigger when creating or modifying batch indicators, defining input contracts, or updating indicator exports.
---

# Indicator Development Workflow

This skill guides the implementation or modification of batch technical indicators in `ta-crypto`.

## 1. Context Gathering & Reference Verification

Before writing code:
1. **Locate Target Category**: Identify the core module in `src/core/`:
   - `overlap.ts`: Moving averages, bands, price overlays (`sma`, `ema`, `rma`, `hl2`, `hlc3`, `ohlc4`, `vwap`, `bbands`).
   - `momentum.ts`: Oscillators (`rsi`, `macd`, `stoch`).
   - `volatility.ts`: Price range and volatility metrics (`trueRange`, `atr`, `natr`).
   - `performance.ts`: Return metrics (`logReturn`, `percentReturn`, `realizedVolatility`).
   - `volume.ts`: Volume flow indicators (`obv`, `mfi`).
   - `trend.ts`: Directional indicators (`adx`).
   - `crypto.ts`: Crypto utilities (`vwapSession`, `fundingRateCumulative`, `fundingRateAPR`, `volatilityRegime`, `signedVolume`, `volumeDelta`, `orderflowImbalance`).
2. **Inspect Neighboring Indicators**: Check existing functions in the same module for error handling, validation, and loop structures.
3. **Verify Formula Specification**:
   - Check the GitHub issue description (e.g. v0.4 core hardening issues) or authoritative reference (TA-Lib, Pine Script, standard financial literature).
   - Explicitly separate: (a) raw mathematical formula, (b) initialization seeding convention, (c) warmup null duration, (d) numerical tolerance.
   - Do NOT invent formulas from memory when an authoritative reference exists.

---

## 2. Invariants & Contract Requirements

Every batch indicator in `ta-crypto` MUST enforce:

- **1-to-1 Array Length Preservation**: The output array length MUST equal the input array length ($N$).
- **Null Warmup Semantics**: Indices prior to complete initialization MUST contain `null`. Never drop warmup items or alter array alignment.
- **Input Normalization**:
  - Main API entry points in `src/api.ts` MUST accept primitive price arrays (`number[]`) AND candle object arrays (`Candle[]` / `OHLCVInput`).
  - Helper functions in `src/candles.ts` (`parseHLC`, `parseOHLC`, `toOHLCV`) handle input normalization.
- **Strict Parameter Validation**:
  - Reject non-positive periods (`period <= 0` throws `Error("period must be > 0")`).
  - Reject non-finite input series (`assertFiniteSeries` from `src/core/math.ts`).
  - Validate array lengths match across multi-series inputs (e.g. `high`, `low`, `close` must have identical lengths).
- **Barrels & Exports**:
  - Export core math from `src/core/<category>.ts`.
  - Wire input parsing in `src/api.ts`.
  - Export from modular barrel: `src/indicators.ts` (classic TA) or `src/crypto.ts` (crypto-specific).
  - Export from root barrel: `src/index.ts`.
  - Add TypeScript signatures to `src/types.ts` if needed.

---

## 3. Implementation Step-by-Step

### Step 1: Implement Core Math
Add pure calculation function in `src/core/<category>.ts`:
```ts
export function myIndicator(prices: number[], period = 14): Array<number | null> {
  if (period <= 0) throw new Error("period must be > 0");
  assertFiniteSeries("prices", prices);
  
  const result: Array<number | null> = new Array(prices.length).fill(null);
  if (prices.length < period) return result;

  // Implementation using rolling primitives where applicable
  return result;
}
```

### Step 2: Wire API Layer in `src/api.ts`
Wrap core math with input shape parser:
```ts
export function myIndicator(input: PriceInput, period = 14): Array<number | null> {
  const prices = normalizePrice(input);
  return coreMyIndicator(prices, period);
}
```

### Step 3: Add Unit & Contract Tests
Create or update tests in `test/contracts.test.mjs`:
- Test normal calculation with known inputs.
- Test empty array `[]` returns `[]`.
- Test array length shorter than warmup period returns all `null`.
- Test input validation throws for `period <= 0`, mismatched array lengths, or `NaN`/`Infinity`.
- Verify exact warmup null count.

### Step 4: Golden Vectors & Regression Fixtures
If adding a new indicator or modifying output, update golden fixtures:
```bash
npm run generate:golden
```
Verify `test/fixtures/golden.json` diff and verify `npm run test:golden` passes clean.

### Step 5: Update Documentation
- Add function contract to `docs/indicators.md` or `docs/crypto.md`.
- Include default parameters, return type, first non-null index formula, and known limitations.
- If applicable, update `README.md` capability matrix and add a runnable example under `examples/`.

---

## 4. Validation Ladder

Run in sequence:
```bash
npm run build
npm test
npm run test:golden
```

If adding or updating an external reference indicator:
```bash
npm run test:compat:technicalindicators
```

---

## 5. Completion Criteria

A batch indicator task is complete ONLY when:
1. Core math is implemented in `src/core/` and exported via `src/api.ts` and barrel entries.
2. Output array length equals input length with exact `null` warmup alignment.
3. Unit tests cover normal values, empty inputs, short inputs, invalid periods, and non-finite numbers.
4. Golden fixtures are updated and `npm run test:golden` succeeds.
5. Documentation in `docs/` is synchronized.
