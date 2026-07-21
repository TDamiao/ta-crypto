# Stateful API

Stateful constructors process one value or candle at a time and expose the same two operations:

```ts
type StatefulIndicator<TInput, TOutput> = {
  next(value: TInput): TOutput;
  reset(): void;
};
```

The current package exports `createSMA`, `createEMA`, `createRSI`, and `createVWAPSession`.

## Price indicators

```ts
import { createEMA, createRSI, createSMA } from "ta-crypto/stateful";

const sma = createSMA(14);
const ema = createEMA(14);
const rsi = createRSI(14);

for (const price of [100, 101, 102, 101, 103]) {
  const nextSma = sma.next(price);
  const nextEma = ema.next(price);
  const nextRsi = rsi.next(price);
}
```

`next()` rejects non-finite values. Use positive integer periods; validation of fractional periods is being standardized in [issue #30](https://github.com/TDamiao/ta-crypto/issues/30).

## Warmup and parity

| Constructor | First potentially non-null call | Batch equivalent | Tested parity |
| --- | --- | --- | --- |
| `createSMA(period)` | call `period` | `sma(values, period)` | Overlapping outputs, tolerance `1e-10` |
| `createEMA(period)` | call `period` | `ema(values, period)` | Overlapping outputs, tolerance `1e-10` |
| `createRSI(period)` | call `period + 1` | `rsi(values, period)` | Overlapping outputs, tolerance `1e-10` |
| `createVWAPSession()` | first candle with non-zero cumulative session volume | `vwapSession(...)` | Index-by-index, tolerance `1e-10` |

Calls are one-based in this table. For example, `createSMA(14)` returns `null` for its first 13 calls and can return a value on call 14.

## Session VWAP input

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

The input shape is:

```ts
type VWAPSessionInput = {
  high: number;
  low: number;
  close: number;
  volume: number;
  sessionId: string | number;
};
```

Unlike batch candle normalization, stateful session VWAP requires an explicit finite volume. It resets its cumulative state automatically whenever `sessionId` changes.

## Reset

Calling `reset()` clears all accumulated values and warmup state. Processing the same inputs after reset produces the same outputs as a fresh instance.

```ts
const indicator = createEMA(3);
const first = [1, 2, 3, 4].map(value => indicator.next(value));

indicator.reset();
const second = [1, 2, 3, 4].map(value => indicator.next(value));

// first and second are equal
```

Reset behavior is covered by the golden/stateful test suite for every currently exported constructor.

## What is not stateful yet

The package does not currently export stateful MACD, ATR, BBANDS, realized volatility, volatility regime, volume delta, or orderflow imbalance. These are tracked as future v0.4 work; do not import constructors that are not listed on this page.

## Related pages

- [Indicators](indicators.md)
- [Crypto utilities](crypto.md)
- [Compatibility](compatibility.md)
