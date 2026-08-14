# Technical Indicators API Reference

This document provides the canonical technical contract for all batch indicators exported by `ta-crypto` and `ta-crypto/indicators`.

---

## 1. General Indicator Invariants

1. **1-to-1 Array Length Alignment**: Output array length strictly matches input array length (`output.length === input.length`).
2. **Deterministic Warmup (`null`)**: Elements prior to the indicator's warmup period are returned as `null`. No leading elements are dropped.
3. **Strict Domain & Parameter Validation**:
   - All period parameters (`length`, `period`, `kPeriod`, `dPeriod`, `fastLength`, etc.) must be finite positive integers ($\ge 1$). Non-integers, zeros, negative numbers, `NaN`, and `Infinity` throw immediate errors.
   - Prices must be finite numbers. Logarithmic and normalized indicators (`logReturn`, `realizedVolatility`, `natr`) require strictly positive prices ($P_t > 0$).
   - Volumes must be finite non-negative numbers ($V_t \ge 0$).
4. **Empty Input Handling**: Supplying empty arrays (`[]`) returns an empty array (`[]`) or empty series object.

---

## 2. Overlap Studies

### `sma(input, length = 14)`
- **Intent**: Simple Moving Average calculated as the arithmetic mean of the last `length` prices.
- **Formula**: $\text{SMA}_t = \frac{1}{N}\sum_{i=0}^{N-1} P_{t-i}$
- **Signature**: `sma(input: PriceInput, length?: number): Array<number | null>`
- **Parameters**: `input` (`number[]` or `Candle[]`), `length` (integer $\ge 1$, default `14`).
- **Warmup**: `null` for indices $0 \le t < \text{length} - 1$. First valid index is $\text{length} - 1$.
- **Edge Cases**: Constant price series emits the constant price.

### `ema(input, length = 14)`
- **Intent**: Exponential Moving Average using weighting factor $\alpha = \frac{2}{\text{length} + 1}$.
- **Formula**: $\text{EMA}_t = \alpha P_t + (1 - \alpha)\text{EMA}_{t-1}$, seeded by the SMA of the first `length` prices.
- **Signature**: `ema(input: PriceInput, length?: number): Array<number | null>`
- **Parameters**: `input` (`PriceInput`), `length` (integer $\ge 1$, default `14`).
- **Warmup**: `null` for indices $0 \le t < \text{length} - 1$. First valid value at $\text{length} - 1$ is the seed SMA.

### `rma(input, length = 14)`
- **Intent**: Wilder's Modified Moving Average (Running Moving Average) using $\alpha = \frac{1}{\text{length}}$.
- **Formula**: $\text{RMA}_t = \frac{(\text{length} - 1)\text{RMA}_{t-1} + P_t}{\text{length}}$, seeded by the SMA of the first `length` prices.
- **Signature**: `rma(input: PriceInput, length?: number): Array<number | null>`
- **Warmup**: First valid index is $\text{length} - 1$.

### Price Aggregates: `hl2`, `hlc3`, `ohlc4`
- **Intent**: Synthetic price points per bar.
- **Formulas**:
  - `hl2`: $\frac{H + L}{2}$
  - `hlc3`: $\frac{H + L + C}{3}$ (Typical Price)
  - `ohlc4`: $\frac{O + H + L + C}{4}$
- **Signatures**:
  - `hl2(input, low?): number[]`
  - `hlc3(input, low?, close?): number[]`
  - `ohlc4(input, high?, low?, close?): number[]`
- **Warmup**: None; valid starting at index `0`.

### `vwap(input, low?, close?, volume?, length?)`
- **Intent**: Volume-Weighted Average Price.
- **Cumulative Mode (default when `length` is omitted)**:
  $$\text{VWAP}_t = \frac{\sum_{i=0}^t \text{typical}_i \cdot V_i}{\sum_{i=0}^t V_i}$$
- **Periodic/Rolling Mode (when `length` is provided)**:
  $$\text{RollingVWAP}_t = \frac{\sum_{i=0}^{N-1} \text{typical}_{t-i} \cdot V_{t-i}}{\sum_{i=0}^{N-1} V_{t-i}}$$
- **Signatures**: Accepts separate `(high, low, close, volume, length?)` arrays or candle array/OHLCV object.
- **Warmup**: Cumulative mode is valid at index `0` (or `null` if cumulative volume is 0). Periodic mode is `null` for $t < \text{length} - 1$.
- **Edge Cases**: If cumulative or window volume is zero ($V = 0$), returns `null` for that index.

### `bbands(input, length = 20, stdDev = 2)`
- **Intent**: Bollinger Bands volatility envelope based on rolling mean and population standard deviation.
- **Formulas**:
  - $\text{basis}_t = \text{SMA}(P, \text{length})_t$
  - $\text{upper}_t = \text{basis}_t + \text{stdDev} \cdot \sigma_t$
  - $\text{lower}_t = \text{basis}_t - \text{stdDev} \cdot \sigma_t$
- **Signature**: `bbands(input: PriceInput, length?: number, stdDev?: number): { basis: Array<number | null>, upper: Array<number | null>, lower: Array<number | null> }`
- **Parameters**: `length` (integer $\ge 1$, default `20`), `stdDev` (finite number $\ge 0$, default `2`).
- **Warmup**: All three bands emit `null` for $0 \le t < \text{length} - 1$.
- **Edge Cases**: If price is constant across the window ($\sigma = 0$), `upper === basis === lower`.

---

## 3. Momentum Oscillators

### `rsi(input, length = 14)`
- **Intent**: Relative Strength Index measuring the speed and magnitude of price movements.
- **Formula**:
  $$\text{RS} = \frac{\text{RMA}(\text{gain}, N)}{\text{RMA}(\text{loss}, N)}, \quad \text{RSI} = 100 - \frac{100}{1 + \text{RS}}$$
- **Signature**: `rsi(input: PriceInput, length?: number): Array<number | null>`
- **Warmup**: `null` for $0 \le t < \text{length}$. First valid index is $\text{length}$ (requires $N$ price changes from $N+1$ prices).
- **Edge Cases**: If average loss is zero ($\text{loss} = 0$), returns `100`.

### `macd(input, fastLength = 12, slowLength = 26, signalLength = 9)`
- **Intent**: Moving Average Convergence Divergence trend-following momentum oscillator.
- **Formulas**:
  - $\text{MACD}_t = \text{EMA}(P, \text{fast})_t - \text{EMA}(P, \text{slow})_t$
  - $\text{Signal}_t = \text{EMA}(\text{MACD}, \text{signal})_t$
  - $\text{Histogram}_t = \text{MACD}_t - \text{Signal}_t$
- **Signature**: `macd(input: PriceInput, fastLength?: number, slowLength?: number, signalLength?: number): { macd: Array<number | null>, signal: Array<number | null>, histogram: Array<number | null> }`
- **Validation**: Requires `fastLength < slowLength`.
- **Warmup**: `macd` emits at $\text{slowLength} - 1$; `signal` and `histogram` require full signal convergence.

### `stoch(input, low?, close?, kPeriod = 14, dPeriod = 3, smoothK = 3)`
- **Intent**: Stochastic Oscillator comparing closing price to high-low range over `kPeriod`.
- **Formulas**:
  - $\%K_t = \frac{C_t - LL_t}{HH_t - LL_t} \times 100$
  - $\%D_t = \text{SMA}(\%K, \text{dPeriod})_t$
- **Signature**: `stoch(input: number[] | Candle[] | OHLCVInput, low?: number[], close?: number[], kPeriod?: number, dPeriod?: number, smoothK?: number): { k: Array<number | null>, d: Array<number | null> }`
- **Warmup**: `%K` emits at $\text{kPeriod} - 1$; `%D` emits at $\text{kPeriod} + \text{dPeriod} - 2$.
- **Edge Cases**: When high equals low over the window ($HH === LL$), $\%K$ returns `0`.

---

## 4. Volatility Indicators

### `trueRange(input, low?, close?)`
- **Formula**: $\text{TR}_t = \max(H_t - L_t, |H_t - C_{t-1}|, |L_t - C_{t-1}|)$, with $\text{TR}_0 = H_0 - L_0$.
- **Signature**: `trueRange(input, low?, close?): Array<number | null>`
- **Warmup**: Valid starting at index `0`.

### `atr(input, low?, close?, length = 14)`
- **Intent**: Average True Range using Wilder's RMA over True Range.
- **Formula**: $\text{ATR}_t = \text{RMA}(\text{TR}, \text{length})_t$
- **Signature**: `atr(input, low?, close?, length?: number): Array<number | null>`
- **Warmup**: `null` for $0 \le t < \text{length} - 1$. First valid index is $\text{length} - 1$.

### `natr(input, low?, close?, length = 14)`
- **Intent**: Normalized Average True Range as a percentage of closing price.
- **Formula**: $\text{NATR}_t = \frac{\text{ATR}_t}{C_t} \times 100$
- **Signature**: `natr(input, low?, close?, length?: number): Array<number | null>`
- **Domain Constraint**: Enforces strictly positive closing prices ($C_t > 0$). Non-positive or non-finite closing prices throw index-aware errors.
- **Warmup**: First valid index is $\text{length} - 1$.

---

## 5. Returns & Performance Metrics

### `percentReturn(input, optionsOrCumulative?)`
- **Intent**: Simple rate of return across time periods or compounded cumulative return.
- **Signatures**:
  ```ts
  // 1. Periodic simple return: (P_t / P_{t-1}) - 1
  percentReturn(prices);
  percentReturn(prices, { mode: "periodic" });

  // 2. Compounded cumulative return: (P_t / P_0) - 1
  percentReturn(prices, { cumulative: true });
  percentReturn(prices, { mode: "compound" });

  // 3. Arithmetic sum of periodic returns: sum(r_1 .. r_t)
  percentReturn(prices, { mode: "sum" });

  // Deprecated legacy boolean signature (invokes compound mode)
  percentReturn(prices, true);
  ```
- **Warmup**: Index `0` is `null` (baseline price); first return is emitted at index `1`.
- **Numerical Example**: For `[100, 110, 121]`:
  - Periodic: `[null, 0.10, 0.10]`
  - Compounded cumulative: `[null, 0.10, 0.21]` (+21% total return)
  - Arithmetic sum: `[null, 0.10, 0.20]` (+20% sum)

### `sumPeriodicReturns(input)`
- **Intent**: Explicit helper for arithmetic summation of periodic simple returns ($\sum_{i=1}^t r_i$).
- **Signature**: `sumPeriodicReturns(input: PriceInput): Array<number | null>`
- **Warmup**: Index `0` is `null`; emits at index `1`.

### `logReturn(input, cumulative = false)`
- **Intent**: Continuously compounded rate of return using natural logarithm.
- **Formulas**:
  - Periodic: $r_{\log, t} = \ln(P_t / P_{t-1})$
  - Cumulative: $R_{\log, t} = \sum \ln(P_t / P_{t-1}) = \ln(P_t / P_0)$
- **Signature**: `logReturn(input: PriceInput, cumulative?: boolean): Array<number | null>`
- **Domain Constraint**: Prices must be strictly positive ($P_t > 0$).
- **Warmup**: Index `0` is `null`; emits at index `1`.

### `realizedVolatility(input, length = 30, periodsPerYear = 365)`
- **Intent**: Annualized historical volatility of log returns.
- **Formula**: $\text{Vol}_t = \sigma_{\text{pop}}(r_{\log}, \text{length})_t \times \sqrt{\text{periodsPerYear}}$
- **Signature**: `realizedVolatility(input: PriceInput, length?: number, periodsPerYear?: number): Array<number | null>`
- **Domain Constraint**: Requires positive prices ($P_t > 0$) and `periodsPerYear > 0`.
- **Warmup**: `null` for $0 \le t < \text{length}$. First valid index is $\text{length}$.

---

## 6. Volume & Flow Indicators

### `obv(input, volume?)`
- **Intent**: On-Balance Volume measuring buying and selling volume pressure.
- **Formula**:
  $$\text{OBV}_0 = 0, \quad \text{OBV}_t = \text{OBV}_{t-1} + \begin{cases} +V_t & \text{if } C_t > C_{t-1} \\ -V_t & \text{if } C_t < C_{t-1} \\ 0 & \text{if } C_t = C_{t-1} \end{cases}$$
- **Signature**: `obv(input: PriceInput, volume?: number[]): Array<number | null>`
- **Warmup**: First value at index `0` is `0`.

### `mfi(input, low?, close?, volume?, length = 14)`
- **Intent**: Money Flow Index (volume-weighted RSI).
- **Formula**: Ratio of positive to negative typical price money flows over `length` periods.
- **Signature**: `mfi(input, low?, close?, volume?, length?: number): Array<number | null>`
- **Warmup**: `null` for $0 \le t < \text{length}$. First valid index is $\text{length}$.
- **Edge Cases**: If negative money flow is zero, returns `100`. If total money flow is zero, returns `50`.

---

## 7. Trend Indicators

### `adx(input, low?, close?, length = 14, lensig = 14)`
- **Intent**: Average Directional Movement Index quantifying trend strength independent of direction.
- **Outputs**:
  - `adx`: Smoothed directional index ($0$ to $100$).
  - `plusDI`: Positive Directional Indicator ($+\text{DI}$).
  - `minusDI`: Negative Directional Indicator ($-\text{DI}$).
- **Signature**: `adx(input, low?, close?, length?: number, lensig?: number): { adx: Array<number | null>, plusDI: Array<number | null>, minusDI: Array<number | null> }`
- **Warmup**: Emits at index $\text{length} - 1$. Converges with external libraries after standard burn-in (see [Compatibility](compatibility.md)).

---

## 8. Summary Table of Batch Indicators

| Function | Module Barrel | Default Length | Input Domain | Output Shape | First Valid Index |
|---|---|---|---|---|---|
| `sma` | `indicators` | `14` | $P_t \in \mathbb{R}$ | `Array<number \| null>` | `length - 1` |
| `ema` | `indicators` | `14` | $P_t \in \mathbb{R}$ | `Array<number \| null>` | `length - 1` |
| `rma` | `indicators` | `14` | $P_t \in \mathbb{R}$ | `Array<number \| null>` | `length - 1` |
| `hl2` | `indicators` | None | $H, L \in \mathbb{R}$ | `number[]` | `0` |
| `hlc3` | `indicators` | None | $H, L, C \in \mathbb{R}$ | `number[]` | `0` |
| `ohlc4` | `indicators` | None | $O, H, L, C \in \mathbb{R}$ | `number[]` | `0` |
| `vwap` | `indicators` | Cumulative | $H, L, C \in \mathbb{R}, V \ge 0$ | `Array<number \| null>` | `0` |
| `bbands` | `indicators` | `20, 2` | $P_t \in \mathbb{R}$ | `{ basis, upper, lower }` | `length - 1` |
| `rsi` | `indicators` | `14` | $P_t \in \mathbb{R}$ | `Array<number \| null>` | `length` |
| `macd` | `indicators` | `12, 26, 9` | $P_t \in \mathbb{R}$ | `{ macd, signal, histogram }` | `slowLength - 1` |
| `stoch` | `indicators` | `14, 3, 3` | $H, L, C \in \mathbb{R}$ | `{ k, d }` | `kPeriod - 1` |
| `trueRange` | `indicators` | None | $H, L, C \in \mathbb{R}$ | `Array<number \| null>` | `0` |
| `atr` | `indicators` | `14` | $H, L, C \in \mathbb{R}$ | `Array<number \| null>` | `length - 1` |
| `natr` | `indicators` | `14` | $H, L \in \mathbb{R}, C > 0$ | `Array<number \| null>` | `length - 1` |
| `percentReturn` | `indicators` | periodic | $P_t \in \mathbb{R}$ | `Array<number \| null>` | `1` |
| `sumPeriodicReturns` | `indicators` | None | $P_t \in \mathbb{R}$ | `Array<number \| null>` | `1` |
| `logReturn` | `indicators` | periodic | $P_t > 0$ | `Array<number \| null>` | `1` |
| `realizedVolatility` | `indicators` | `30, 365` | $P_t > 0$ | `Array<number \| null>` | `length` |
| `obv` | `indicators` | None | $P_t \in \mathbb{R}, V \ge 0$ | `Array<number \| null>` | `0` |
| `mfi` | `indicators` | `14` | $H, L, C \in \mathbb{R}, V \ge 0$ | `Array<number \| null>` | `length` |
| `adx` | `indicators` | `14, 14` | $H, L, C \in \mathbb{R}$ | `{ adx, plusDI, minusDI }` | `length - 1` |
