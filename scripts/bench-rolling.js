import { performance } from "node:perf_hooks";
import { bbands, sma } from "../dist/core/overlap.js";

function makeSeries(length, start = 100) {
  const values = new Array(length);
  let value = start;
  for (let i = 0; i < length; i++) {
    value += Math.sin(i * 0.017) * 0.7 + Math.cos(i * 0.003) * 0.2;
    values[i] = value;
  }
  return values;
}

function measure(fn, runs) {
  fn();
  const started = performance.now();
  for (let i = 0; i < runs; i++) fn();
  return (performance.now() - started) / runs;
}

function legacySum(values, start, end) {
  let total = 0;
  for (let i = start; i <= end; i++) total += values[i];
  return total;
}

function legacyMean(values, start, end) {
  return legacySum(values, start, end) / (end - start + 1);
}

function legacyStdDev(values, start, end) {
  const mean = legacyMean(values, start, end);
  let squared = 0;
  for (let i = start; i <= end; i++) {
    const delta = values[i] - mean;
    squared += delta * delta;
  }
  return Math.sqrt(squared / (end - start + 1));
}

function legacySma(values, period) {
  const out = new Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i++) {
    out[i] = legacyMean(values, i - period + 1, i);
  }
  return out;
}

function legacyBbands(values, period, deviations) {
  const basis = legacySma(values, period);
  const upper = new Array(values.length).fill(null);
  const lower = new Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i++) {
    const deviation = legacyStdDev(values, i - period + 1, i);
    upper[i] = basis[i] + deviations * deviation;
    lower[i] = basis[i] - deviations * deviation;
  }
  return { basis, upper, lower };
}

function report(name, length, before, after) {
  const runs = length === 10_000 ? 30 : 5;
  const beforeMs = measure(before, runs);
  const afterMs = measure(after, runs);
  const speedup = beforeMs / afterMs;
  console.log(
    `${String(length).padStart(6)} ${name.padEnd(12)} before=${beforeMs.toFixed(3)} ms ` +
    `after=${afterMs.toFixed(3)} ms speedup=${speedup.toFixed(2)}x`
  );
}

for (const length of [10_000, 100_000]) {
  const close = makeSeries(length);
  report("sma(20)", length, () => legacySma(close, 20), () => sma(close, 20));
  report("bbands(20)", length, () => legacyBbands(close, 20, 2), () => bbands(close, 20, 2));
}
