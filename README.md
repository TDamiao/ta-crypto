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
import { createSMA, createEMA, createRSI, createVWAPSession } from "ta-crypto";

const sma14 = createSMA(14);
const ema14 = createEMA(14);
const rsi14 = createRSI(14);
const nextSma = sma14.next(101.25);
const nextEma = ema14.next(101.25);
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

Websocket-like streaming loop:

```ts
import { createEMA, createRSI } from "ta-crypto";

const ema21 = createEMA(21);
const rsi14 = createRSI(14);

ws.on("message", (tick) => {
  const price = Number(tick.last);
  const e = ema21.next(price);
  const r = rsi14.next(price);
  if (e !== null && r !== null) {
    // strategy signal path
  }
});
```

## Examples

Real-world entry points live in `examples/`:
- `examples/rsi-strategy.ts`
- `examples/vwap-session.ts`
- `examples/funding-arbitrage.ts`

If you're using ta-crypto in production or experiments, feel free to add your example here.

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

Policy source: `scripts/compat-policy.json`

| Indicator | Burn-in | Tolerance | Blocking refs | Non-blocking refs |
| --- | --- | --- | --- | --- |
| SMA(14) | 14 | 1e-10 | TA-Lib, technicalindicators | pandas-ta |
| EMA(14) | 14 | 1e-10 | TA-Lib, technicalindicators | pandas-ta |
| RSI(14) | 28 | 5e-2 | TA-Lib, technicalindicators | pandas-ta |
| MACD(12,26,9) | 80 | 2e-2 | TA-Lib, technicalindicators | pandas-ta |
| BBANDS(20,2) | 20 | 1e-10 | TA-Lib, technicalindicators | pandas-ta |
| ATR(14) | 56 | 1.5e-1 | TA-Lib, technicalindicators | pandas-ta |
| ADX/+DI/-DI(14) | 90 | 1.5 | TA-Lib, technicalindicators | pandas-ta |

Warmup and alignment rules:
- References are left-padded to full series length before comparison.
- Comparison starts at indicator-specific burn-in and uses only overlapping non-null points.
- `TA-Lib` and `technicalindicators` are release-blocking checks in CI.
- `pandas-ta` is telemetry-only (warns when divergent or unavailable by environment).

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

## Typing and Inputs

`ta-crypto` public APIs accept two input styles:
- Primitive arrays (`number[]`) for low-level control.
- Candle objects with long keys (`open/high/low/close/volume/time`) or aliases (`o/h/l/c/v/t`).

Single-series APIs (for example `sma`, `ema`, `rsi`, `macd`, `bbands`) accept:

```ts
import { rsi } from "ta-crypto";

const close = [101, 102, 103, 104];
const candles = [{ o: 100, h: 102, l: 99, c: 101, v: 10, t: 1 }];

rsi(close, 14);
rsi(candles, 14); // uses candle close/c
```

OHLC/OHLCV APIs (for example `vwap`, `stoch`, `atr`, `natr`, `mfi`, `adx`) accept:

```ts
import { atr, vwap } from "ta-crypto";

atr([102, 103], [99, 100], [101, 102], 14);
atr([{ open: 100, high: 102, low: 99, close: 101, volume: 10 }], 14);

vwap([102, 103], [99, 100], [101, 102], [10, 12]);
vwap([{ o: 100, h: 102, l: 99, c: 101, v: 10 }]);
```

Helpers:

```ts
import { pluckClose, toOHLCV } from "ta-crypto";

const close = pluckClose(candles);
const ohlcv = toOHLCV(candles, 0);
const ohlcvFromArrays = toOHLCV({ o: [1, 2], h: [3, 4], l: [0, 1], c: [2, 3], v: [5, 6] });
```

Validation:
- Multi-series APIs enforce equal lengths.
- Numeric inputs are validated as finite numbers with index-aware messages when possible.

## Module Imports

```ts
import { sma } from "ta-crypto/indicators";
import { vwapSession } from "ta-crypto/crypto";
import { toOHLCV } from "ta-crypto/candles";
import { createSMA, createEMA, createRSI } from "ta-crypto/stateful";
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

## Contributing

ta-crypto is open to contributors.
If you use it, improve it.
If you miss something, build it.
If you're learning, this is a great codebase to practice financial math.

Start with `CONTRIBUTING.md` and `ROADMAP.md`.
If you want to contribute but don't know where to start, pick an indicator from the roadmap and add tests comparing with TA-Lib.

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
