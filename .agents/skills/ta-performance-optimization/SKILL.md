---
name: ta-performance-optimization
description: Optimize rolling indicators and computational hot paths in ta-crypto using internal rolling engine primitives while guaranteeing mathematical parity. Trigger when refactoring rolling algorithms, removing window slicing, or benchmarking performance.
---

# Performance Optimization Skill

This skill guides algorithmic optimizations for rolling indicators and hot paths in `ta-crypto`.

---

## 1. Primary Rule: Parity Before Performance

> **No performance improvement is accepted without empirical parity evidence.**

Every optimization in `ta-crypto` MUST:
1. Preserve numerical output within `1e-10` parity against existing tests and golden fixtures.
2. Bounded memory consumption ($O(\text{period})$ or $O(1)$).
3. Avoid hidden mutable global state.
4. Pass all golden fixture and compatibility checks.

---

## 2. Shared Rolling Engine Primitives

`src/core/rolling.ts` provides optimized rolling window primitives backed by fixed-size circular buffers and monotonic queues:

| Primitive | Class | Operational Complexity | Use Case |
| --- | --- | --- | --- |
| **Rolling Sum** | `RollingSum` | $O(1)$ per update | Moving sums (VWAP, MFI, volume delta) |
| **Rolling Mean** | `RollingMean` | $O(1)$ per update | SMA, EMA seeding |
| **Rolling Standard Deviation** | `RollingStdDev` | $O(1)$ per update | Bollinger Bands (`bbands`), volatility |
| **Rolling Minimum** | `RollingMin` | Amortized $O(1)$ via Monotonic Queue | Stochastic oscillator, Donchian channels |
| **Rolling Maximum** | `RollingMax` | Amortized $O(1)$ via Monotonic Queue | Stochastic oscillator, Donchian channels |

Read [`docs/rolling-engine.md`](../../docs/rolling-engine.md) for detailed invariant requirements.

---

## 3. Optimization Workflow

```mermaid
graph TD
    A[1. Identify O(N*K) Hot Path] --> B[2. Establish Baseline Benchmark]
    B --> C[3. Refactor with Rolling Primitive]
    C --> D[4. Verify Parity & Golden Suite]
    D --> E[5. Run Benchmarks & Measure Ops/sec]
    E --> F[6. Document Tradeoffs]
```

### Step 1: Detect Slicing & Recomputation
Look for functions performing inner loops or repeated `.slice()` calls over historical windows:
- **`volatilityRegime`** (Issue [#34](https://github.com/TDamiao/ta-crypto/issues/34)): Replace repeated window slicing with rolling standard deviation primitives.
- **`volumeDelta` / `orderflowImbalance`** (Issue [#33](https://github.com/TDamiao/ta-crypto/issues/33)): Replace periodic array slicing with `RollingSum`.
- **`vwap` periodic** (Issue [#32](https://github.com/TDamiao/ta-crypto/issues/32)): Replace window summation with rolling price-volume and volume accumulators.
- **`mfi`** (Issue [#31](https://github.com/TDamiao/ta-crypto/issues/31)): Replace window slicing with rolling positive/negative flow sums.

### Step 2: Establish Baseline Measurement
Run the existing benchmark suite before modifying code:
```bash
npm run bench:rolling
npm run bench
```
Record the baseline operations/sec for relevant functions.

### Step 3: Implement Incremental Update Logic
Refactor the function in `src/core/` to use a circular buffer or `RollingSum`/`RollingStdDev` primitive.

### Step 4: Verify Mathematical Parity
Run full test suite:
```bash
npm run build
npm test
npm run test:golden
```
If outputs diverge by $> 1e-10$, reject the change and debug precision or alignment differences.

### Step 5: Execute Benchmark Comparison
Re-run benchmarks and compute speedup percentage:
```bash
npm run bench:rolling
```

---

## 4. Discouraged Practices

- **Unmeasured Micro-optimizations**: Avoid bitwise tricks or obscure syntax that reduces code readability for $< 2\%$ gain.
- **Algorithm Alterations**: Never swap a mathematically exact formula for an approximation unless mandated by an explicit issue specification.
- **Global Caching**: Never introduce module-level mutable caches that persist state across separate function calls.
- **Silent Floating-Point Accumulation Errors**: When using rolling sums ($\text{sum} = \text{sum} + x_{\text{new}} - x_{\text{old}}$), ensure precision loss over long series does not breach `1e-10` parity against naive sums.

---

## 5. Validation Checklist

- [ ] `npm test` passes without errors.
- [ ] `npm run test:golden` passes clean.
- [ ] Benchmark before/after numbers recorded.
- [ ] Code comments explain rolling state transitions.
