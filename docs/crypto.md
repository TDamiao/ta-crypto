# Crypto-Market Utilities API Reference

The `ta-crypto/crypto` entry point exports specialized quantitative utilities designed for cryptocurrency markets, including session-anchored VWAP, perpetual funding rate metrics, statistical volatility regimes, and candle-derived orderflow pressure proxies.

---

## 1. Session VWAP (`vwapSession`)

Calculates Volume-Weighted Average Price anchored to explicit market sessions or funding intervals.

### Formula
$$\text{Typical Price}_t = \frac{H_t + L_t + C_t}{3}, \quad \text{SessionVWAP}_t = \frac{\sum_{i=s}^t \text{Typical}_i \cdot V_i}{\sum_{i=s}^t V_i}$$
where $s$ is the index of the first candle in the current session. The cumulative accumulators reset whenever the session identifier changes.

### Signature & Overloads
```ts
// 1. Separate array inputs with session IDs array or session mapping function
vwapSession(high, low, close, volume, sessionIds);
vwapSession(high, low, close, volume, timestamps, (time) => getSessionId(time));

// 2. Candle array or OHLCV object input
vwapSession(candles, "utc-day");
vwapSession(candles, (time, index) => getFundingSession(time));
```

### Invariants & Edge Cases
- **Strict Inequality Reset**: Accumulators reset if and only if `sessionId[t] !== sessionId[t-1]`.
- **Zero Volume Handling**: Returns `null` if cumulative volume for the current session is zero ($V = 0$).
- **Streaming Parity**: Streaming equivalent `createVWAPSession()` produces identical outputs within `1e-10`.

---

## 2. Perpetual Funding Rate Metrics

Perpetual futures contracts exchange periodic funding payments between long and short positions to tether mark prices to index spot prices.

### `fundingRateCumulative(fundingRates)`
- **Intent**: Running arithmetic sum of historical funding rates over time.
- **Formula**: $\text{CumFunding}_t = \sum_{i=0}^t \text{rate}_i$
- **Signature**: `fundingRateCumulative(fundingRates: number[]): Array<number | null>`
- **Warmup**: Valid starting at index `0`.

### `fundingRateAPR(values, periodsPerYear = 1095)`
- **Intent**: Annualizes periodic funding rates into an Annual Percentage Rate (APR percentage).
- **Formula**: $\text{APR}_t = \text{values}_t \times \text{periodsPerYear} \times 100\%$
- **Signature**: `fundingRateAPR(values: number[], periodsPerYear?: number): Array<number | null>`
- **Parameters**:
  - `values`: Array of periodic funding rates (e.g. `[0.0001, -0.00005]`).
  - `periodsPerYear`: Annualization factor representing total funding periods per year (default: `1095` for standard 8-hour funding: $365 \times 3$; use `8760` for 1-hour funding).
- **Scope Notice**: This function calculates annualized percentage rate without compounding or fee/leverage modeling.

---

## 3. Volatility Regime Classification (`volatilityRegime`)

Classifies market state into discrete volatility regimes based on rolling z-scores of annualized realized volatility.

### Formula
1. Calculate annualized realized volatility $\text{vol}_t = \text{realizedVolatility}(P, \text{length}, \text{periodsPerYear})_t$.
2. Calculate rolling mean $\mu_t$ and rolling population standard deviation $s_t$ of $\text{vol}$ over $\text{length}$ periods.
3. Compute the z-score:
   $$z_t = \frac{\text{vol}_t - \mu_t}{s_t}$$
4. Classify regime:
   $$\text{Regime}_t = \begin{cases} -1 & \text{if } z_t < \text{lowZ} \text{ (Low Volatility / Compression)} \\ 0 & \text{if } \text{lowZ} \le z_t \le \text{highZ} \text{ (Normal Volatility)} \\ +1 & \text{if } z_t > \text{highZ} \text{ (High Volatility / Expansion)} \end{cases}$$

### Signature & Defaults
```ts
volatilityRegime(
  input: PriceInput,
  length = 30,
  periodsPerYear = 365,
  lowZ = -0.5,
  highZ = 0.5
): Array<number | null>
```

### Domain & Invariants
- **Positive Price Domain**: Requires strictly positive prices ($P_t > 0$).
- **Zero Variance Protection**: When standard deviation is degenerate ($s_t \le 10^{-12}$), returns `0` (normal regime).
- **Warmup**: Returns `null` during initialization ($t < 2 \cdot \text{length}$).

---

## 4. Candle-Derived Orderflow Proxies

These functions estimate buying and selling pressure from bar-level price direction and volume.

> [!IMPORTANT]
> These indicators are **candle-derived proxies** from OHLCV data. They do not consume tick-by-tick trade executions or L2/L3 order-book depth feeds and must not be confused with direct market depth.

### `signedVolume(input, close?, volume?)`
- **Intent**: Assigns directional sign to candle volume based on bar close versus open.
- **Formula**:
  $$\text{SignedVol}_t = \begin{cases} +V_t & \text{if } C_t > O_t \\ -V_t & \text{if } C_t < O_t \\ 0 & \text{if } C_t = O_t \end{cases}$$
- **Signature**: `signedVolume(input, close?, volume?): number[]`
- **Warmup**: Valid starting at index `0`.

### `volumeDelta(input, close?, volume?, length = 14)`
- **Intent**: Rolling cumulative sum of signed candle volume over `length` periods.
- **Formula**: $\text{VolumeDelta}_t = \sum_{i=0}^{\text{length}-1} \text{SignedVol}_{t-i}$
- **Signature**: `volumeDelta(input, close?, volume?, length?: number): Array<number | null>`
- **Complexity**: $O(1)$ circular-buffer rolling sum.
- **Warmup**: First valid value at index $\text{length} - 1$.

### `orderflowImbalance(input, close?, volume?, length = 14)`
- **Intent**: Ratio of rolling signed volume to rolling total volume (bounded in $[-1.0, +1.0]$).
- **Formula**:
  $$\text{OFI}_t = \frac{\sum_{i=0}^{\text{length}-1} \text{SignedVol}_{t-i}}{\sum_{i=0}^{\text{length}-1} V_{t-i}}$$
- **Signature**: `orderflowImbalance(input, close?, volume?, length?: number): Array<number | null>`
- **Complexity**: $O(1)$ dual rolling sum updates.
- **Warmup**: Emits at index $\text{length} - 1$.
- **Edge Cases**: Returns `null` if total window volume is zero ($\sum V = 0$).

---

## 5. Summary of Crypto Module Exports

| Function | Signature Summary | Primary Input | Output Range |
|---|---|---|---|
| `vwapSession` | `(high, low, close, volume, sessionIds)` | OHLCV + Session ID | Price level or `null` |
| `fundingRateCumulative` | `(fundingRates)` | `number[]` | Running sum |
| `fundingRateAPR` | `(values, periodsPerYear = 1095)` | `number[]` | Annualized percentage array |
| `volatilityRegime` | `(prices, length=30, periods=365, lowZ=-0.5, highZ=0.5)` | Positive prices ($P_t > 0$) | `{-1, 0, 1, null}` |
| `signedVolume` | `(open, close, volume)` | OCV | `[-V, +V]` |
| `volumeDelta` | `(open, close, volume, length = 14)` | OCV + length | Rolling sum |
| `orderflowImbalance` | `(open, close, volume, length = 14)` | OCV + length | `[-1.0, +1.0]` or `null` |
