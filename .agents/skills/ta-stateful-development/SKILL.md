---
name: ta-stateful-development
description: Implement or review streaming, stateful indicator objects with next() and reset() methods in ta-crypto. Trigger when adding new stateful constructors to src/stateful.ts, auditing batch/stateful parity, or testing streaming reset behavior.
---

# Stateful/Streaming Indicator Development Skill

This skill guides the implementation, audit, and testing of streaming indicators in `src/stateful.ts`.

---

## 1. Interface & Core Invariants

All stateful indicators in `ta-crypto` implement the generic `StatefulIndicator<TIn, TOut>` interface:

```ts
export type StatefulIndicator<TIn, TOut> = {
  next(value: TIn): TOut;
  reset(): void;
};
```

### Critical Invariants

1. **Batch/Stateful Parity**: Feeding an array of inputs into `.next()` sequentially MUST yield identical output values (within `1e-10` tolerance) as calling the corresponding batch indicator function on the entire array.
2. **Warmup Alignment**: `.next()` MUST return `null` during warmup for the exact number of steps required by the batch indicator warmup contract.
3. **Reset Completeness**: Calling `.reset()` MUST restore internal state to a pristine condition identical to a newly instantiated object. Subsequent `.next()` calls must match a fresh instance.
4. **Instance Independence**: Multiple instances of a stateful indicator MUST maintain completely isolated internal state variables. No shared module-level state.
5. **Bounded Memory Bounded Time**: `.next()` MUST operate in $O(1)$ time and $O(\text{period})$ memory. **NEVER** push inputs into an unbounded history array and recompute batch functions on every `.next()` call.

---

## 2. Mandatory 8-Point Specification Checklist

Before implementing any new stateful constructor (e.g. `createMACD`, `createATR`, `createBBANDS` from [#16](https://github.com/TDamiao/ta-crypto/issues/16), or streaming orderflow from [#35](https://github.com/TDamiao/ta-crypto/issues/35), [#36](https://github.com/TDamiao/ta-crypto/issues/36)), define:

1. **State Variables**: Private primitive numbers, accumulators, or fixed-capacity rolling buffers (`RollingMean`, `RollingSum`, etc.).
2. **Initialization Logic**: Parameter validation (`period > 0`) and initial variable states.
3. **Warmup Condition**: Predicate for returning `null` vs calculated value.
4. **Update Equation**: Recurrence relation for updating state incrementally on new input.
5. **Reset Logic**: Re-initialization of every state variable to pristine state.
6. **Batch Equivalent**: Corresponding batch function in `src/core/`.
7. **Parity Tolerance**: Default `1e-10`.
8. **Input Validation**: Informative errors on non-finite inputs (`NaN`, `Infinity`).

---

## 3. Implementation Template

```ts
import { StatefulIndicator } from "./stateful.js";
import { RollingMean } from "./core/rolling.js";

export function createMyIndicator(period = 14): StatefulIndicator<number, number | null> {
  if (period <= 0) {
    throw new Error("period must be > 0");
  }

  const rolling = new RollingMean(period);
  // Additional state variables

  return {
    next(value: number): number | null {
      if (!Number.isFinite(value)) {
        throw new Error("value must be a finite number");
      }

      // Compute incremental update
      return rolling.next(value);
    },

    reset(): void {
      rolling.reset();
      // Reset additional state variables
    }
  };
}
```

---

## 4. Required Unit Test Suite

Every stateful indicator MUST include tests in `test/contracts.test.mjs` verifying all 6 standard test cases:

```ts
// 1. Full Stream Parity against Batch API
const stateful = createSMA(14);
const statefulOutputs = inputPrices.map(p => stateful.next(p));
const batchOutputs = sma(inputPrices, 14);
assert.deepStrictEqual(statefulOutputs, batchOutputs);

// 2. Exact Warmup Null Count
const fresh = createSMA(14);
for (let i = 0; i < 13; i++) {
  assert.strictEqual(fresh.next(100), null);
}
assert.notStrictEqual(fresh.next(100), null);

// 3. Reset Restoration
stateful.reset();
const postResetOutputs = inputPrices.map(p => stateful.next(p));
assert.deepStrictEqual(postResetOutputs, batchOutputs);

// 4. Instance Independence
const a = createSMA(14);
const b = createSMA(14);
a.next(100);
assert.strictEqual(b.next(100), null); // b unaffected by a

// 5. Input Validation
assert.throws(() => createSMA(0), /period must be > 0/);
assert.throws(() => createSMA(14).next(NaN), /must be a finite number/);

// 6. Reuse After Multiple Resets
stateful.reset();
stateful.reset();
const multiResetOutputs = inputPrices.map(p => stateful.next(p));
assert.deepStrictEqual(multiResetOutputs, batchOutputs);
```

---

## 5. Validation

Run tests and verify golden assertions:
```bash
npm run build
npm test
npm run test:golden
```
