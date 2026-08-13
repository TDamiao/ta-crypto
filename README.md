# ta-crypto

[![npm version](https://img.shields.io/npm/v/ta-crypto.svg)](https://www.npmjs.com/package/ta-crypto)
[![npm downloads](https://img.shields.io/npm/dm/ta-crypto.svg)](https://www.npmjs.com/package/ta-crypto)
[![TypeScript types](https://img.shields.io/npm/types/ta-crypto.svg)](https://www.npmjs.com/package/ta-crypto)
[![CI](https://github.com/TDamiao/ta-crypto/actions/workflows/ci.yml/badge.svg)](https://github.com/TDamiao/ta-crypto/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/ta-crypto.svg)](LICENSE)

Technical analysis indicators and crypto-market utilities for Node.js. The current stable release is `v0.3.4`.

## Install

```bash
npm install ta-crypto
```

## Start here

```ts
import { rsi, atr, toOHLCV } from "ta-crypto";

const candles = [
  { open: 100, high: 102, low: 99, close: 101, volume: 10, time: 1 },
  { open: 101, high: 103, low: 100, close: 102, volume: 12, time: 2 }
];

const { high, low, close } = toOHLCV(candles);
const rsi14 = rsi(close, 14);
const atr14 = atr(high, low, close, 14);
```

Indicator results are aligned with the input. Values that need more history are returned as `null`.

## Choose an API

| Task | Use | Reference |
| --- | --- | --- |
| Normalize candle objects or aliases | `toOHLCV`, `pluck*` | [Inputs and candles](docs/inputs.md) |
| Calculate classic indicators in batch | `sma`, `rsi`, `macd`, `atr`, `adx`, and others | [Indicators](docs/indicators.md) |
| Calculate funding, session VWAP, volatility regimes, or candle-derived orderflow | `ta-crypto/crypto` | [Crypto utilities](docs/crypto.md) |
| Process prices or candles one at a time | `createSMA`, `createEMA`, `createRSI`, `createVWAPSession` | [Stateful API](docs/stateful.md) |
| Review tolerances and external references | compatibility scripts and policy | [Compatibility](docs/compatibility.md) |
| Verify releases and project limitations | CI, tags, changelog, and trust policy | [Trust and verification](docs/trust.md) |

## Module imports

```ts
import { sma } from "ta-crypto/indicators";
import { vwapSession } from "ta-crypto/crypto";
import { toOHLCV } from "ta-crypto/candles";
import { createRSI } from "ta-crypto/stateful";
```

The root `ta-crypto` entry point exports all public functions and types.

## Streaming example

```ts
import { createEMA, createRSI } from "ta-crypto";

const ema21 = createEMA(21);
const rsi14 = createRSI(14);

for (const price of [100, 101, 102, 101, 103]) {
  const ema = ema21.next(price);
  const rsi = rsi14.next(price);
  // Both values remain null until their warmup is complete.
}
```

See [Stateful API](docs/stateful.md) for warmup, parity, and reset behavior.

## What is included

- Batch overlap, momentum, volatility, performance, volume, and trend indicators.
- Candle normalization for long keys and `o/h/l/c/v/t` aliases.
- Stateful SMA, EMA, RSI, and session VWAP.
- Crypto-specific funding, volatility-regime, session-VWAP, and orderflow-proxy utilities.
- Golden regression tests and external compatibility checks.

## What is not included

- A backtest or portfolio accounting engine.
- Built-in strategies, screeners, or exchange/network adapters.
- Complete multi-timeframe alignment or candle resampling.
- L2/L3 order-book imbalance. Current orderflow functions are candle-derived proxies.

These items remain roadmap work and must not be treated as current package capabilities.

## Known behavior in v0.4

- `percentReturn(values, { cumulative: true })` compounds cumulative return from the initial price ([issue #27](https://github.com/TDamiao/ta-crypto/issues/27)). Arithmetic sum of periodic returns is available via `sumPeriodicReturns(values)` or `{ mode: "sum" }`. The deprecated boolean signature is supported with compound semantics during the v0.4 migration window.
- `logReturn` does not yet reject zero or negative prices; see [issue #28](https://github.com/TDamiao/ta-crypto/issues/28).
- NATR does not yet reject zero or negative closing prices; see [issue #29](https://github.com/TDamiao/ta-crypto/issues/29).
- Period validation is not yet uniform across every API; see [issue #30](https://github.com/TDamiao/ta-crypto/issues/30).

## Examples

Runnable examples are in [`examples/`](examples/README.md):

```bash
npm run example:all
```

They cover RSI signals, batch/stateful session VWAP parity, funding metrics, and an external RSI comparison.

## Development

```bash
npm ci
npm test
```

Additional compatibility and benchmark commands are documented in [CONTRIBUTING.md](CONTRIBUTING.md).

GitHub Actions and Release Please are the single release authority. Conventional commits on `main` create or update a Release PR; merging that PR creates the matching tag and GitHub Release, runs the release checks, and publishes to npm. Local commands are limited to validation and dry runs. See [Trust and verification](docs/trust.md) for the complete flow and recovery boundaries.

## Project references

- [Contributing](CONTRIBUTING.md)
- [Roadmap](ROADMAP.md)
- [Changelog](CHANGELOG.md)
- [Trust and verification](docs/trust.md)
- [License](LICENSE)
