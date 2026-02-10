# ta-crypto

[![npm version](https://img.shields.io/npm/v/ta-crypto.svg)](https://www.npmjs.com/package/ta-crypto)
[![CI](https://github.com/TDamiao/ta-crypto/actions/workflows/ci.yml/badge.svg)](https://github.com/TDamiao/ta-crypto/actions/workflows/ci.yml)

Technical analysis indicators for crypto markets in Node.js. Inspired by pandas-ta, but focused on crypto use-cases and Node-friendly APIs.

## Features

- Typed, lightweight indicators for OHLCV arrays
- Crypto-specific extras like session VWAP, funding rate helpers, volatility regimes, and orderflow proxies
- Functions return arrays aligned to input length with `null` for insufficient data

## Install

```bash
npm i ta-crypto
```

## Quick Start

```ts
import {
  ta,
  sma,
  rsi,
  macd,
  bbands,
  atr,
  vwap,
  vwapSession,
  realizedVolatility,
  fundingRateCumulative,
  volatilityRegime,
  orderflowImbalance,
  obv,
  mfi,
  stoch,
  adx
} from "ta-crypto";

const close = [101, 102, 99, 105, 110, 108, 111];
const open =  [100, 101, 100, 103, 108, 109, 110];
const high =  [102, 103, 101, 106, 112, 110, 112];
const low =   [ 99, 100,  98, 102, 107, 106, 109];
const volume =[ 10,  12,  11,  15,  17,  14,  18];
const session=[  1,   1,   1,   2,   2,   2,   3];

const s = sma(close, 3);
const r = rsi(close, 14);
const m = macd(close);
const b = bbands(close, 20, 2);
const a = atr(high, low, close, 14);
const v = vwap(high, low, close, volume);
const vs = vwapSession(high, low, close, volume, session);
const rv = realizedVolatility(close, 30, 365);
const fr = fundingRateCumulative([0.0001, -0.0002, 0.00005]);
const vr = volatilityRegime(close, 30, 365);
const ofi = orderflowImbalance(open, close, volume, 20);
const o = obv(close, volume);
const moneyFlow = mfi(high, low, close, volume, 14);
const st = stoch(high, low, close, 14, 3);
const dx = adx(high, low, close, 14);

const s2 = ta.sma(close, 3);
```

## API Conventions

- Input arrays must be the same length.
- Outputs are aligned to input length.
- `null` marks periods with insufficient data.

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

## Crypto-Specific Notes

Session VWAP:
- Provide a `session` array with an id per candle. VWAP resets on each new session id.

Funding rate:
- `fundingRateCumulative` sums periodic rates over time.
- `fundingRateAPR` annualizes a periodic rate using `periodsPerYear`.

Volatility regimes:
- `volatilityRegime` computes realized volatility and returns -1, 0, or 1 based on z-score thresholds.

Orderflow proxies:
- `signedVolume`, `volumeDelta`, and `orderflowImbalance` infer buy/sell pressure from candle direction.

## Release

Automated npm publish runs on tag push. Steps:

1. Ensure `NPM_TOKEN` is set in GitHub Actions secrets.
2. Bump version (optional):

```bash
npm run version:patch
```

3. Run:

```bash
npm run release
```

Or do everything in one step:

```bash
npm run release:patch
```

This creates and pushes a tag like `v0.1.1`, triggering the release workflow.

## License

MIT

