# Changelog

## 0.2.1 - 2026-02-10

- Fix release compatibility environment to Python 3.12 in CI and publish workflows.
- Keep TA-Lib, pandas-ta, and technicalindicators compatibility checks as release gate.

## 0.2.0 - 2026-02-10

- Add trust layer with golden tests for SMA/EMA/RSI/MACD/BBANDS/ATR/ADX and session VWAP.
- Add stateful streaming API: `createRSI(period).next(price)` and `createVWAPSession().next(candle)`.
- Add typed candle contracts and helpers: `pluckOpen`, `pluckHigh`, `pluckLow`, `pluckClose`, `pluckVolume`, `toOHLCV`.
- Improve input validation messages for mismatched lengths and non-finite numeric values.
- Add benchmark script (`npm run bench`) and golden vector generator (`npm run generate:golden`).
- Add external compatibility checks against `TA-Lib`, `pandas-ta`, and `technicalindicators`.
- Gate CI/release publish workflows on compatibility checks before npm/GitHub Packages publish.
- Add modular public entrypoints: `ta-crypto/indicators`, `ta-crypto/crypto`, `ta-crypto/candles`, `ta-crypto/stateful`.
- Expand README with compatibility tables, crypto playbooks, hero features, limitations, and import patterns.

## 0.1.2 - 2026-02-10

- Fix GitHub Packages publish workflow.

## 0.1.1 - 2026-02-10

- Add GitHub Packages release workflow.
- Normalize repository URL.

## 0.1.0 - 2026-02-10

- Initial release of `ta-crypto`.
- Core indicators: `sma`, `ema`, `rma`, `hl2`, `hlc3`, `ohlc4`, `vwap`, `bbands`.
- Momentum: `rsi`, `macd`, `stoch`.
- Volatility: `trueRange`, `atr`, `natr`, `realizedVolatility`.
- Performance: `logReturn`, `percentReturn`.
- Volume: `obv`, `mfi`.
- Trend: `adx`.
- Crypto extras: `vwapSession`, `fundingRateCumulative`, `fundingRateAPR`, `volatilityRegime`, `signedVolume`, `volumeDelta`, `orderflowImbalance`.
