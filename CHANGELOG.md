# Changelog

## Unreleased

### Breaking Changes

* **performance:** correct cumulative `percentReturn` to use compounded returns ($P_t / P_0 - 1$) instead of arithmetic summation ([#27](https://github.com/TDamiao/ta-crypto/issues/27)).
* **performance:** deprecate boolean argument in `percentReturn(values, cumulative)` in favor of options object `{ cumulative: true }`, `{ mode: "compound" }`, or explicit `sumPeriodicReturns` function ([#27](https://github.com/TDamiao/ta-crypto/issues/27)).

### Features

* **performance:** export `sumPeriodicReturns` and support `{ mode: "sum" }` in `percentReturn` for explicit arithmetic returns summation ([#27](https://github.com/TDamiao/ta-crypto/issues/27)).
* **types:** add `PercentReturnMode` and `PercentReturnOptions` ([#27](https://github.com/TDamiao/ta-crypto/issues/27)).

### Bug Fixes

* **performance:** reject non-positive prices ($\le 0$) and non-finite values in `logReturn`, `realizedVolatility`, and `volatilityRegime` with index-aware errors ([#28](https://github.com/TDamiao/ta-crypto/issues/28)).
* **volatility:** reject non-positive close prices ($\le 0$) in `natr` with index-aware errors ([#29](https://github.com/TDamiao/ta-crypto/issues/29)).
* **core:** standardize positive-integer period validation across all batch indicators and stateful constructors ([#30](https://github.com/TDamiao/ta-crypto/issues/30)).

### Performance Improvements

* **volume:** optimize `mfi` with single-pass circular buffer rolling flow sums ([#31](https://github.com/TDamiao/ta-crypto/issues/31)).
* **overlap:** optimize periodic `vwap` with $O(1)$ memory rolling price-volume and volume accumulators ([#32](https://github.com/TDamiao/ta-crypto/issues/32)).
* **crypto:** optimize `volumeDelta` and `orderflowImbalance` with single-pass rolling signed and total volume sums ([#33](https://github.com/TDamiao/ta-crypto/issues/33)).
* **crypto:** remove repeated window slicing from `volatilityRegime` and optimize `realizedVolatility` with $O(n)$ rolling variance ([#34](https://github.com/TDamiao/ta-crypto/issues/34)).
* **core:** optimize `makeSeries` with fast array fill allocation.

## [0.3.4](https://github.com/TDamiao/ta-crypto/compare/v0.3.3...v0.3.4) (2026-07-21)


### Bug Fixes

* **docs:** synchronize release documentation for v0.3.4 ([03798c0](https://github.com/TDamiao/ta-crypto/commit/03798c02dca94168db60ab65caa4830c05c3dc82))
* **docs:** synchronize release documentation for v0.3.4 ([9cdd9ba](https://github.com/TDamiao/ta-crypto/commit/9cdd9bac22eea456cd78896e5d445d8d24b4fd33))

## [0.3.3](https://github.com/TDamiao/ta-crypto/compare/v0.3.2...v0.3.3) (2026-07-21)

### Documentation

* Reorganize the README as a concise capability and documentation index.
* Add focused references for inputs, indicators, crypto utilities, stateful APIs, and compatibility.
* Document v0.3.3 semantics, warmup behavior, limitations, and planned v0.4 corrections.

### Release automation

* Adopt Release Please and GitHub Actions as the single authority for versions, tags, GitHub Releases, and npm publication.

### Bug Fixes

* prepare v0.3.3 release ([2b44806](https://github.com/TDamiao/ta-crypto/commit/2b448064da14e33f1485b5f91bf2ee73b434e70d))

## 0.3.2 - 2026-07-12

- Add runnable RSI, session VWAP, funding analytics, and external-reference compatibility examples.
- Add a trust and verification page covering CI, releases, compatibility gates, and independent package checks.
- Document example commands and expected outputs, with an aggregate smoke-test script.

## 0.3.1 - 2026-07-12

- Add an internal shared rolling-window engine for sum, mean, population standard deviation, minimum, and maximum.
- Refactor batch SMA, BBANDS, and stateful SMA to share deterministic warmup, alignment, and reset semantics.
- Improve fixed-window performance in deterministic 10k/100k benchmarks while preserving golden and external-reference compatibility.
- Document rolling invariants and add focused regression and benchmark coverage.

## 0.3.0 - 2026-02-26

- Standardize public typed input contracts for indicators, including candle aliases (`o/h/l/c/v/t`) and OHLCV object variants.
- Add a public API normalization layer so main indicator APIs accept both primitive arrays and candle-based inputs consistently.
- Expand contract tests and README typing documentation for discoverable developer UX.
- Add streaming/stateful `createSMA(period)` and `createEMA(period)` with deterministic warmup/reset semantics and parity coverage.
- Extend golden/stateful tests to cover SMA/EMA/RSI parity and reset behavior.
- Centralize compatibility tolerance and burn-in policy in `scripts/compat-policy.json`.
- Make JS and Python compatibility comparators consume the same policy and embed policy snapshot in exported compat vectors metadata.
- Publish release-ready compatibility policy table and warmup/alignment rules in README.

## 0.2.3 - 2026-02-10

- Keep `TA-Lib` and `technicalindicators` as strict publish gates.
- Treat `pandas-ta` comparison mismatches as non-blocking warnings to avoid environment-specific regressions in release automation.

## 0.2.2 - 2026-02-10

- Make `pandas-ta` comparison resilient to environment-specific runtime issues (non-blocking warning).
- Keep strict compatibility gates with `TA-Lib` and `technicalindicators` before publish.

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
