# Indicators

This page documents the batch indicators exported by `ta-crypto@0.3.4`. Outputs are aligned to the input length and use `null` during warmup.

Use positive integer periods. Cross-API period validation is being standardized in [issue #30](https://github.com/TDamiao/ta-crypto/issues/30).

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
| `percentReturn` | cumulative false | `1` | Consecutive simple return. |
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

In v0.3.4, NATR does not reject zero or negative closes before division. Validate close prices as strictly positive until [issue #29](https://github.com/TDamiao/ta-crypto/issues/29) is released.

## Returns

```ts
import { logReturn, percentReturn } from "ta-crypto/indicators";

const periodicLog = logReturn(close);
const cumulativeLog = logReturn(close, true);
const periodicSimple = percentReturn(close);
const currentArithmeticSum = percentReturn(close, true);
```

Important current-version behavior:

- `logReturn(values, true)` sums log returns, which is equivalent to a cumulative log return for valid positive prices.
- `percentReturn(values, true)` in v0.3.4 sums periodic simple returns. It does not compound them.
- v0.4 will make cumulative percent return compound and move arithmetic summation to an explicit API or mode. The boolean signature will be deprecated. See [issue #27](https://github.com/TDamiao/ta-crypto/issues/27).
- `logReturn` does not yet enforce strictly positive prices. Validate them before calling it; see [issue #28](https://github.com/TDamiao/ta-crypto/issues/28).

For `[100, 110, 121]`, the two 10% periodic returns sum to 20%, while the compounded cumulative return is 21%. v0.3.4's `percentReturn(values, true)` returns the arithmetic 20% path.

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
