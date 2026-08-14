# Compatibility

`ta-crypto` relies on two complementary tiers of numerical evidence:

1. **Golden Fixtures (`test/fixtures/golden.json`)**: Protect against internal regressions across versions with strict `1e-10` tolerances.
2. **External Parity Matrix (`scripts/compat-policy.json`)**: Evaluates indicators against independent industry reference implementations: **TA-Lib** (Python/C), **`technicalindicators`** (Node.js), and **`pandas-ta`** (Python).

---

## Policy Source of Truth

Tolerances, burn-in periods, alignment rules, and blocking reference definitions are formally declared in [`scripts/compat-policy.json`](../scripts/compat-policy.json) and enforced via automated test assertions.

Reference series are left-padded with `null` to match the input length. Comparisons begin at the configured `burnIn` index and evaluate only overlapping non-null data points.

---

## External Parity Matrix

| Indicator | Formula / Standard Reference | Burn-in | Tolerance | Blocking References | Non-Blocking Reference |
| --- | --- | ---: | ---: | --- | --- |
| **SMA(14)** | Simple Moving Average: $\frac{1}{N}\sum p_i$ | 14 | `1e-10` | TA-Lib, `technicalindicators` | pandas-ta |
| **EMA(14)** | Exponential Moving Average seeded by SMA of first $N$ prices; $\alpha = \frac{2}{N+1}$ | 14 | `1e-10` | TA-Lib, `technicalindicators` | pandas-ta |
| **RSI(14)** | Wilder's Relative Strength Index using RMA smoothing of gains/losses | 28 | `5e-2` | TA-Lib, `technicalindicators` | pandas-ta |
| **MACD(12,26,9)** | Appel (1979): Fast EMA(12) - Slow EMA(26); Signal = EMA(MACD, 9); Hist = MACD - Signal | 80 | `2e-2` | TA-Lib, `technicalindicators` | pandas-ta |
| **BBANDS(20,2)** | Bollinger Bands: Basis = SMA(20); Bands = Basis $\pm 2\sigma$ (population standard deviation) | 20 | `1e-10` | TA-Lib, `technicalindicators` | pandas-ta |
| **ATR(14)** | Wilder's Average True Range using RMA smoothing over True Range | 56 | `1.5e-1` | TA-Lib, `technicalindicators` | pandas-ta |
| **NATR(14)** | Normalized ATR: $\frac{\text{ATR}(14)}{\text{close}} \times 100$ | 56 | `1.5e-1` | TA-Lib | pandas-ta |
| **ADX(14)** | Wilder's Average Directional Movement Index (+DI, -DI, DX smoothed via RMA) | 90 | `1.5` | TA-Lib, `technicalindicators` | pandas-ta |
| **OBV** | Granville (1963): On-Balance Volume running sum of directional candle volume | 1 | `1e-10` | TA-Lib, `technicalindicators` | pandas-ta |
| **MFI(14)** | Quong & May (1989): Money Flow Index based on typical price money flow ratio | 28 | `1.5e-1` | TA-Lib, `technicalindicators` | pandas-ta |
| **STOCH(14,3)** | Lane (1950s): Stochastic Oscillator $\%K = \frac{C - LL}{HH - LL}\times 100$, $\%D = \text{SMA}(\%K, 3)$ | 20 | `1e-10` | TA-Lib, `technicalindicators` | pandas-ta |

*Note: TA-Lib and `technicalindicators` are blocking CI gates. `pandas-ta` serves as non-blocking telemetry.*

---

## Deterministic Market-Shape Fixtures

External compatibility tests execute against four distinct deterministic market scenarios generated in `scripts/export-compat-vectors.js`:

1. **Cycle (`cycle`)**: Sinusoidal oscillating cyclical waves across 320 bars.
2. **Trend (`trend`)**: Exponential bullish expansion with pullbacks and volume acceleration.
3. **Chop (`chop`)**: High-frequency mean-reverting chop with alternating price oscillations.
4. **Volatile (`volatile`)**: Heavy regime shocks, periodic gap jumps, and volume surges.

---

## Initialization and Burn-In Semantics

Recursive smoothing indicators (Wilder's RMA in RSI, ATR, NATR, ADX, and EMA in MACD) require documented burn-in periods to converge with external libraries due to initialization choices:

- **ATR & NATR**: `ta-crypto` initializes Wilder's RMA from the arithmetic mean of the first `period` true ranges and produces its first valid output at index `period - 1`.
- **ADX / +DI / -DI**: `ta-crypto` initializes directional movement RMA smoothing at index `period - 1`. Other libraries (e.g. TA-Lib) delay initial ADX output until index `2 * period - 1` and accumulate seed averages differently. After 90 bars of burn-in, outputs converge within `1.5` index points.
- **RSI**: Initialized with SMA of gains and losses over the first $N$ price changes, emitting at index $N$.

---

## Golden-Only Indicators

Indicators specifically designed for crypto-market mechanics or custom financial models are verified via internal golden parity suites (`test/fixtures/golden.json`) with `1e-10` tolerance:

- `vwapSession` / `createVWAPSession` (session-aware VWAP with boundary reset)
- `fundingRateCumulative` & `fundingRateAPR` (perpetual futures funding arbitrage metrics)
- `realizedVolatility` & `createRealizedVolatility` (log-return annualized standard deviation)
- `volatilityRegime` & `createVolatilityRegime` (z-score classified volatility regime transitions)
- `volumeDelta` & `createVolumeDelta` (directional bar volume accumulation)
- `orderflowImbalance` & `createOrderflowImbalance` (signed volume orderflow pressure ratio)
- `sumPeriodicReturns`, `percentReturn`, and `logReturn` (periodic, compounded, and logarithmic returns)

---

## Running Compatibility Checks

To validate against Node.js `technicalindicators`:
```bash
npm run test:compat:technicalindicators
```

To validate against Python reference implementations (TA-Lib and pandas-ta in Python 3.12):
```bash
python -m pip install -r scripts/requirements-compat.txt
npm run test:compat:python
```

To run the complete test and compatibility suite:
```bash
npm run test && npm run test:golden && npm run test:compat:technicalindicators
```

---

## Related Pages

- [Indicators](indicators.md)
- [Stateful API](stateful.md)
- [Crypto utilities](crypto.md)
- [Trust and verification](trust.md)
