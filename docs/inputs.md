# Inputs, Candle Normalization & Domain Contracts

This page defines the supported input formats, normalization utilities in `ta-crypto/candles`, and unified financial domain contracts enforced across `ta-crypto`.

---

## 1. Supported Input Shapes

`ta-crypto` indicators accept data in three primary structures:

### A. Flat Numeric Arrays
Single-series indicators accept `number[]`:
```ts
import { rsi, sma } from "ta-crypto";

const closePrices = [100.5, 101.2, 99.8, 102.4];
const rsi14 = rsi(closePrices, 14);
```

### B. Array of Candle Objects
All single-series and multi-series indicators accept arrays of candle objects. Both full property names and compact single-character aliases are supported:

```ts
type Candle = {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  time?: number | string | Date;
} | {
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number;
  t?: number | string | Date;
};
```

When passing candle arrays to single-series indicators (e.g., `sma(candles)`), the indicator automatically extracts `close` (or `c`).

### C. Columnar OHLCV Objects
Multi-series indicators accept columnar dictionary objects containing parallel arrays:

```ts
// Full format
const ohlcv = {
  open: [100, 101],
  high: [105, 106],
  low: [98, 99],
  close: [103, 104],
  volume: [1000, 1200]
};

// Compact alias format
const compact = {
  o: [100, 101],
  h: [105, 106],
  l: [98, 99],
  c: [103, 104],
  v: [1000, 1200]
};
```

---

## 2. Candle Normalization Utilities (`ta-crypto/candles`)

The `ta-crypto/candles` subpath exports lightweight, zero-dependency helpers to extract and normalize candle arrays:

### `toOHLCV(input, volumeFallback = 0)`
Normalizes any candle array or columnar OHLCV object into a canonical `{ open, high, low, close, volume, time }` record of arrays.
```ts
import { toOHLCV } from "ta-crypto/candles";

const normalized = toOHLCV(candles, 0);
// Result:
// {
//   open: number[],
//   high: number[],
//   low: number[],
//   close: number[],
//   volume: number[],
//   time: Array<number | string | Date | undefined>
// }
```

### Individual Pluck Functions
- `pluckOpen(candles: Candle[]): number[]`
- `pluckHigh(candles: Candle[]): number[]`
- `pluckLow(candles: Candle[]): number[]`
- `pluckClose(candles: Candle[]): number[]`
- `pluckVolume(candles: Candle[], fallback = 0): number[]`

### Type Guards and Normalizers
- `isCandleArray(input: PriceInput | OHLCVInput): input is Candle[]`
- `normalizePrice(input: PriceInput, name = "values"): number[]` (extracts close series or validates numeric array)

---

## 3. Financial Domain Contracts & Validation Rules

All functions across the library adhere to unified domain boundaries:

| Data Type / Dimension | Permitted Domain | Rejected Inputs & Errors |
|---|---|---|
| **Standard Prices** | Finite real numbers ($\mathbb{R}$) | `NaN`, `Infinity`, `-Infinity`, strings, undefined $\to$ throws error. |
| **Strict Positive Prices** | Strictly positive ($P_t > 0$) for `logReturn`, `realizedVolatility`, `volatilityRegime`, `natr` | $P_t \le 0$, `NaN`, `Infinity` $\to$ throws index-aware error (e.g. `values[2] must be a positive number (> 0), got 0`). |
| **Volume Series** | Finite non-negative ($V_t \ge 0$) | $V_t < 0$, `NaN`, `Infinity` $\to$ throws error (e.g. `candles[1].volume must be a non-negative number (>= 0), got -10`). |
| **Volume Fallback** | Finite non-negative ($V \ge 0$) | Negative fallback $\to$ throws error. |
| **Period Parameters** | Finite positive integers ($N \in \mathbb{Z}_{\ge 1}$) | $N \le 0$, non-integers (e.g. `14.5`), `NaN`, `Infinity` $\to$ throws error. |
| **Standard Multipliers** | Finite non-negative numbers ($\ge 0$) | Negative numbers, `NaN`, `Infinity` $\to$ throws error. |
| **Array Alignment** | All parallel series must have equal length | Length mismatch $\to$ throws length mismatch error. |
| **Empty Series** | Empty array (`[]`) | Valid $\to$ returns empty array (`[]`) or empty series record. |

---

## 4. Missing Volume Policy

In cryptocurrency datasets, certain feeds omit volume fields for specific intervals.

1. In candle objects, if `volume` (or `v`) is `undefined`, `toOHLCV` and `pluckVolume` apply the `volumeFallback` (defaulting to `0`).
2. Volume-dependent indicators (`vwap`, `vwapSession`, `orderflowImbalance`) evaluate volume points:
   - If total volume across a calculation window or session is zero ($V = 0$), the indicator gracefully emits `null` rather than dividing by zero or producing `NaN`.
3. If an explicit negative volume is supplied (e.g. `volume: -5`), validation fails immediately.
