# Indicators

This page documents the batch indicators exported by `ta-crypto`. Outputs are aligned to the input length and use `null` during warmup.

All period-bearing APIs strictly enforce positive integer parameters (`period >= 1`). Fractional, non-positive, NaN, and infinite periods are rejected with explicit errors ([issue #30](https://github.com/TDamiao/ta-crypto/issues/30)).

## Output shapes

Most functions return `Array<number | null>`. Multi-output indicators return aligned objects:

```ts
const bands = bbands(close, 20, 2);
// { basis, upper, lower }

const result = macd(close, 12, 26, 9);
// { macd, signal, histogram }

const trend = adx(high, low, close, 14);
// { adx, plusDI, minusDI }
```

## Warmup reference

`period` below means the period supplied to the function. The index is zero-based.

| Function | Default parameters | First potentially non-null index in v0.3.4 | Notes |
| --- | --- | --- | --- |
| `sma` | 14 | `period - 1` | Simple rolling mean. |
| `ema` | 14 | `period - 1` | Seeded with the first-period mean. |
| `rma` | 14 | `period - 1` | Wilder-style moving average. |
| `hl2`, `hlc3`, `ohlc4` | none | `0` | No warmup. |
| `vwap` cumulative | no period | `0` | Returns `null` while cumulative volume is zero. |
| `vwap` periodic | supplied period | `period - 1` | Returns `null` when window volume is zero. |
| `bbands` | 20, 2 | `period - 1` | Population standard deviation. |
| `rsi` | 14 | `period` | Wilder smoothing after price differences. |
| `macd.macd` | 12, 26, 9 | `slow - 1` | Difference between fast and slow EMA. |
| `macd.signal` | 12, 26, 9 | `signal - 1` | Current implementation seeds from zero-filled MACD warmup values. |
| `macd.histogram` | 12, 26, 9 | `slow - 1` with defaults | Requires both MACD and signal values. Use compatibility burn-in for external comparison. |
| `stoch.k` | 14 | `kPeriod - 1` | Zero when the high-low range is zero. |
| `stoch.d` | 14, 3 | `kPeriod + dPeriod - 2` | Mean of valid K values. |
| `trueRange` | none | `0` | First value is `high[0] - low[0]`. |
| `atr` | 14 | `period - 1` | RMA of true range. |
| `natr` | 14 | `period - 1` | `ATR / close * 100`; see domain warning below. |
| `logReturn` | cumulative false | `1` | Natural log of consecutive price ratios. |
| `percentReturn` | cumulative false | `1` | Consecutive simple return (periodic) or compounded cumulative return. |
| `sumPeriodicReturns` | none | `1` | Arithmetic sum of periodic simple returns. |
| `realizedVolatility` | 30, 365 | `period` | Population deviation of log returns, annualized by square root. |
| `obv` | none | `0` | Starts at zero. |
| `mfi` | 14 | `period` | Needs a previous typical price plus a full flow window. |
| `adx`, `plusDI`, `minusDI` | 14 | `period - 1` | Current initialization differs from conventional TA-Lib warmup. |

## Overlap and momentum

```ts
import { bbands, ema, macd, rsi, sma, stoch } from "ta-crypto/indicators";

const average = sma(close, 20);
const trend = ema(close, 20);
const strength = rsi(close, 14);
const convergence = macd(close, 12, 26, 9);
const bands = bbands(close, 20, 2);
const oscillator = stoch(high, low, close, 14, 3);
```

## Volatility and trend

```ts
import { adx, atr, natr, realizedVolatility, trueRange } from "ta-crypto/indicators";

const ranges = trueRange(high, low, close);
const averageRange = atr(high, low, close, 14);
const normalizedRange = natr(high, low, close, 14);
const annualized = realizedVolatility(close, 30, 365);
const directional = adx(high, low, close, 14);
```

ATR and ADX are compared with external libraries only after indicator-specific burn-in. This accounts for initialization differences; it does not mean the first emitted values are interchangeable across libraries. See [Compatibility](compatibility.md).

`natr` calculates normalized average true range ($\frac{ATR}{close} \times 100$) and enforces a strictly positive close price domain ($close > 0$) starting in v0.4 ([issue #29](https://github.com/TDamiao/ta-crypto/issues/29)). Non-positive or non-finite closing prices are rejected with index-aware errors before division.

## Returns

```ts
import { logReturn, percentReturn, sumPeriodicReturns } from "ta-crypto/indicators";

// Periodic simple returns (values[i] / values[i-1] - 1)
const periodicSimple = percentReturn(close);
const periodicExplicit = percentReturn(close, { mode: "periodic" });

// Compounded cumulative return (values[i] / values[0] - 1)
const cumulativeCompound = percentReturn(close, { cumulative: true });
const cumulativeMode = percentReturn(close, { mode: "compound" });

// Arithmetic summation of periodic returns (r_1 + r_2 + ... + r_i)
const arithmeticSum = percentReturn(close, { mode: "sum" });
const explicitSum = sumPeriodicReturns(close);

// Log returns
const periodicLog = logReturn(close);
const cumulativeLog = logReturn(close, true);
```

### Cumulative Return Semantics & Migration Guide

Starting in v0.4, cumulative simple returns follow standard financial compounding semantics:

- `percentReturn(values, { cumulative: true })` or `percentReturn(values, { mode: "compound" })` calculates compounded cumulative return ($P_t / P_0 - 1$).
- `sumPeriodicReturns(values)` or `percentReturn(values, { mode: "sum" })` calculates arithmetic summation ($\sum r_i$).
- `logReturn(values, true)` calculates cumulative log returns ($\sum \ln(P_t / P_{t-1}) = \ln(P_t / P_0)$).

#### Numerical Example

For prices `[100, 110, 121]`:
- **Periodic returns**: `[null, 0.10, 0.10]` (+10% and +10%)
- **Compounded cumulative return**: `[null, 0.10, 0.21]` (+21% total return: $(1+0.10)(1+0.10) - 1 = 0.21$)
- **Arithmetic sum of returns**: `[null, 0.10, 0.20]` (+20% sum: $0.10 + 0.10 = 0.20$)

#### Deprecation & Migration Path

| Old Signature (v0.3.4) | New Equivalent API (v0.4+) | Semantics |
| --- | --- | --- |
| `percentReturn(prices, false)` | `percentReturn(prices)` or `percentReturn(prices, { mode: "periodic" })` | Periodic simple return |
| `percentReturn(prices, true)` *(arithmetic in v0.3.4)* | `percentReturn(prices, { cumulative: true })` or `{ mode: "compound" }` | **Compounded cumulative return** (breaking correction) |
| `percentReturn(prices, true)` *(if arithmetic sum needed)* | `sumPeriodicReturns(prices)` or `percentReturn(prices, { mode: "sum" })` | Arithmetic summation |

> **API Lifecycle Notice**: Passing a boolean argument (`cumulative: boolean`) to `percentReturn` is **deprecated** in v0.4. During the v0.4 migration window, passing `true` invokes compounded cumulative return. The boolean signature is scheduled for complete removal in `v1.0.0`.

### Positive Price Domain Validation

In financial mathematics, the logarithm of non-positive numbers ($\ln(0)$ or $\ln(x)$ for $x < 0$) is undefined in real numbers. Starting in v0.4 ([issue #28](https://github.com/TDamiao/ta-crypto/issues/28)):

- `logReturn`, `realizedVolatility`, and `volatilityRegime` enforce a strictly positive price domain ($P_t > 0$).
- Passing zero ($0$), negative numbers, `NaN`, or infinite values throws an immediate, index-aware error (e.g. `values[1] must be a positive number (> 0), got 0`).
- Valid positive prices guarantee that volatility and regime calculations will never emit silent `NaN` or `-Infinity` values.

## Volume

```ts
import { mfi, obv, vwap } from "ta-crypto/indicators";

const cumulativeVwap = vwap(high, low, close, volume);
const rollingVwap = vwap(high, low, close, volume, 20);
const balance = obv(close, volume);
const flow = mfi(high, low, close, volume, 14);
```

Missing volume in candle-object inputs is normalized to zero. Pass explicit volume for volume-dependent indicators when missing data should be rejected instead.

## Compatibility expectations

Golden fixtures protect project behavior from accidental changes. External comparisons use explicit tolerance and burn-in policies. They do not establish exact equivalence for every indicator or every warmup point.

See [Compatibility](compatibility.md) for the current matrix and commands.
