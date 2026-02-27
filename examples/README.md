# Examples

All examples are runnable from the repository root and use local `dist/` outputs.

## Run commands

```bash
npm run example:rsi
npm run example:vwap
npm run example:funding
npm run example:rsi:compat
npm run example:all
```

## Expected outputs

- `example:rsi`
  - Prints a table with recent rows containing `index`, `close`, `rsi`, and `signal`.
  - Warmup rows appear first as `signal: "warmup"`.
- `example:vwap`
  - Prints `Batch VWAP session` and `Streaming VWAP session`.
  - Both arrays should match index by index.
- `example:funding`
  - Prints funding series, cumulative values, and annualized APR values.
  - Cumulative is running sum; APR is scaled by `periodsPerYear * 100`.
- `example:rsi:compat`
  - Compares `rsi(14)` against `technicalindicators` RSI reference.
  - Prints max diff, tolerance, and `PASS`/`FAIL`.

## Notes

- These examples are smoke-entry points for contributors and docs users.
- For reproducibility, run `npm ci` once before running examples.
