# ta-crypto

[![npm version](https://img.shields.io/npm/v/ta-crypto.svg)](https://www.npmjs.com/package/ta-crypto)
[![CI](https://github.com/TDamiao/ta-crypto/actions/workflows/ci.yml/badge.svg)](https://github.com/TDamiao/ta-crypto/actions/workflows/ci.yml)

Technical analysis indicators for crypto markets in Node.js.

## Install

```bash
npm i ta-crypto
```

## Quick Start

```ts
import { sma, rsi, macd, bbands, atr, vwapSession, toOHLCV } from "ta-crypto";

const candles = [
  { open: 100, high: 102, low: 99, close: 101, volume: 10, time: 1 },
  { open: 101, high: 103, low: 100, close: 102, volume: 12, time: 2 }
];

const { high, low, close, volume } = toOHLCV(candles, 0);
const s = sma(close, 14);
const r = rsi(close, 14);
const m = macd(close);
const b = bbands(close, 20, 2);
const a = atr(high, low, close, 14);
const vs = vwapSession(high, low, close, volume, [1, 1]);
```

## Stateful API (streaming)

```ts
import { createRSI, createVWAPSession } from "ta-crypto";

const rsi14 = createRSI(14);
const nextRsi = rsi14.next(101.25);

const vwap = createVWAPSession();
const nextVwap = vwap.next({
  high: 102,
  low: 99,
  close: 101,
  volume: 10,
  sessionId: "2026-02-10-asia"
});
```

## Compatibility

`ta-crypto` now ships golden tests (`test/fixtures/golden.json`) to lock behavior across releases.

Classic indicators:

| Indicator | Reference | Tolerance |
| --- | --- | --- |
| SMA, EMA, RSI | Golden baseline | 1e-10 |
| MACD, BBANDS | Golden baseline | 1e-10 |
| ATR, ADX | Golden baseline | 1e-10 |

Crypto indicators:

| Indicator | Reference | Tolerance |
| --- | --- | --- |
| VWAP Session | Golden baseline | 1e-10 |
| Stateful VWAP Session parity | Batch VWAP Session | 1e-10 |

Streaming parity:

| Indicator | Reference | Tolerance |
| --- | --- | --- |
| Stateful RSI(14) | Batch RSI(14) | 1e-10 |

External parity:

| Indicator set | Reference libs | Tolerance |
| --- | --- | --- |
| SMA/EMA/RSI/MACD/BBANDS/ATR/ADX | TA-Lib, pandas-ta, technicalindicators | 1e-8 |

Generate/review vectors:

```bash
npm run generate:golden
npm run test:golden
npm run generate:compat
npm run test:compat:technicalindicators
# python deps: pip install -r scripts/requirements-compat.txt
npm run test:compat:python
```

Note:
- CI uses Linux + Python 3.12 for full TA-Lib/pandas-ta coverage.
- On Windows, `pandas-ta` may be unavailable depending on upstream wheels; the script reports explicit skip in that case.
- `TA-Lib` and `technicalindicators` are strict release gates; `pandas-ta` runs as compatibility telemetry and reports warnings when it diverges by environment.

## Crypto Playbooks

Session VWAP reset:
- Provide one `sessionId` per candle.
- VWAP resets exactly when `sessionId` changes.
- Use exchange session boundaries (UTC day, funding window, or custom market session).

Funding APR:
- `fundingRateAPR(values, periodsPerYear)` annualizes periodic funding.
- `periodsPerYear` presets:
- `3/day` funding: `1095`
- `1/hour` funding: `8760`
- `1/8h` funding: `1095`

Volatility regime:
- `volatilityRegime(values, length, periodsPerYear, lowZ, highZ)` returns `-1`, `0`, `1`.
- Default thresholds: `lowZ = -0.5`, `highZ = 0.5`.
- Calibration approach: increase absolute thresholds for noisier low-timeframe pairs, reduce for smoother higher timeframes.

## Indicators

Overlap:
- `sma`, `ema`, `rma`, `hl2`, `hlc3`, `ohlc4`, `vwap`, `bbands`

Momentum:
- `rsi`, `macd`, `stoch`

Volatility:
- `trueRange`, `atr`, `natr`, `realizedVolatility`

Performance:
- `logReturn`, `percentReturn`

Volume:
- `obv`, `mfi`

Trend:
- `adx`

Crypto:
- `vwapSession`, `fundingRateCumulative`, `fundingRateAPR`, `volatilityRegime`, `signedVolume`, `volumeDelta`, `orderflowImbalance`

## Hero Features (crypto edge)

1. Session-aware VWAP (`vwapSession`, `createVWAPSession`)
2. Funding analytics (`fundingRateCumulative`, `fundingRateAPR`)
3. Volatility regime labeling (`volatilityRegime`)
4. Orderflow proxies (`signedVolume`, `volumeDelta`, `orderflowImbalance`)
5. Streaming/stateful indicators for low-allocation pipelines

Limitations:
- Orderflow proxies infer pressure from candle direction and volume; they are not a replacement for L2/L3 order book data.
- Different libraries use different warmup conventions; comparisons use overlapping non-null windows.

## Candle Contracts

Use typed candles plus helpers:

```ts
import { pluckClose, toOHLCV } from "ta-crypto";

const close = pluckClose(candles);
const { open, high, low, close: c, volume } = toOHLCV(candles, 0);
```

Validation:
- Multi-series indicators enforce equal lengths (`assertSameLength`).
- Candle helpers validate finite numeric fields with index-specific error messages.

## Module Imports

```ts
import { sma } from "ta-crypto/indicators";
import { vwapSession } from "ta-crypto/crypto";
import { toOHLCV } from "ta-crypto/candles";
import { createRSI } from "ta-crypto/stateful";
```

## Bench (internal baseline, 10k candles)

```text
sma(14): 0.619 ms/run
ema(14): 0.549 ms/run
rsi(14): 0.647 ms/run
macd:    2.887 ms/run
bbands:  2.159 ms/run
atr(14): 1.356 ms/run
adx(14): 5.371 ms/run
```

Run locally:

```bash
npm run bench
```

## Release

Publications are gated by GitHub Actions:
- `CI` runs build/tests + compatibility checks.
- `Release` workflows run tests/compat again before publish.

Recommended with GitHub CLI:

```bash
gh auth login
gh workflow run ci.yml
gh run list --workflow ci.yml --limit 1
```

```bash
npm run changelog
npm run version:patch
npm run release
```

## License

MIT
