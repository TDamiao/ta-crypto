import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  sma,
  ema,
  rsi,
  macd,
  bbands,
  atr,
  adx,
  mfi,
  vwap,
  volumeDelta,
  orderflowImbalance,
  realizedVolatility,
  volatilityRegime
} from "../dist/index.js";
import {
  createSMA,
  createEMA,
  createRSI,
  createMACD,
  createATR,
  createBBANDS,
  createRealizedVolatility,
  createVolatilityRegime,
  createVolumeDelta,
  createOrderflowImbalance
} from "../dist/stateful.js";
import { getDataset, BENCH_SIZES } from "./bench/dataset.js";
import { measureBenchmark } from "./bench/harness.js";
import { runComprehensiveParityGate } from "./bench/parity.js";
import { DEFAULT_BENCH_SEED } from "./bench/prng.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASELINE_FILE = path.resolve(__dirname, "../bench/baseline.json");

console.log("[update-baseline] Verifying parity before generating baseline...");
runComprehensiveParityGate();
console.log("[update-baseline] Parity OK. Collecting baseline measurements (9 samples, 5 warmups, multi-iteration for stability)...\n");

const warmupRuns = 5;
const sampleCount = 9;

const data10k = getDataset(BENCH_SIZES.STANDARD_10K);
const data100k = getDataset(BENCH_SIZES.LARGE_100K);

const benchmarks = {};

function record(name, id, fn, datasetSize, innerIterations = 1) {
  process.stdout.write(`  Measuring ${id.padEnd(35)} ... `);
  const res = measureBenchmark(name, fn, { id, datasetSize, warmupRuns, sampleCount, innerIterations });
  benchmarks[id] = {
    name,
    datasetSize,
    medianMs: res.medianMs,
    opsPerSec: res.opsPerSec
  };
  console.log(`${res.medianMs.toFixed(3)} ms (${res.opsPerSec?.toLocaleString("en-US")} ops/sec)`);
}

// 1. Batch 10k (innerIterations: 5 for sub-ms stability)
console.log("--- 1. Batch Indicators (10,000 candles) ---");
record("sma(20)", "batch.sma20.10k", () => sma(data10k.close, 20), 10000, 5);
record("ema(20)", "batch.ema20.10k", () => ema(data10k.close, 20), 10000, 5);
record("rsi(14)", "batch.rsi14.10k", () => rsi(data10k.close, 14), 10000, 5);
record("macd(12,26,9)", "batch.macd.10k", () => macd(data10k.close, 12, 26, 9), 10000, 5);
record("bbands(20,2)", "batch.bbands20.10k", () => bbands(data10k.close, 20, 2), 10000, 5);
record("atr(14)", "batch.atr14.10k", () => atr(data10k.high, data10k.low, data10k.close, 14), 10000, 5);
record("adx(14)", "batch.adx14.10k", () => adx(data10k.high, data10k.low, data10k.close, 14), 10000, 3);
record("mfi(14)", "batch.mfi14.10k", () => mfi(data10k.high, data10k.low, data10k.close, data10k.volume, 14), 10000, 5);
record("vwap(20)", "batch.vwap20.10k", () => vwap(data10k.high, data10k.low, data10k.close, data10k.volume, 20), 10000, 5);
record("volumeDelta(14)", "batch.volumeDelta14.10k", () => volumeDelta(data10k.open, data10k.close, data10k.volume, 14), 10000, 5);
record("orderflowImbalance(14)", "batch.orderflowImbal14.10k", () => orderflowImbalance(data10k.open, data10k.close, data10k.volume, 14), 10000, 5);
record("realizedVolatility(30)", "batch.realizedVol30.10k", () => realizedVolatility(data10k.close, 30, 365), 10000, 5);
record("volatilityRegime(30)", "batch.volatilityRegime30.10k", () => volatilityRegime(data10k.close, 30, 365, -0.5, 0.5), 10000, 5);

// 2. Batch Indicators (100,000 candles - innerIterations: 1)
console.log("\n--- 2. Batch Indicators (100,000 candles) ---");
record("sma(20)", "batch.sma20.100k", () => sma(data100k.close, 20), 100000, 1, "batch-100k");
record("ema(20)", "batch.ema20.100k", () => ema(data100k.close, 20), 100000, 1, "batch-100k");
record("rsi(14)", "batch.rsi14.100k", () => rsi(data100k.close, 14), 100000, 1, "batch-100k");
record("macd(12,26,9)", "batch.macd.100k", () => macd(data100k.close, 12, 26, 9), 100000, 1, "batch-100k");
record("bbands(20,2)", "batch.bbands20.100k", () => bbands(data100k.close, 20, 2), 100000, 1, "batch-100k");
record("atr(14)", "batch.atr14.100k", () => atr(data100k.high, data100k.low, data100k.close, 14), 100000, 1, "batch-100k");
record("adx(14)", "batch.adx14.100k", () => adx(data100k.high, data100k.low, data100k.close, 14), 100000, 1, "batch-100k");
record("mfi(14)", "batch.mfi14.100k", () => mfi(data100k.high, data100k.low, data100k.close, data100k.volume, 14), 100000, 1, "batch-100k");
record("vwap(20)", "batch.vwap20.100k", () => vwap(data100k.high, data100k.low, data100k.close, data100k.volume, 20), 100000, 1, "batch-100k");
record("volumeDelta(14)", "batch.volumeDelta14.100k", () => volumeDelta(data100k.open, data100k.close, data100k.volume, 14), 100000, 1, "batch-100k");
record("orderflowImbalance(14)", "batch.orderflowImbal14.100k", () => orderflowImbalance(data100k.open, data100k.close, data100k.volume, 14), 100000, 1, "batch-100k");
record("realizedVolatility(30)", "batch.realizedVol30.100k", () => realizedVolatility(data100k.close, 30, 365), 100000, 1, "batch-100k");
record("volatilityRegime(30)", "batch.volatilityRegime30.100k", () => volatilityRegime(data100k.close, 30, 365, -0.5, 0.5), 100000, 1, "batch-100k");

// 3. Stateful Streaming (100,000 candles - innerIterations: 1)
console.log("\n--- 3. Stateful Streaming (100,000 items) ---");
record("createSMA(20)", "streaming.sma20.100k", () => {
  const ind = createSMA(20);
  for (let i = 0; i < 100000; i++) ind.next(data100k.close[i]);
}, 100000, 1, "streaming-100k");
record("createEMA(20)", "streaming.ema20.100k", () => {
  const ind = createEMA(20);
  for (let i = 0; i < 100000; i++) ind.next(data100k.close[i]);
}, 100000, 1, "streaming-100k");
record("createRSI(14)", "streaming.rsi14.100k", () => {
  const ind = createRSI(14);
  for (let i = 0; i < 100000; i++) ind.next(data100k.close[i]);
}, 100000, 1, "streaming-100k");
record("createMACD(12,26,9)", "streaming.macd.100k", () => {
  const ind = createMACD(12, 26, 9);
  for (let i = 0; i < 100000; i++) ind.next(data100k.close[i]);
}, 100000, 1, "streaming-100k");
record("createATR(14)", "streaming.atr14.100k", () => {
  const ind = createATR(14);
  for (let i = 0; i < 100000; i++) ind.next({ high: data100k.high[i], low: data100k.low[i], close: data100k.close[i] });
}, 100000, 1, "streaming-100k");
record("createBBANDS(20,2)", "streaming.bbands20.100k", () => {
  const ind = createBBANDS(20, 2);
  for (let i = 0; i < 100000; i++) ind.next(data100k.close[i]);
}, 100000, 1, "streaming-100k");
record("createRealizedVol(30)", "streaming.realizedVol30.100k", () => {
  const ind = createRealizedVolatility(30, 365);
  for (let i = 0; i < 100000; i++) ind.next(data100k.close[i]);
}, 100000, 1, "streaming-100k");
record("createVolatilityRegime(30)", "streaming.volatilityRegime30.100k", () => {
  const ind = createVolatilityRegime(30, 365, -0.5, 0.5);
  for (let i = 0; i < 100000; i++) ind.next(data100k.close[i]);
}, 100000, 1, "streaming-100k");
record("createVolumeDelta(14)", "streaming.volumeDelta14.100k", () => {
  const ind = createVolumeDelta(14);
  for (let i = 0; i < 100000; i++) ind.next({ open: data100k.open[i], close: data100k.close[i], volume: data100k.volume[i] });
}, 100000, 1, "streaming-100k");
record("createOrderflowImbal(14)", "streaming.orderflowImbal14.100k", () => {
  const ind = createOrderflowImbalance(14);
  for (let i = 0; i < 100000; i++) ind.next({ open: data100k.open[i], close: data100k.close[i], volume: data100k.volume[i] });
}, 100000, 1, "streaming-100k");

const baselinePayload = {
  $schemaVersion: 1,
  policyVersion: 1,
  description: "Versioned performance baseline for ta-crypto benchmark suite",
  seed: DEFAULT_BENCH_SEED,
  benchmarks
};

fs.mkdirSync(path.dirname(BASELINE_FILE), { recursive: true });
fs.writeFileSync(BASELINE_FILE, JSON.stringify(baselinePayload, null, 2) + "\n", "utf8");

console.log(`\n[update-baseline] Successfully written ${Object.keys(benchmarks).length} benchmarks to ${BASELINE_FILE}`);
