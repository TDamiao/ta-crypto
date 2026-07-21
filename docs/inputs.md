# Inputs and candles

This page describes the input shapes supported by `ta-crypto@0.3.4`.

## Price series

Single-series indicators accept a `number[]` or an array of candles. When candles are supplied, the indicator reads `close` or its alias `c`.

```ts
import { rsi } from "ta-crypto";

rsi([101, 102, 100, 103], 14);
rsi([{ o: 100, h: 102, l: 99, c: 101, v: 10 }], 14);
```

## Candle objects

Long keys and compact aliases are supported:

```ts
type CandleObject = {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  time?: number | string | Date;
};

type CandleAlias = {
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number;
  t?: number | string | Date;
};
```

Use one key style consistently. The long field is read first when both forms are present.

## OHLCV arrays

Multi-series APIs accept separate arrays or an OHLCV object:

```ts
import { atr, vwap } from "ta-crypto";

const high = [102, 103];
const low = [99, 100];
const close = [101, 102];
const volume = [10, 12];

atr(high, low, close, 14);
vwap({
  o: [100, 101],
  h: high,
  l: low,
  c: close,
  v: volume
});
```

All arrays in a multi-series input must have equal lengths.

## Normalize candles

Use `toOHLCV` to create canonical arrays and `pluck*` when only one field is needed.

```ts
import { pluckClose, toOHLCV } from "ta-crypto/candles";

const candles = [
  { open: 100, high: 102, low: 99, close: 101, volume: 10, time: 1 },
  { open: 101, high: 103, low: 100, close: 102, time: 2 }
];

const close = pluckClose(candles);
const ohlcv = toOHLCV(candles, 0);
```

The normalized result has this shape:

```ts
{
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
  time: Array<number | string | Date | undefined>;
}
```

## Missing volume

`volume` and `v` are optional in candle and OHLCV object inputs. `toOHLCV` uses the supplied fallback, which defaults to `0`. APIs that normalize candle objects therefore see missing volume as zero.

For volume-dependent calculations, pass volume explicitly when zero is not the intended meaning. The project is tracking a more explicit cross-API policy in [issue #30](https://github.com/TDamiao/ta-crypto/issues/30).

## Validation in v0.3.4

- Candle normalization rejects missing or non-finite OHLC values with field and index context.
- Normalized OHLCV arrays are checked for equal lengths.
- Many public wrappers validate finite numeric arrays, but validation is not yet uniform across every overload.
- Period handling is also not yet uniform; use positive integer periods.
- Empty arrays generally return empty aligned outputs, but callers should verify the specific function contract.

Do not rely on invalid periods returning all-null output. The v0.4 validation work may tighten these cases into explicit errors.

## Related pages

- [Indicators](indicators.md)
- [Crypto utilities](crypto.md)
- [Stateful API](stateful.md)
