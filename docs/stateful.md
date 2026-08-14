# Stateful Streaming API Reference

The `ta-crypto/stateful` subpath exports high-throughput, streaming indicator objects designed for real-time market data pipelines, WebSocket tickers, and live trading execution.

---

## 1. Core Contract

Every stateful indicator adheres to the standard `StatefulIndicator<TInput, TOutput>` interface:

```ts
interface StatefulIndicator<TInput, TOutput> {
  /**
   * Processes the next tick or candle in the stream.
   * Returns the computed indicator value or null during warmup.
   */
  next(input: TInput): TOutput;

  /**
   * Resets all internal state, accumulators, and ring buffers to their initial state.
   */
  reset(): void;
}
```

### Architectural Guarantees:
1. **$O(1)$ Incremental Complexity**: Every `.next()` invocation executes in constant time with zero array allocations on hot paths.
2. **Bounded Memory Storage**: State is strictly bounded by the indicator's configured window period (using internal circular buffers or scalar accumulators).
3. **Point-by-Point Batch Parity**: When fed a sequential series of prices or candles, the stream of outputs matches the batch API point-by-point within $1 \times 10^{-10}$ tolerance.
4. **Clean Reset Isolation**: Invoking `.reset()` fully clears all history. Reprocessing the same inputs yields output identical to a newly constructed instance.

---

## 2. Stateful Constructors Reference

### `createSMA(period = 14)`
- **Input**: `number` (finite price).
- **Output**: `number | null` (Simple moving average).
- **First Valid Call**: Call number `period`.
- **Warmup**: Returns `null` for calls `1` through `period - 1`.
- **Batch Equivalent**: `sma(prices, period)`.
- **State Storage**: Internal circular ring buffer of size `period`.

### `createEMA(period = 14)`
- **Input**: `number` (finite price).
- **Output**: `number | null` (Exponential moving average).
- **First Valid Call**: Call number `period`.
- **Warmup**: Accumulates initial seed sum for first `period - 1` calls (`null`), seeds with arithmetic mean at call `period`, then applies exponential smoothing multiplier $\alpha = \frac{2}{\text{period} + 1}$.
- **Batch Equivalent**: `ema(prices, period)`.
- **State Storage**: $O(1)$ scalar accumulator.

### `createRSI(period = 14)`
- **Input**: `number` (finite price).
- **Output**: `number | null` (RSI value from `0` to `100`).
- **First Valid Call**: Call number `period + 1` (requires `period` price changes from `period + 1` prices).
- **Warmup**: `null` for calls `1` through `period`.
- **Edge Cases**: If average loss is zero, emits `100`.
- **Batch Equivalent**: `rsi(prices, period)`.

### `createMACD(fastPeriod = 12, slowPeriod = 26, signalPeriod = 9)`
- **Input**: `number` (finite price).
- **Output**: `{ macd: number | null, signal: number | null, histogram: number | null }`.
- **Validation**: Requires `fastPeriod < slowPeriod`.
- **First Valid Call**: `macd` emits at call `slowPeriod`; `signal` and `histogram` require full signal convergence.
- **Batch Equivalent**: `macd(prices, fastPeriod, slowPeriod, signalPeriod)`.

### `createATR(period = 14)`
- **Input**: `ATRInput` (`{ high, low, close }` or `{ h, l, c }`).
- **Output**: `number | null` (Average True Range).
- **First Valid Call**: Call number `period`.
- **Warmup**: First call computes $H_0 - L_0$; subsequent calls compute True Range against previous close; emits at call `period`.
- **Batch Equivalent**: `atr(high, low, close, period)`.

### `createBBANDS(period = 20, stdMultiplier = 2)`
- **Input**: `number` (finite price).
- **Output**: `{ basis: number | null, upper: number | null, lower: number | null }`.
- **First Valid Call**: Call number `period`.
- **Warmup**: All three bands emit `null` for calls `1` through `period - 1`.
- **Edge Cases**: Constant price series emits `upper === basis === lower`.
- **Batch Equivalent**: `bbands(prices, period, stdMultiplier)`.

### `createVWAPSession()`
- **Input**: `VWAPSessionInput` (`{ high, low, close, volume, sessionId }`).
- **Output**: `number | null` (Session-anchored VWAP).
- **First Valid Call**: First candle with non-zero cumulative session volume.
- **Session Boundary Reset**: Whenever `sessionId` differs from previous candle, accumulators automatically reset to zero.
- **Edge Cases**: Returns `null` if cumulative session volume is zero.
- **Batch Equivalent**: `vwapSession(...)`.

### `createRealizedVolatility(length = 30, periodsPerYear = 365)`
- **Input**: `number` (strictly positive price, $P > 0$).
- **Output**: `number | null` (Annualized volatility).
- **First Valid Call**: Call number `length + 1` (requires `length` logarithmic returns).
- **Warmup**: Returns `null` for calls `1` through `length`.
- **Batch Equivalent**: `realizedVolatility(prices, length, periodsPerYear)`.

### `createVolatilityRegime(length = 30, periodsPerYear = 365, lowZ = -0.5, highZ = 0.5)`
- **Input**: `number` (strictly positive price, $P > 0$).
- **Output**: `-1 | 0 | 1 | null` (Discrete market regime).
- **First Valid Call**: Call number `length * 2 + 1`.
- **Warmup**: Requires volatility calculation window plus volatility rolling z-score window.
- **Batch Equivalent**: `volatilityRegime(...)`.

### `createVolumeDelta(period = 14)`
- **Input**: `OrderflowInput` (`{ open, close, volume }` or `{ o, c, v }`).
- **Output**: `number | null` (Rolling signed volume sum).
- **First Valid Call**: Call number `period`.
- **Batch Equivalent**: `volumeDelta(open, close, volume, period)`.

### `createOrderflowImbalance(period = 14)`
- **Input**: `OrderflowInput` (`{ open, close, volume }` or `{ o, c, v }`).
- **Output**: `number | null` (Ratio in $[-1.0, +1.0]$).
- **First Valid Call**: Call number `period`.
- **Edge Cases**: Returns `null` if total window volume is zero.
- **Batch Equivalent**: `orderflowImbalance(open, close, volume, period)`.

---

## 3. Consolidated Stateful Reference Table

| Constructor | Input Type | Output Type | First Valid Call ($N$) | Internal Storage | Batch Parity ($1\text{e-}10$) |
|---|---|---|---|---|---|
| `createSMA(period)` | `number` | `number \| null` | `period` | Ring buffer ($N$) | PASS |
| `createEMA(period)` | `number` | `number \| null` | `period` | Scalar ($O(1)$) | PASS |
| `createRSI(period)` | `number` | `number \| null` | `period + 1` | Scalar ($O(1)$) | PASS |
| `createMACD(fast, slow, signal)` | `number` | `MACDOutput` | `slow` (macd) | 3 EMAs | PASS |
| `createATR(period)` | `ATRInput` | `number \| null` | `period` | Scalar ($O(1)$) | PASS |
| `createBBANDS(period, std)` | `number` | `BBANDSOutput` | `period` | Dual buffer ($N$) | PASS |
| `createVWAPSession()` | `VWAPSessionInput` | `number \| null` | First non-zero $V$ | Scalar ($O(1)$) | PASS |
| `createRealizedVolatility(len, ppy)` | `number` ($> 0$) | `number \| null` | `len + 1` | Ring buffer ($N$) | PASS |
| `createVolatilityRegime(len, ppy, lowZ, highZ)` | `number` ($> 0$) | `-1 \| 0 \| 1 \| null` | `len * 2 + 1` | Nested buffers | PASS |
| `createVolumeDelta(period)` | `OrderflowInput` | `number \| null` | `period` | Ring buffer ($N$) | PASS |
| `createOrderflowImbalance(period)` | `OrderflowInput` | `number \| null` | `period` | Dual ring buffers | PASS |

---

## 4. Usage Example

```ts
import {
  createMACD,
  createATR,
  createBBANDS,
  createOrderflowImbalance
} from "ta-crypto/stateful";

const macd = createMACD(12, 26, 9);
const atr = createATR(14);
const bbands = createBBANDS(20, 2);
const ofi = createOrderflowImbalance(14);

function onLiveCandle(candle: { open: number, high: number, low: number, close: number, volume: number }) {
  const m = macd.next(candle.close);       // { macd, signal, histogram }
  const a = atr.next(candle);              // number | null
  const bb = bbands.next(candle.close);    // { basis, upper, lower }
  const flow = ofi.next(candle);           // number | null

  if (m.histogram !== null && bb.upper !== null) {
    // Both indicators have completed their warmup periods
    console.log(`Live MACD Hist: ${m.histogram.toFixed(4)}, Upper Band: ${bb.upper.toFixed(2)}`);
  }
}
```
