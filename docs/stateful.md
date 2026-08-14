# Stateful API

Stateful constructors process one value or candle at a time and expose the same two operations:

```ts
type StatefulIndicator<TInput, TOutput> = {
  next(value: TInput): TOutput;
  reset(): void;
};
```

The package exports streaming constructors from root `ta-crypto`, `ta-crypto/stateful`, and `ta-crypto/indicators` / `ta-crypto/crypto`.

## Exported Constructors

### 1. Moving Averages and Momentum

```ts
import { createSMA, createEMA, createRSI, createMACD } from "ta-crypto/stateful";

const sma = createSMA(14);
const ema = createEMA(14);
const rsi = createRSI(14);
const macd = createMACD(12, 26, 9);

for (const price of [100, 101, 102, 101, 103]) {
  const nextSma = sma.next(price);
  const nextEma = ema.next(price);
  const nextRsi = rsi.next(price);
  const nextMacd = macd.next(price); // { macd, signal, histogram }
}
```

### 2. Volatility and Overlap

```ts
import { createATR, createBBANDS } from "ta-crypto/stateful";

const atr = createATR(14);
const bbands = createBBANDS(20, 2);

// createATR accepts either full candle keys or short aliases
const nextAtr = atr.next({ high: 105, low: 98, close: 103 });
const nextBB = bbands.next(103); // { basis, upper, lower }
```

### 3. Realized Volatility and Volatility Regime

```ts
import { createRealizedVolatility, createVolatilityRegime } from "ta-crypto/stateful";

const rv = createRealizedVolatility(30, 365);
const regime = createVolatilityRegime(30, 365, -0.5, 0.5);

for (const price of prices) {
  const annualVol = rv.next(price); // number | null
  const reg = regime.next(price);   // -1 | 0 | 1 | null
}
```

### 4. Orderflow and Volume Delta

```ts
import { createVolumeDelta, createOrderflowImbalance } from "ta-crypto/stateful";

const vd = createVolumeDelta(14);
const ofi = createOrderflowImbalance(14);

// Orderflow constructors accept full keys { open, close, volume } or aliases { o, c, v }
const nextVd = vd.next({ open: 100, close: 102, volume: 50 });
const nextOfi = ofi.next({ o: 100, c: 102, v: 50 });
```

### 5. Session VWAP

```ts
import { createVWAPSession } from "ta-crypto/stateful";

const vwap = createVWAPSession();

const value = vwap.next({
  high: 102,
  low: 99,
  close: 101,
  volume: 10,
  sessionId: "2026-02-10-asia"
});
```

## Warmup and Parity

| Constructor | Input Shape | First Potentially Non-Null Call | Batch Equivalent | Tested Parity |
| --- | --- | --- | --- | --- |
| `createSMA(period)` | `number` | call `period` | `sma(values, period)` | Overlapping outputs, `1e-10` |
| `createEMA(period)` | `number` | call `period` | `ema(values, period)` | Overlapping outputs, `1e-10` |
| `createRSI(period)` | `number` | call `period + 1` | `rsi(values, period)` | Overlapping outputs, `1e-10` |
| `createMACD(fast, slow, signal)` | `number` | call `slow` (macd/hist), call `signal` (signal) | `macd(values, fast, slow, signal)` | Overlapping outputs, `1e-10` |
| `createATR(period)` | `{ high, low, close }` or `{ h, l, c }` | call `period` | `atr(high, low, close, period)` | Overlapping outputs, `1e-10` |
| `createBBANDS(period, std)` | `number` | call `period` | `bbands(values, period, std)` | Overlapping outputs, `1e-10` |
| `createRealizedVolatility(length, periodsPerYear)` | `number` (> 0) | call `length + 1` | `realizedVolatility(values, length, periodsPerYear)` | Overlapping outputs, `1e-10` |
| `createVolatilityRegime(length, periodsPerYear, lowZ, highZ)` | `number` (> 0) | call `length * 2 + 1` | `volatilityRegime(values, length, periodsPerYear, lowZ, highZ)` | Discrete regimes `{-1, 0, 1}`, `1e-10` |
| `createVolumeDelta(period)` | `{ open, close, volume }` or `{ o, c, v }` | call `period` | `volumeDelta(open, close, volume, period)` | Overlapping outputs, `1e-10` |
| `createOrderflowImbalance(period)` | `{ open, close, volume }` or `{ o, c, v }` | call `period` | `orderflowImbalance(open, close, volume, period)` | Overlapping outputs, `1e-10` |
| `createVWAPSession()` | `VWAPSessionInput` | first candle with non-zero cumulative session volume | `vwapSession(...)` | Index-by-index, `1e-10` |

*Note: Calls are 1-based in this table (call 1 is the first `.next()` invocation).*

## Input Shapes and Aliases

Candle-based stateful indicators support both standard and compact alias object formats:

```ts
// Full format
{ open: 100, high: 105, low: 98, close: 103, volume: 50 }

// Alias format
{ o: 100, h: 105, l: 98, c: 103, v: 50 }
```

Volume must be non-negative (`volume >= 0`). Non-finite values (`NaN`, `Infinity`) throw descriptive errors.

## Reset Semantics

Calling `reset()` clears all accumulated values, buffers, and warmup state. Processing the same inputs after reset produces the same outputs as a freshly instantiated indicator:

```ts
const indicator = createEMA(3);
const first = [1, 2, 3, 4].map(value => indicator.next(value));

indicator.reset();
const second = [1, 2, 3, 4].map(value => indicator.next(value));

// first and second are strictly equal
```

Reset behavior and instance isolation are covered by the stateful test suite for every constructor.

## Related Pages

- [Indicators](indicators.md)
- [Crypto utilities](crypto.md)
- [Compatibility](compatibility.md)
- [Trust and verification](trust.md)
