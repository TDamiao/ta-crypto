# Financial & Mathematical Invariants Reference for ta-crypto

This document lists the mathematical formulas, initialization rules, domain constraints, and known semantic issues for indicators in `ta-crypto`.

---

## 1. Domain Constraints & Boundary Verification

| Function | Domain Constraint | Error / Handling Policy | Active Issue |
| --- | --- | --- | --- |
| **All Indicators** | `period > 0` | Throw `Error("period must be > 0")` | [#30](https://github.com/TDamiao/ta-crypto/issues/30) |
| **All Indicators** | Finite numbers only | Throw if `NaN`, `Infinity`, `-Infinity` via `assertFiniteSeries` | Existing contract |
| **`logReturn`** | Prices MUST be $> 0$ | non-positive ($P \le 0$) must throw or reject; zero/negative ratio invalid | [#28](https://github.com/TDamiao/ta-crypto/issues/28) |
| **`natr`** | Close price MUST be $> 0$ | $close \le 0$ causes division by zero or invalid percentage | [#29](https://github.com/TDamiao/ta-crypto/issues/29) |
| **`percentReturn`** | Cumulative mode | v0.3.4 arithmetic sum mode: $\sum r_i$. v0.4 compounding mode: $\prod (1+r_i) - 1$. | [#27](https://github.com/TDamiao/ta-crypto/issues/27) |
| **`vwap`** | Volume cumulative sum | Volume $= 0$ returns `null` for that index (no division by zero) | Existing contract |
| **`stoch`** | High-Low range | Range $= 0 \implies %K = 0$ (prevents $0/0$) | Existing contract |
| **`rsi`** | Average loss $= 0$ | $avgLoss = 0 \implies RSI = 100$ | Existing contract |

---

## 2. Initialization & Warmup Reference

| Indicator | Warmup Period | Initialization Seeding Method | First Non-Null Output Index |
| --- | --- | --- | --- |
| `sma(N)` | $N - 1$ | Arithmetic mean of $0 \dots N-1$ | Index $N - 1$ |
| `ema(N)` | $N - 1$ | Seeded with SMA of first $N$ prices | Index $N - 1$ |
| `rma(N)` | $N - 1$ | Seeded with SMA of first $N$ prices | Index $N - 1$ |
| `rsi(N)` | $N$ | Requires $N+1$ prices ($N$ price diffs). Seeded with mean gain/loss. | Index $N$ |
| `macd(fast, slow, signal)` | $slow - 1$ | MACD line = $EMA(fast) - EMA(slow)$. Signal line = $EMA(signal)$ of MACD. | Index $slow - 1$ (MACD line) |
| `bbands(N, stdDev)` | $N - 1$ | Population standard deviation of window $0 \dots N-1$ | Index $N - 1$ |
| `atr(N)` | $N - 1$ | RMA of True Range | Index $N - 1$ |
| `adx(N)` | $N - 1$ | Directional Movement (DM) RMA smoothing | Index $N - 1$ |

---

## 3. Alignment Invariants

1. **Zero Index Shift**: An indicator output array `out` MUST satisfy:
   $$\text{length}(out) = \text{length}(in)$$
2. **Causality Constraint**: `out[i]` MAY depend on `in[0...i]`. `out[i]` MUST NEVER depend on `in[j]` where $j > i$.
3. **Null Padding**: For all $k < \text{warmupIndex}$, `out[k] === null`.

---

## 4. Cumulative vs Compounded Returns

In `v0.3.4`:
- `logReturn(values, true)` calculates $\sum_{i=1}^k \ln(P_i / P_{i-1}) = \ln(P_k / P_0)$, which is exact log cumulative return.
- `percentReturn(values, true)` calculates $\sum_{i=1}^k \frac{P_i - P_{i-1}}{P_{i-1}}$, which is an arithmetic sum of periodic simple returns (e.g. $[100, 110, 121] \to 0.10 + 0.10 = 0.20$ instead of $0.21$).
- Issue [#27](https://github.com/TDamiao/ta-crypto/issues/27) mandates fixing `percentReturn(values, true)` to compound: $\prod_{i=1}^k (1 + r_i) - 1$.
- Any audit must ensure this breaking change is handled deliberately with issue reference and updated golden tests.
