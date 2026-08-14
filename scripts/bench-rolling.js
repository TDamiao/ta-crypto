import { bbands, sma, vwap } from "../dist/core/overlap.js";
import { mfi } from "../dist/core/volume.js";
import { orderflowImbalance, volatilityRegime, volumeDelta } from "../dist/core/crypto.js";
import { realizedVolatility } from "../dist/core/performance.js";
import { getDataset, BENCH_SIZES } from "./bench/dataset.js";
import { measureBenchmark, getEnvironmentMetadata, formatAsciiTable } from "./bench/harness.js";
import { assertSeriesParity, assertDiscreteParity } from "./bench/parity.js";

const env = getEnvironmentMetadata();
console.log("================================================================================");
console.log(" ta-crypto Rolling Engine vs Legacy Window Rescan Benchmark");
console.log(` Node: ${env.nodeVersion} | Platform: ${env.platform} (${env.arch}) | CPU: ${env.cpuModel}`);
console.log("================================================================================\n");

// Legacy unoptimized reference implementations for historical comparison
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

// 1. STRICT PARITY VERIFICATION
function assertLegacyParity(length = 2000) {
  const data = getDataset(length);
  const { open, high, low, close, volume } = data;

  assertSeriesParity("sma(20)", sma(close, 20), legacySma(close, 20), 1e-9);

  const bOpt = bbands(close, 20, 2);
  const bLeg = legacyBbands(close, 20, 2);
  assertSeriesParity("bbands.basis(20)", bOpt.basis, bLeg.basis, 1e-9);
  assertSeriesParity("bbands.upper(20)", bOpt.upper, bLeg.upper, 1e-9);
  assertSeriesParity("bbands.lower(20)", bOpt.lower, bLeg.lower, 1e-9);

  assertSeriesParity("vwap(20)", vwap(high, low, close, volume, 20), legacyVwap(high, low, close, volume, 20), 1e-9);
  assertSeriesParity("mfi(14)", mfi(high, low, close, volume, 14), legacyMfi(high, low, close, volume, 14), 1e-9);
  assertSeriesParity("volumeDelta(14)", volumeDelta(open, close, volume, 14), legacyVolumeDelta(open, close, volume, 14), 1e-9);
  assertSeriesParity("orderflowImbalance(14)", orderflowImbalance(open, close, volume, 14), legacyOrderflowImbalance(open, close, volume, 14), 1e-9);
  assertSeriesParity("realizedVolatility(30)", realizedVolatility(close, 30, 365), legacyRealizedVol(close, 30, 365), 1e-9);
  assertDiscreteParity("volatilityRegime(30)", volatilityRegime(close, 30, 365, -0.5, 0.5), legacyVolatilityRegime(close, 30, 365, -0.5, 0.5));

  console.log(`[parity-gate] All legacy-vs-rolling parity checks passed (dataset: ${length} bars).\n`);
}

assertLegacyParity(2000);

for (const length of [BENCH_SIZES.STANDARD_10K, BENCH_SIZES.LARGE_100K]) {
  const data = getDataset(length);
  const { open, high, low, close, volume } = data;
  const sampleCount = length === 10_000 ? 7 : 3;
  const warmupRuns = length === 10_000 ? 3 : 1;

  console.log(`--- Dataset: ${length.toLocaleString("en-US")} bars ---`);

  const comparisons = [
    { name: "sma(20)", legacyFn: () => legacySma(close, 20), optFn: () => sma(close, 20) },
    { name: "bbands(20,2)", legacyFn: () => legacyBbands(close, 20, 2), optFn: () => bbands(close, 20, 2) },
    { name: "vwap(20)", legacyFn: () => legacyVwap(high, low, close, volume, 20), optFn: () => vwap(high, low, close, volume, 20) },
    { name: "mfi(14)", legacyFn: () => legacyMfi(high, low, close, volume, 14), optFn: () => mfi(high, low, close, volume, 14) },
    { name: "volumeDelta(14)", legacyFn: () => legacyVolumeDelta(open, close, volume, 14), optFn: () => volumeDelta(open, close, volume, 14) },
    { name: "orderflowImbal(14)", legacyFn: () => legacyOrderflowImbalance(open, close, volume, 14), optFn: () => orderflowImbalance(open, close, volume, 14) },
    { name: "realizedVol(30)", legacyFn: () => legacyRealizedVol(close, 30, 365), optFn: () => realizedVolatility(close, 30, 365) },
    { name: "volatilityRegime(30)", legacyFn: () => legacyVolatilityRegime(close, 30, 365, -0.5, 0.5), optFn: () => volatilityRegime(close, 30, 365, -0.5, 0.5) }
  ];

  const headers = ["Indicator", "Dataset", "Legacy (ms)", "Rolling (ms)", "Speedup", "Ops / sec"];
  const rows = [];

  for (const c of comparisons) {
    const legRes = measureBenchmark(`legacy.${c.name}`, c.legacyFn, { datasetSize: length, warmupRuns, sampleCount });
    const optRes = measureBenchmark(`opt.${c.name}`, c.optFn, { datasetSize: length, warmupRuns, sampleCount });
    const speedup = (legRes.medianMs / optRes.medianMs).toFixed(2);
    rows.push([
      c.name,
      `${length.toLocaleString("en-US")} bars`,
      legRes.medianMs.toFixed(3),
      optRes.medianMs.toFixed(3),
      `${speedup}x`,
      optRes.opsPerSec ? optRes.opsPerSec.toLocaleString("en-US") : "N/A"
    ]);
  }

  console.log(formatAsciiTable(headers, rows) + "\n");
}
