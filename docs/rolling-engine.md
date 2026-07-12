# Rolling engine invariants

The internal rolling engine in `src/core/rolling.ts` centralizes fixed-window sum, mean, population standard deviation, minimum, and maximum calculations.

## Behavior

- A window of period `N` returns `null` for its first `N - 1` updates.
- The first numeric result includes input indices `0..N - 1`.
- Every later result removes exactly the oldest value before including the newest value.
- `reset()` restores a newly constructed engine's state.
- Periods must be positive integers. Stateful primitive inputs must be finite numbers; public batch APIs retain their existing validation layer.
- Standard deviation uses population variance, matching the existing `bbands` behavior.

These rules preserve the library's established warmup and alignment semantics. The engine is internal for now; public indicator APIs remain unchanged.

## Complexity

Rolling sum, mean, and standard deviation use a fixed-size circular buffer and update in constant time. Rolling minimum and maximum use monotonic queues with amortized constant-time updates. Storage is bounded by the configured period.

## Verification

Run the behavioral suite and focused deterministic benchmark:

```bash
npm test
npm run test:golden
npm run bench:rolling
```

The focused benchmark reports `sma` and `bbands` runs for both 10,000 and 100,000 values against their previous implementations.
