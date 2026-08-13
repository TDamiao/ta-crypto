import { performance } from "node:perf_hooks";
import { bbands, sma, vwap } from "../dist/core/overlap.js";
import { mfi } from "../dist/core/volume.js";
import { orderflowImbalance, volatilityRegime, volumeDelta } from "../dist/core/crypto.js";
import { realizedVolatility } from "../dist/core/performance.js";

function makeSeries(length, start = 100) {
  const values = new Array(length);
  let value = start;
  for (let i = 0; i < length; i++) {
    value += Math.sin(i * 0.017) * 0.7 + Math.cos(i * 0.003) * 0.2;
    values[i] = Math.max(1, value);
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

function legacyVwap(high, low, close, volume, length) {
  const typical = new Array(high.length);
  for (let i = 0; i < high.length; i++) typical[i] = (high[i] + low[i] + close[i]) / 3;
  const out = new Array(high.length).fill(null);
  for (let i = length - 1; i < high.length; i++) {
    let pv = 0;
    let v = 0;
    for (let j = i - length + 1; j <= i; j++) {
      pv += typical[j] * volume[j];
      v += volume[j];
    }
    out[i] = v === 0 ? null : pv / v;
  }
  return out;
}

function legacyMfi(high, low, close, volume, length) {
  const len = close.length;
  const tp = new Array(len);
  const mf = new Array(len);
  for (let i = 0; i < len; i++) {
    tp[i] = (high[i] + low[i] + close[i]) / 3;
    mf[i] = tp[i] * volume[i];
  }
  const out = new Array(len).fill(null);
  for (let i = length; i < len; i++) {
    let pos = 0;
    let neg = 0;
    for (let j = i - length + 1; j <= i; j++) {
      if (tp[j] > tp[j - 1]) pos += mf[j];
      else if (tp[j] < tp[j - 1]) neg += mf[j];
    }
    if (pos + neg === 0) {
      out[i] = 50;
      continue;
    }
    const ratio = neg === 0 ? 0 : pos / neg;
    out[i] = neg === 0 ? 100 : 100 - 100 / (1 + ratio);
  }
  return out;
}

function legacyVolumeDelta(open, close, volume, length) {
  const len = close.length;
  const sv = new Array(len);
  for (let i = 0; i < len; i++) {
    const diff = close[i] - open[i];
    sv[i] = diff > 0 ? volume[i] : diff < 0 ? -volume[i] : 0;
  }
  const out = new Array(len).fill(null);
  for (let i = length - 1; i < len; i++) {
    let acc = 0;
    for (let j = i - length + 1; j <= i; j++) acc += sv[j];
    out[i] = acc;
  }
  return out;
}

function legacyOrderflowImbalance(open, close, volume, length) {
  const len = close.length;
  const out = new Array(len).fill(null);
  for (let i = length - 1; i < len; i++) {
    let signed = 0;
    let total = 0;
    for (let j = i - length + 1; j <= i; j++) {
      const diff = close[j] - open[j];
      signed += diff > 0 ? volume[j] : diff < 0 ? -volume[j] : 0;
      total += volume[j];
    }
    out[i] = total === 0 ? null : signed / total;
  }
  return out;
}

function legacyRealizedVol(values, length, periodsPerYear = 365) {
  const len = values.length;
  const rets = new Array(len).fill(0);
  for (let i = 1; i < len; i++) rets[i] = Math.log(values[i] / values[i - 1]);
  const out = new Array(len).fill(null);
  for (let i = length; i < len; i++) {
    const s = legacyStdDev(rets, i - length + 1, i);
    out[i] = s * Math.sqrt(periodsPerYear);
  }
  return out;
}

function legacyVolatilityRegime(values, length, periodsPerYear = 365, lowZ = -0.5, highZ = 0.5) {
  const vol = legacyRealizedVol(values, length, periodsPerYear);
  const out = new Array(values.length).fill(null);
  for (let i = length * 2; i < values.length; i++) {
    const windowStart = i - length + 1;
    const windowEnd = i;
    const window = vol.slice(windowStart, windowEnd + 1);
    const m = legacyMean(window, 0, window.length - 1);
    const s = legacyStdDev(window, 0, window.length - 1);
    if (s === 0) {
      out[i] = 0;
      continue;
    }
    const z = (vol[i] - m) / s;
    out[i] = z > highZ ? 1 : z < lowZ ? -1 : 0;
  }
  return out;
}

function report(name, length, before, after) {
  const runs = length === 10_000 ? 30 : 5;
  const beforeMs = measure(before, runs);
  const afterMs = measure(after, runs);
  const speedup = beforeMs / afterMs;
  console.log(
    `${String(length).padStart(6)} ${name.padEnd(20)} before=${beforeMs.toFixed(3)} ms ` +
    `after=${afterMs.toFixed(3)} ms speedup=${speedup.toFixed(2)}x`
  );
}

for (const length of [10_000, 100_000]) {
  const close = makeSeries(length);
  const open = close.map((v, i) => v + Math.sin(i * 0.01) * 0.5);
  const high = close.map((v, i) => Math.max(v, open[i]) + 1);
  const low = close.map((v, i) => Math.min(v, open[i]) - 1);
  const volume = close.map((_, i) => 10 + (i % 50));

  report("sma(20)", length, () => legacySma(close, 20), () => sma(close, 20));
  report("bbands(20)", length, () => legacyBbands(close, 20, 2), () => bbands(close, 20, 2));
  report("vwap(20)", length, () => legacyVwap(high, low, close, volume, 20), () => vwap(high, low, close, volume, 20));
  report("mfi(14)", length, () => legacyMfi(high, low, close, volume, 14), () => mfi(high, low, close, volume, 14));
  report("volumeDelta(14)", length, () => legacyVolumeDelta(open, close, volume, 14), () => volumeDelta(open, close, volume, 14));
  report("orderflowImbalance(14)", length, () => legacyOrderflowImbalance(open, close, volume, 14), () => orderflowImbalance(open, close, volume, 14));
  report("realizedVol(30)", length, () => legacyRealizedVol(close, 30), () => realizedVolatility(close, 30));
  report("volatilityRegime(30)", length, () => legacyVolatilityRegime(close, 30), () => volatilityRegime(close, 30));
}
