# Crypto utilities

The `ta-crypto/crypto` entry point exports session VWAP, funding calculations, volatility regimes, and candle-derived orderflow proxies.

## Session VWAP

`vwapSession` resets cumulative price-volume and volume when the session identifier changes.

```ts
import { vwapSession } from "ta-crypto/crypto";

const result = vwapSession(
  [102, 103, 104],
  [99, 100, 101],
  [101, 102, 103],
  [10, 12, 8],
  ["asia", "asia", "us"]
);
```

The output is aligned with the input. A point is `null` when cumulative volume for the current session is zero.

Session IDs are compared with strict inequality. Choose IDs that change exactly at the desired UTC, funding, or exchange-session boundary.

## Funding calculations

```ts
import { fundingRateAPR, fundingRateCumulative } from "ta-crypto/crypto";

const rates = [0.0001, -0.00005, 0.00008];
const cumulative = fundingRateCumulative(rates);
const annualizedPercent = fundingRateAPR(rates, 365 * 3);
```

- `fundingRateCumulative` is a running arithmetic sum beginning at index `0`.
- `fundingRateAPR` calculates `rate * periodsPerYear * 100` at every index.
- These functions do not compound funding payments or model collateral, leverage, fees, or position changes.

For funding every eight hours, `periodsPerYear = 365 * 3` (`1095`). For hourly funding, use `8760`.

## Volatility regime

```ts
import { volatilityRegime } from "ta-crypto/crypto";

const regime = volatilityRegime(close, 30, 365, -0.5, 0.5);
```

The function returns:

- `-1` below the low z-score threshold;
- `0` between thresholds or when window deviation is zero;
- `1` above the high z-score threshold;
- `null` during warmup.

With period `L`, the first potentially non-null regime is at index `2 * L`. Prices feed annualized realized volatility, then a second rolling window standardizes that volatility.

Because this path uses log returns, validate prices as strictly positive in v0.3.4. Domain validation is tracked in [issue #28](https://github.com/TDamiao/ta-crypto/issues/28).

## Candle-derived orderflow proxies

```ts
import { orderflowImbalance, signedVolume, volumeDelta } from "ta-crypto/crypto";

const signed = signedVolume(open, close, volume);
const delta14 = volumeDelta(open, close, volume, 14);
const imbalance14 = orderflowImbalance(open, close, volume, 14);
```

`signedVolume` assigns the candle volume by candle direction:

- positive when `close > open`;
- negative when `close < open`;
- zero when `close === open`.

`volumeDelta` is the rolling sum of signed volume. `orderflowImbalance` divides rolling signed volume by rolling total volume and returns `null` when total volume is zero. Both first emit at index `period - 1`.

These functions infer pressure from OHLCV candles. They do not consume trades, bid/ask classifications, or L2/L3 order-book events, and must not be presented as direct order-book imbalance.

## Stateful session VWAP

`createVWAPSession` is exported from both `ta-crypto/crypto` and `ta-crypto/stateful`. See [Stateful API](stateful.md) for its input contract and reset behavior.

## Related limitations

- Missing candle volume defaults to zero during normalization. See [Inputs and candles](inputs.md).
- The batch orderflow and volatility-regime functions currently rescan windows; performance work is tracked separately in the v0.4 backlog.
- No candle resampling, exchange adapter, or multi-timeframe merge API is currently exported.
