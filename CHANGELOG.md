# Changelog

## Unreleased

### Breaking Changes

* **performance:** correct cumulative `percentReturn` to use compounded returns ($P_t / P_0 - 1$) instead of arithmetic summation ([#27](https://github.com/TDamiao/ta-crypto/issues/27)).
* **performance:** deprecate boolean argument in `percentReturn(values, cumulative)` in favor of options object `{ cumulative: true }`, `{ mode: "compound" }`, or explicit `sumPeriodicReturns` function ([#27](https://github.com/TDamiao/ta-crypto/issues/27)).

### Features

* **performance:** export `sumPeriodicReturns` and support `{ mode: "sum" }` in `percentReturn` for explicit arithmetic returns summation ([#27](https://github.com/TDamiao/ta-crypto/issues/27)).
* **types:** add `PercentReturnMode` and `PercentReturnOptions` ([#27](https://github.com/TDamiao/ta-crypto/issues/27)).

### Bug Fixes

* **performance:** reject non-positive prices ($\le 0$) and non-finite values in `logReturn`, `realizedVolatility`, `volatilityRegime`, `percentReturn`, and `sumPeriodicReturns` with index-aware errors ([#27](https://github.com/TDamiao/ta-crypto/issues/27), [#28](https://github.com/TDamiao/ta-crypto/issues/28)).
* **volatility:** reject non-positive close prices ($\le 0$) in `natr` with index-aware errors ([#29](https://github.com/TDamiao/ta-crypto/issues/29)).
* **core:** standardize positive-integer period validation and non-negative volume ($\ge 0$) domain validation across all indicators ([#30](https://github.com/TDamiao/ta-crypto/issues/30), [#33](https://github.com/TDamiao/ta-crypto/issues/33)).
* **core:** enforce numerically stable sliding Welford recurrence for rolling variance in `RollingStdDev`, `realizedVolatility`, and `volatilityRegime` preventing catastrophic cancellation ([#34](https://github.com/TDamiao/ta-crypto/issues/34)).

### Performance Improvements

* **volume:** optimize `mfi` with single-pass circular buffer rolling flow sums ($O(N)$ time, $O(\text{period})$ memory) ([#31](https://github.com/TDamiao/ta-crypto/issues/31)).
* **overlap:** optimize periodic `vwap` with circular buffer rolling price-volume and volume accumulators ($O(N)$ time, $O(\text{period})$ memory) ([#32](https://github.com/TDamiao/ta-crypto/issues/32)).
* **crypto:** optimize `volumeDelta` and `orderflowImbalance` with single-pass rolling signed and total volume sums ([#33](https://github.com/TDamiao/ta-crypto/issues/33)).
* **crypto:** remove repeated window slicing from `volatilityRegime` and optimize `realizedVolatility` with $O(N)$ rolling variance ([#34](https://github.com/TDamiao/ta-crypto/issues/34)).
* **core:** optimize `makeSeries` with fast array fill allocation.
* **bench:** add legacy-vs-rolling parity gate in `scripts/bench-rolling.js`.

## [0.4.1](https://github.com/TDamiao/ta-crypto/compare/v0.4.0...v0.4.1) (2026-08-15)


### Bug Fixes

* **docs:** prevent stale stable-version claims in published package ([#62](https://github.com/TDamiao/ta-crypto/issues/62)) ([986da14](https://github.com/TDamiao/ta-crypto/commit/986da144f72c267b491051fbc6d2bf7d92815d27))

## [0.4.0](https://github.com/TDamiao/ta-crypto/compare/v0.3.4...v0.4.0) (2026-08-15)


### ⚠ BREAKING CHANGES

* **performance:** percentReturn(values, { cumulative: true }) and percentReturn(values, true) now compute compounded cumulative returns rather than arithmetic summation. Use sumPeriodicReturns(values) or percentReturn(values, { mode: 'sum' }) for arithmetic summation.

### Features

* **stateful:** add createMACD, createATR, createBBANDS, volatility, and orderflow ([#16](https://github.com/TDamiao/ta-crypto/issues/16), [#35](https://github.com/TDamiao/ta-crypto/issues/35), [#36](https://github.com/TDamiao/ta-crypto/issues/36)) ([276c13f](https://github.com/TDamiao/ta-crypto/commit/276c13f2eb1d93d32b793ce4f8c8129102445b60))


### Bug Fixes

* **compat:** decouple compat-drift from disk fixture and formalize OBV rebased trajectory ([#20](https://github.com/TDamiao/ta-crypto/issues/20)) ([0e1ba97](https://github.com/TDamiao/ta-crypto/commit/0e1ba979ede74bd1a2ce90308da0fb0bc28ace0b))
* **core:** post-audit hardening for return domain, volume contracts, and rolling variance stability ([#27](https://github.com/TDamiao/ta-crypto/issues/27), [#30](https://github.com/TDamiao/ta-crypto/issues/30), [#33](https://github.com/TDamiao/ta-crypto/issues/33), [#34](https://github.com/TDamiao/ta-crypto/issues/34), [#37](https://github.com/TDamiao/ta-crypto/issues/37)) ([724a2e7](https://github.com/TDamiao/ta-crypto/commit/724a2e7adaced7b3ffca54047cce9670869719fd))
* **core:** validate NATR positive close domain and standardize period validation ([#29](https://github.com/TDamiao/ta-crypto/issues/29), [#30](https://github.com/TDamiao/ta-crypto/issues/30)) ([c2b1184](https://github.com/TDamiao/ta-crypto/commit/c2b1184db8435a7742457faae82cf324c6dbbc74))
* **deps:** update brace-expansion to 2.1.4 resolving GHSA-mh99-v99m-4gvg and GHSA-rgw5-rvv9-x895 ([#39](https://github.com/TDamiao/ta-crypto/issues/39)) ([dfc1960](https://github.com/TDamiao/ta-crypto/commit/dfc1960c0d9a9c41f5de3d46f82402eb56f47b31))
* **docs:** allow major-minor release line match in version consistency checker ([#22](https://github.com/TDamiao/ta-crypto/issues/22)) ([c0255c7](https://github.com/TDamiao/ta-crypto/commit/c0255c7274ee4b5d331b8f220ccbb987ac531b43))
* **performance:** correct cumulative percentReturn compounding semantics ([#27](https://github.com/TDamiao/ta-crypto/issues/27)) ([3c91d5f](https://github.com/TDamiao/ta-crypto/commit/3c91d5fc7b8ace39f5b14255334e159ca67a793b))
* **performance:** reject non-positive prices in logReturn and volatility consumers ([#28](https://github.com/TDamiao/ta-crypto/issues/28)) ([bef2853](https://github.com/TDamiao/ta-crypto/commit/bef285357b24b71b3f7e85d042b7cfdca4e7cf40))
* **security:** enforce high-only exception severity, persist CI audit report artifact, and configure pip dependabot ([#39](https://github.com/TDamiao/ta-crypto/issues/39)) ([619db4b](https://github.com/TDamiao/ta-crypto/commit/619db4b2dfc5f73f8a7fa683945508bcc3609104))
* **validation:** enforce non-negative volume in candle helpers ([#30](https://github.com/TDamiao/ta-crypto/issues/30)) ([bfcdc88](https://github.com/TDamiao/ta-crypto/commit/bfcdc88c6e5f94c61ae25a578abb6457b140be2d))


### Performance Improvements

* **bench:** calibrate scaling ratio guard to 50x to accommodate cloud VM GC sweeps ([#4](https://github.com/TDamiao/ta-crypto/issues/4)) ([4ea718b](https://github.com/TDamiao/ta-crypto/commit/4ea718b861b5559b5682a4afb0a0008be6a66694))
* **bench:** optimize 100k inner iterations and set 75x scaling ceiling ([#4](https://github.com/TDamiao/ta-crypto/issues/4)) ([8bda302](https://github.com/TDamiao/ta-crypto/commit/8bda302d28d693aa3970a9267d7c5aba46812bf5))
* **bench:** set 100x scaling ratio ceiling to absorb Node 18 VM GC sweeps ([#40](https://github.com/TDamiao/ta-crypto/issues/40), [#41](https://github.com/TDamiao/ta-crypto/issues/41)) ([9afb60e](https://github.com/TDamiao/ta-crypto/commit/9afb60ec0b2f335574dc29d629beac23f790acb7))
* **core:** optimize MFI, periodic VWAP, orderflow, and volatility regimes with rolling algorithms ([#31](https://github.com/TDamiao/ta-crypto/issues/31), [#32](https://github.com/TDamiao/ta-crypto/issues/32), [#33](https://github.com/TDamiao/ta-crypto/issues/33), [#34](https://github.com/TDamiao/ta-crypto/issues/34)) ([e66685e](https://github.com/TDamiao/ta-crypto/commit/e66685e920d998b40a3a9098974a304f53518a65))

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
