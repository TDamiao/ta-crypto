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
  createOrderflowImbalance,
  createVWAPSession
} from "../dist/stateful.js";
import { getDataset, BENCH_SIZES } from "./bench/dataset.js";
import { measureBenchmark, getEnvironmentMetadata, formatAsciiTable } from "./bench/harness.js";
import { runComprehensiveParityGate } from "./bench/parity.js";
import { evaluateRegressionSuite, DEFAULT_THRESHOLDS } from "./bench/regression-evaluator.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASELINE_FILE = path.resolve(__dirname, "../bench/baseline.json");

const args = process.argv.slice(2);
const isJsonOutput = args.includes("--json");
const isStrict = args.includes("--strict") || process.env.BENCH_STRICT === "true";
const failOnBaseline = args.includes("--fail-on-baseline") || process.env.BENCH_FAIL_ON_BASELINE === "true";
const outArg = args.find(a => a.startsWith("--out="));
const outputPath = outArg ? path.resolve(process.cwd(), outArg.split("=")[1]) : null;

// 1. Run Parity Gate (HARD GATE)
let parityReport;
try {
  parityReport = runComprehensiveParityGate();
} catch (err) {
  if (isJsonOutput) {
    console.log(JSON.stringify({ error: "PARITY_GATE_FAILURE", message: err.message }, null, 2));
  } else {
    console.error("\n❌ [parity-gate] CRITICAL FAILURE: Mathematical parity check failed before timing.");
    console.error(err.message);
  }
  process.exit(1);
}

// 2. Load Baseline
let baseline = null;
if (fs.existsSync(BASELINE_FILE)) {
  try {
    baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, "utf8"));
  } catch (err) {
    console.warn(`[bench-regression] Warning: Could not parse baseline file (${err.message})`);
  }
}

// 3. Prepare Datasets
const warmupRuns = 4;
const sampleCount = 9;

const data10k = getDataset(BENCH_SIZES.STANDARD_10K);
const data100k = getDataset(BENCH_SIZES.LARGE_100K);
const dataRecompute = getDataset(BENCH_SIZES.RECOMPUTE_SMALL);

const candidateBenchmarks = [];
const benchMap = new Map();

function record(name, id, fn, datasetSize, innerIterations = 1, group = "batch") {
  const res = measureBenchmark(name, fn, { id, group, datasetSize, warmupRuns, sampleCount, innerIterations });
  candidateBenchmarks.push(res);
  benchMap.set(id, res);
  return res;
}

// Measure 10k Batch (innerIterations: 5 for microsecond stability)
record("sma(20)", "batch.sma20.10k", () => sma(data10k.close, 20), 10000, 5, "batch-10k");
record("ema(20)", "batch.ema20.10k", () => ema(data10k.close, 20), 10000, 5, "batch-10k");
record("rsi(14)", "batch.rsi14.10k", () => rsi(data10k.close, 14), 10000, 5, "batch-10k");
record("macd(12,26,9)", "batch.macd.10k", () => macd(data10k.close, 12, 26, 9), 10000, 5, "batch-10k");
record("bbands(20,2)", "batch.bbands20.10k", () => bbands(data10k.close, 20, 2), 10000, 5, "batch-10k");
record("atr(14)", "batch.atr14.10k", () => atr(data10k.high, data10k.low, data10k.close, 14), 10000, 5, "batch-10k");
record("adx(14)", "batch.adx14.10k", () => adx(data10k.high, data10k.low, data10k.close, 14), 10000, 3, "batch-10k");
record("mfi(14)", "batch.mfi14.10k", () => mfi(data10k.high, data10k.low, data10k.close, data10k.volume, 14), 10000, 5, "batch-10k");
record("vwap(20)", "batch.vwap20.10k", () => vwap(data10k.high, data10k.low, data10k.close, data10k.volume, 20), 10000, 5, "batch-10k");
record("volumeDelta(14)", "batch.volumeDelta14.10k", () => volumeDelta(data10k.open, data10k.close, data10k.volume, 14), 10000, 5, "batch-10k");
record("orderflowImbalance(14)", "batch.orderflowImbal14.10k", () => orderflowImbalance(data10k.open, data10k.close, data10k.volume, 14), 10000, 5, "batch-10k");
record("realizedVolatility(30)", "batch.realizedVol30.10k", () => realizedVolatility(data10k.close, 30, 365), 10000, 5, "batch-10k");
record("volatilityRegime(30)", "batch.volatilityRegime30.10k", () => volatilityRegime(data10k.close, 30, 365, -0.5, 0.5), 10000, 5, "batch-10k");

// Measure 100k Batch (innerIterations: 2)
record("sma(20)", "batch.sma20.100k", () => sma(data100k.close, 20), 100000, 2, "batch-100k");
record("ema(20)", "batch.ema20.100k", () => ema(data100k.close, 20), 100000, 2, "batch-100k");
record("rsi(14)", "batch.rsi14.100k", () => rsi(data100k.close, 14), 100000, 2, "batch-100k");
record("macd(12,26,9)", "batch.macd.100k", () => macd(data100k.close, 12, 26, 9), 100000, 2, "batch-100k");
record("bbands(20,2)", "batch.bbands20.100k", () => bbands(data100k.close, 20, 2), 100000, 2, "batch-100k");
record("atr(14)", "batch.atr14.100k", () => atr(data100k.high, data100k.low, data100k.close, 14), 100000, 2, "batch-100k");
record("adx(14)", "batch.adx14.100k", () => adx(data100k.high, data100k.low, data100k.close, 14), 100000, 1, "batch-100k");
record("mfi(14)", "batch.mfi14.100k", () => mfi(data100k.high, data100k.low, data100k.close, data100k.volume, 14), 100000, 2, "batch-100k");
record("vwap(20)", "batch.vwap20.100k", () => vwap(data100k.high, data100k.low, data100k.close, data100k.volume, 20), 100000, 2, "batch-100k");
record("volumeDelta(14)", "batch.volumeDelta14.100k", () => volumeDelta(data100k.open, data100k.close, data100k.volume, 14), 100000, 2, "batch-100k");
record("orderflowImbalance(14)", "batch.orderflowImbal14.100k", () => orderflowImbalance(data100k.open, data100k.close, data100k.volume, 14), 100000, 2, "batch-100k");
record("realizedVolatility(30)", "batch.realizedVol30.100k", () => realizedVolatility(data100k.close, 30, 365), 100000, 2, "batch-100k");
record("volatilityRegime(30)", "batch.volatilityRegime30.100k", () => volatilityRegime(data100k.close, 30, 365, -0.5, 0.5), 100000, 2, "batch-100k");

// Measure Stateful 100k Streaming (innerIterations: 2)
record("createSMA(20)", "streaming.sma20.100k", () => {
  const ind = createSMA(20);
  for (let i = 0; i < 100000; i++) ind.next(data100k.close[i]);
}, 100000, 2, "streaming-100k");
record("createEMA(20)", "streaming.ema20.100k", () => {
  const ind = createEMA(20);
  for (let i = 0; i < 100000; i++) ind.next(data100k.close[i]);
}, 100000, 2, "streaming-100k");
record("createRSI(14)", "streaming.rsi14.100k", () => {
  const ind = createRSI(14);
  for (let i = 0; i < 100000; i++) ind.next(data100k.close[i]);
}, 100000, 2, "streaming-100k");
record("createMACD(12,26,9)", "streaming.macd.100k", () => {
  const ind = createMACD(12, 26, 9);
  for (let i = 0; i < 100000; i++) ind.next(data100k.close[i]);
}, 100000, 2, "streaming-100k");
record("createATR(14)", "streaming.atr14.100k", () => {
  const ind = createATR(14);
  for (let i = 0; i < 100000; i++) ind.next({ high: data100k.high[i], low: data100k.low[i], close: data100k.close[i] });
}, 100000, 2, "streaming-100k");
record("createBBANDS(20,2)", "streaming.bbands20.100k", () => {
  const ind = createBBANDS(20, 2);
  for (let i = 0; i < 100000; i++) ind.next(data100k.close[i]);
}, 100000, 2, "streaming-100k");
record("createRealizedVol(30)", "streaming.realizedVol30.100k", () => {
  const ind = createRealizedVolatility(30, 365);
  for (let i = 0; i < 100000; i++) ind.next(data100k.close[i]);
}, 100000, 2, "streaming-100k");
record("createVolatilityRegime(30)", "streaming.volatilityRegime30.100k", () => {
  const ind = createVolatilityRegime(30, 365, -0.5, 0.5);
  for (let i = 0; i < 100000; i++) ind.next(data100k.close[i]);
}, 100000, 2, "streaming-100k");
record("createVolumeDelta(14)", "streaming.volumeDelta14.100k", () => {
  const ind = createVolumeDelta(14);
  for (let i = 0; i < 100000; i++) ind.next({ open: data100k.open[i], close: data100k.close[i], volume: data100k.volume[i] });
}, 100000, 2, "streaming-100k");
record("createOrderflowImbal(14)", "streaming.orderflowImbal14.100k", () => {
  const ind = createOrderflowImbalance(14);
  for (let i = 0; i < 100000; i++) ind.next({ open: data100k.open[i], close: data100k.close[i], volume: data100k.volume[i] });
}, 100000, 2, "streaming-100k");

// Build Scaling Pairs (10k vs 100k) (HARD GATE)
const scalingIndicators = [
  { name: "sma(20)", id10k: "batch.sma20.10k", id100k: "batch.sma20.100k" },
  { name: "ema(20)", id10k: "batch.ema20.10k", id100k: "batch.ema20.100k" },
  { name: "rsi(14)", id10k: "batch.rsi14.10k", id100k: "batch.rsi14.100k" },
  { name: "macd(12,26,9)", id10k: "batch.macd.10k", id100k: "batch.macd.100k" },
  { name: "bbands(20,2)", id10k: "batch.bbands20.10k", id100k: "batch.bbands20.100k" },
  { name: "atr(14)", id10k: "batch.atr14.10k", id100k: "batch.atr14.100k" },
  { name: "adx(14)", id10k: "batch.adx14.10k", id100k: "batch.adx14.100k" },
  { name: "mfi(14)", id10k: "batch.mfi14.10k", id100k: "batch.mfi14.100k" },
  { name: "vwap(20)", id10k: "batch.vwap20.10k", id100k: "batch.vwap20.100k" },
  { name: "volumeDelta(14)", id10k: "batch.volumeDelta14.10k", id100k: "batch.volumeDelta14.100k" },
  { name: "orderflowImbal(14)", id10k: "batch.orderflowImbal14.10k", id100k: "batch.orderflowImbal14.100k" },
  { name: "realizedVol(30)", id10k: "batch.realizedVol30.10k", id100k: "batch.realizedVol30.100k" },
  { name: "volatilityRegime(30)", id10k: "batch.volatilityRegime30.10k", id100k: "batch.volatilityRegime30.100k" }
];

const scalingPairs = scalingIndicators.map(s => ({
  id: `scaling.${s.name}`,
  name: s.name,
  bench10k: benchMap.get(s.id10k),
  bench100k: benchMap.get(s.id100k)
}));

// Build Batch Recompute vs Streaming Pairs (2,000 candles) (HARD GATE)
const rN = BENCH_SIZES.RECOMPUTE_SMALL;
const rClose = dataRecompute.close;
const rOpen = dataRecompute.open;
const rHigh = dataRecompute.high;
const rLow = dataRecompute.low;
const rVolume = dataRecompute.volume;

const streamingPairs = [
  {
    id: "recompute-vs-streaming.sma20",
    name: "createSMA(20)",
    datasetSize: rN,
    batchRecompute: measureBenchmark("recompute.sma20", () => {
      const out = new Array(rN);
      for (let t = 0; t < rN; t++) {
        const res = sma(rClose.slice(0, t + 1), 20);
        out[t] = res[res.length - 1];
      }
      return out;
    }, { datasetSize: rN, warmupRuns: 1, sampleCount: 3 }),
    streaming: measureBenchmark("streaming.sma20", () => {
      const ind = createSMA(20);
      const out = new Array(rN);
      for (let t = 0; t < rN; t++) out[t] = ind.next(rClose[t]);
      return out;
    }, { datasetSize: rN, warmupRuns: 2, sampleCount: 5, innerIterations: 2 })
  },
  {
    id: "recompute-vs-streaming.ema20",
    name: "createEMA(20)",
    datasetSize: rN,
    batchRecompute: measureBenchmark("recompute.ema20", () => {
      const out = new Array(rN);
      for (let t = 0; t < rN; t++) {
        const res = ema(rClose.slice(0, t + 1), 20);
        out[t] = res[res.length - 1];
      }
      return out;
    }, { datasetSize: rN, warmupRuns: 1, sampleCount: 3 }),
    streaming: measureBenchmark("streaming.ema20", () => {
      const ind = createEMA(20);
      const out = new Array(rN);
      for (let t = 0; t < rN; t++) out[t] = ind.next(rClose[t]);
      return out;
    }, { datasetSize: rN, warmupRuns: 2, sampleCount: 5, innerIterations: 2 })
  },
  {
    id: "recompute-vs-streaming.rsi14",
    name: "createRSI(14)",
    datasetSize: rN,
    batchRecompute: measureBenchmark("recompute.rsi14", () => {
      const out = new Array(rN);
      for (let t = 0; t < rN; t++) {
        const res = rsi(rClose.slice(0, t + 1), 14);
        out[t] = res[res.length - 1];
      }
      return out;
    }, { datasetSize: rN, warmupRuns: 1, sampleCount: 3 }),
    streaming: measureBenchmark("streaming.rsi14", () => {
      const ind = createRSI(14);
      const out = new Array(rN);
      for (let t = 0; t < rN; t++) out[t] = ind.next(rClose[t]);
      return out;
    }, { datasetSize: rN, warmupRuns: 2, sampleCount: 5, innerIterations: 2 })
  },
  {
    id: "recompute-vs-streaming.macd",
    name: "createMACD(12,26,9)",
    datasetSize: rN,
    batchRecompute: measureBenchmark("recompute.macd", () => {
      const out = new Array(rN);
      for (let t = 0; t < rN; t++) {
        const res = macd(rClose.slice(0, t + 1), 12, 26, 9);
        out[t] = res.macd[res.macd.length - 1];
      }
      return out;
    }, { datasetSize: rN, warmupRuns: 1, sampleCount: 3 }),
    streaming: measureBenchmark("streaming.macd", () => {
      const ind = createMACD(12, 26, 9);
      const out = new Array(rN);
      for (let t = 0; t < rN; t++) out[t] = ind.next(rClose[t]);
      return out;
    }, { datasetSize: rN, warmupRuns: 2, sampleCount: 5, innerIterations: 2 })
  },
  {
    id: "recompute-vs-streaming.atr14",
    name: "createATR(14)",
    datasetSize: rN,
    batchRecompute: measureBenchmark("recompute.atr14", () => {
      const out = new Array(rN);
      for (let t = 0; t < rN; t++) {
        const res = atr(rHigh.slice(0, t + 1), rLow.slice(0, t + 1), rClose.slice(0, t + 1), 14);
        out[t] = res[res.length - 1];
      }
      return out;
    }, { datasetSize: rN, warmupRuns: 1, sampleCount: 3 }),
    streaming: measureBenchmark("streaming.atr14", () => {
      const ind = createATR(14);
      const out = new Array(rN);
      for (let t = 0; t < rN; t++) {
        out[t] = ind.next({ high: rHigh[t], low: rLow[t], close: rClose[t] });
      }
      return out;
    }, { datasetSize: rN, warmupRuns: 2, sampleCount: 5, innerIterations: 2 })
  },
  {
    id: "recompute-vs-streaming.bbands20",
    name: "createBBANDS(20,2)",
    datasetSize: rN,
    batchRecompute: measureBenchmark("recompute.bbands20", () => {
      const out = new Array(rN);
      for (let t = 0; t < rN; t++) {
        const res = bbands(rClose.slice(0, t + 1), 20, 2);
        out[t] = res.basis[res.basis.length - 1];
      }
      return out;
    }, { datasetSize: rN, warmupRuns: 1, sampleCount: 3 }),
    streaming: measureBenchmark("streaming.bbands20", () => {
      const ind = createBBANDS(20, 2);
      const out = new Array(rN);
      for (let t = 0; t < rN; t++) out[t] = ind.next(rClose[t]);
      return out;
    }, { datasetSize: rN, warmupRuns: 2, sampleCount: 5, innerIterations: 2 })
  },
  {
    id: "recompute-vs-streaming.realizedVol30",
    name: "createRealizedVol(30)",
    datasetSize: rN,
    batchRecompute: measureBenchmark("recompute.realizedVol30", () => {
      const out = new Array(rN);
      for (let t = 0; t < rN; t++) {
        const res = realizedVolatility(rClose.slice(0, t + 1), 30, 365);
        out[t] = res[res.length - 1];
      }
      return out;
    }, { datasetSize: rN, warmupRuns: 1, sampleCount: 3 }),
    streaming: measureBenchmark("streaming.realizedVol30", () => {
      const ind = createRealizedVolatility(30, 365);
      const out = new Array(rN);
      for (let t = 0; t < rN; t++) out[t] = ind.next(rClose[t]);
      return out;
    }, { datasetSize: rN, warmupRuns: 2, sampleCount: 5, innerIterations: 2 })
  },
  {
    id: "recompute-vs-streaming.volatilityRegime30",
    name: "createVolatilityRegime(30)",
    datasetSize: rN,
    batchRecompute: measureBenchmark("recompute.volatilityRegime30", () => {
      const out = new Array(rN);
      for (let t = 0; t < rN; t++) {
        const res = volatilityRegime(rClose.slice(0, t + 1), 30, 365, -0.5, 0.5);
        out[t] = res[res.length - 1];
      }
      return out;
    }, { datasetSize: rN, warmupRuns: 1, sampleCount: 3 }),
    streaming: measureBenchmark("streaming.volatilityRegime30", () => {
      const ind = createVolatilityRegime(30, 365, -0.5, 0.5);
      const out = new Array(rN);
      for (let t = 0; t < rN; t++) out[t] = ind.next(rClose[t]);
      return out;
    }, { datasetSize: rN, warmupRuns: 2, sampleCount: 5, innerIterations: 2 })
  },
  {
    id: "recompute-vs-streaming.volumeDelta14",
    name: "createVolumeDelta(14)",
    datasetSize: rN,
    batchRecompute: measureBenchmark("recompute.volumeDelta14", () => {
      const out = new Array(rN);
      for (let t = 0; t < rN; t++) {
        const res = volumeDelta(rOpen.slice(0, t + 1), rClose.slice(0, t + 1), rVolume.slice(0, t + 1), 14);
        out[t] = res[res.length - 1];
      }
      return out;
    }, { datasetSize: rN, warmupRuns: 1, sampleCount: 3 }),
    streaming: measureBenchmark("streaming.volumeDelta14", () => {
      const ind = createVolumeDelta(14);
      const out = new Array(rN);
      for (let t = 0; t < rN; t++) out[t] = ind.next({ open: rOpen[t], close: rClose[t], volume: rVolume[t] });
      return out;
    }, { datasetSize: rN, warmupRuns: 2, sampleCount: 5, innerIterations: 2 })
  },
  {
    id: "recompute-vs-streaming.orderflowImbal14",
    name: "createOrderflowImbal(14)",
    datasetSize: rN,
    batchRecompute: measureBenchmark("recompute.orderflowImbal14", () => {
      const out = new Array(rN);
      for (let t = 0; t < rN; t++) {
        const res = orderflowImbalance(rOpen.slice(0, t + 1), rClose.slice(0, t + 1), rVolume.slice(0, t + 1), 14);
        out[t] = res[res.length - 1];
      }
      return out;
    }, { datasetSize: rN, warmupRuns: 1, sampleCount: 3 }),
    streaming: measureBenchmark("streaming.orderflowImbal14", () => {
      const ind = createOrderflowImbalance(14);
      const out = new Array(rN);
      for (let t = 0; t < rN; t++) out[t] = ind.next({ open: rOpen[t], close: rClose[t], volume: rVolume[t] });
      return out;
    }, { datasetSize: rN, warmupRuns: 2, sampleCount: 5, innerIterations: 2 })
  }
];

// Evaluate Regression Suite
const evaluationReport = evaluateRegressionSuite({
  candidateBenchmarks,
  baseline,
  scalingPairs,
  streamingPairs
});

const env = getEnvironmentMetadata();
const fullReport = {
  $schemaVersion: 1,
  timestamp: new Date().toISOString(),
  environment: env,
  parityGate: { status: "PASS", checksPassed: parityReport.checksCount },
  ...evaluationReport
};

if (outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(fullReport, null, 2) + "\n", "utf8");
}

if (isJsonOutput) {
  console.log(JSON.stringify(fullReport, null, 2));
} else {
  console.log("================================================================================");
  console.log(" ta-crypto Performance Regression & Parity Verification Report");
  console.log(` Node: ${env.nodeVersion} | Platform: ${env.platform} (${env.arch}) | CPU: ${env.cpuModel}`);
  console.log("================================================================================\n");

  console.log(`[parity-gate] Status: PASS (${parityReport.checksCount} mathematical parity checks passed)\n`);

  console.log("--- 1. Baseline Regression Comparison (10k & 100k datasets) ---");
  const benchHeaders = ["Benchmark ID", "Dataset", "Candidate (ms)", "Baseline (ms)", "Delta (%)", "Status"];
  const benchRows = evaluationReport.benchmarks.map(b => [
    b.id,
    `${b.datasetSize?.toLocaleString("en-US")} bars`,
    b.medianMs.toFixed(3),
    b.baselineMedianMs !== null ? b.baselineMedianMs.toFixed(3) : "N/A",
    b.deltaPercent !== null ? `${b.deltaPercent > 0 ? "+" : ""}${b.deltaPercent.toFixed(1)}%` : "NEW",
    b.status
  ]);
  console.log(formatAsciiTable(benchHeaders, benchRows));

  console.log("\n--- 2. Algorithmic Scaling Guard (10k vs 100k data points) ---");
  const scaleHeaders = ["Indicator", "10k Median (ms)", "100k Median (ms)", "Growth Ratio", "Max Allowed", "Status"];
  const scaleRows = evaluationReport.scaling.map(s => [
    s.name,
    s.median10k.toFixed(3),
    s.median100k.toFixed(3),
    `${s.ratio}x`,
    `${DEFAULT_THRESHOLDS.scalingRatioMax}x`,
    s.status
  ]);
  console.log(formatAsciiTable(scaleHeaders, scaleRows));

  console.log(`\n--- 3. Stateful Streaming Advantage (2,000 candles) ---`);
  const streamHeaders = ["Stateful Constructor", "Dataset", "Batch Recompute (ms)", "Streaming (ms)", "Speedup", "Parity", "Status"];
  const streamRows = evaluationReport.streaming.map(s => [
    s.name,
    `${s.datasetSize.toLocaleString("en-US")} bars`,
    s.batchRecomputeMedianMs.toFixed(2),
    s.streamingMedianMs.toFixed(3),
    `${s.speedup}x`,
    "PASS",
    s.status
  ]);
  console.log(formatAsciiTable(streamHeaders, streamRows));

  console.log("\n================================================================================");
  console.log(` SUMMARY: ${evaluationReport.overallStatus} ` +
    `(Pass: ${evaluationReport.summary.passCount}, ` +
    `Warn: ${evaluationReport.summary.warnCount}, ` +
    `Fail: ${evaluationReport.summary.failCount}, ` +
    `New: ${evaluationReport.summary.newCount})`);
  console.log("================================================================================\n");
}

// Hard Gates:
// 1. Parity Gate (checked above)
// 2. Scaling Guard (growth ratio <= 35x)
// 3. Streaming Advantage (speedup >= 1.0x)
// 4. Invalid Candidate (no NaN/Infinity/negative timings)
// 5. Baseline Regression (only if --fail-on-baseline or --strict is requested)
const hasScalingFailure = evaluationReport.scaling.some(s => s.status === "FAIL");
const hasStreamingFailure = evaluationReport.streaming.some(s => s.status === "FAIL");
const hasInvalidCandidate = evaluationReport.benchmarks.some(b => !Number.isFinite(b.medianMs) || b.medianMs <= 0);
const hasBaselineFailure = (failOnBaseline || isStrict) && evaluationReport.summary.failCount > 0;
const hasWarnStrict = isStrict && evaluationReport.summary.warnCount > 0;

const shouldFail = hasScalingFailure || hasStreamingFailure || hasInvalidCandidate || hasBaselineFailure || hasWarnStrict;
process.exit(shouldFail ? 1 : 0);
