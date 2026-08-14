import {
  sma,
  ema,
  rsi,
  macd,
  atr,
  bbands,
  realizedVolatility,
  volatilityRegime,
  volumeDelta,
  orderflowImbalance,
  vwapSession
} from "../dist/api.js";
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

const env = getEnvironmentMetadata();
console.log("================================================================================");
console.log(" ta-crypto Stateful Streaming vs Batch Recomputation Benchmark");
console.log(` Node: ${env.nodeVersion} | Platform: ${env.platform} (${env.arch}) | CPU: ${env.cpuModel}`);
console.log("================================================================================\n");

// 1. STRICT PARITY GATE BEFORE TIMING
console.log("[parity-gate] Verifying mathematical output parity between stateful streaming and batch...");
const parityResult = runComprehensiveParityGate();
console.log(`[parity-gate] SUCCESS: ${parityResult.checksCount} parity checks passed within 1e-10 tolerance.\n`);

// 2. BATCH RECOMPUTATION VS STREAMING (on controlled dataset size)
const recomputeSize = BENCH_SIZES.RECOMPUTE_SMALL; // 2,000 candles
const recomputeData = getDataset(recomputeSize);
const { open, high, low, close, volume } = recomputeData;

const sessions = new Array(recomputeSize);
for (let i = 0; i < recomputeSize; i++) {
  sessions[i] = `session_${Math.floor(i / 100)}`;
}

console.log(`--- Scenario A: Stateful Streaming vs Naive Batch Recompute (${recomputeSize.toLocaleString("en-US")} bars) ---`);
console.log(`Note: Batch recompute simulates calling batch indicator on growing window [0..t] for each arriving candle.\n`);

function benchPair(name, id, batchRecomputeFn, streamingFn) {
  const benchBatch = measureBenchmark(`batchRecompute.${id}`, batchRecomputeFn, {
    datasetSize: recomputeSize,
    warmupRuns: 1,
    sampleCount: 3,
    id: `recompute.${id}.${recomputeSize}`
  });

  const benchStream = measureBenchmark(`streaming.${id}`, streamingFn, {
    datasetSize: recomputeSize,
    warmupRuns: 3,
    sampleCount: 7,
    id: `streaming.${id}.${recomputeSize}`
  });

  const speedup = (benchBatch.medianMs / benchStream.medianMs).toFixed(1);
  return {
    name,
    id,
    batchMs: benchBatch.medianMs,
    streamMs: benchStream.medianMs,
    speedup: `${speedup}x`,
    parity: "PASS"
  };
}

const comparisons = [
  benchPair(
    "createSMA(20)",
    "sma20",
    () => {
      const out = new Array(recomputeSize);
      for (let t = 0; t < recomputeSize; t++) {
        const slice = close.slice(0, t + 1);
        const res = sma(slice, 20);
        out[t] = res[res.length - 1];
      }
      return out;
    },
    () => {
      const ind = createSMA(20);
      const out = new Array(recomputeSize);
      for (let t = 0; t < recomputeSize; t++) out[t] = ind.next(close[t]);
      return out;
    }
  ),

  benchPair(
    "createEMA(20)",
    "ema20",
    () => {
      const out = new Array(recomputeSize);
      for (let t = 0; t < recomputeSize; t++) {
        const slice = close.slice(0, t + 1);
        const res = ema(slice, 20);
        out[t] = res[res.length - 1];
      }
      return out;
    },
    () => {
      const ind = createEMA(20);
      const out = new Array(recomputeSize);
      for (let t = 0; t < recomputeSize; t++) out[t] = ind.next(close[t]);
      return out;
    }
  ),

  benchPair(
    "createRSI(14)",
    "rsi14",
    () => {
      const out = new Array(recomputeSize);
      for (let t = 0; t < recomputeSize; t++) {
        const slice = close.slice(0, t + 1);
        const res = rsi(slice, 14);
        out[t] = res[res.length - 1];
      }
      return out;
    },
    () => {
      const ind = createRSI(14);
      const out = new Array(recomputeSize);
      for (let t = 0; t < recomputeSize; t++) out[t] = ind.next(close[t]);
      return out;
    }
  ),

  benchPair(
    "createMACD(12,26,9)",
    "macd",
    () => {
      const out = new Array(recomputeSize);
      for (let t = 0; t < recomputeSize; t++) {
        const slice = close.slice(0, t + 1);
        const res = macd(slice, 12, 26, 9);
        out[t] = res.macd[res.macd.length - 1];
      }
      return out;
    },
    () => {
      const ind = createMACD(12, 26, 9);
      const out = new Array(recomputeSize);
      for (let t = 0; t < recomputeSize; t++) out[t] = ind.next(close[t]);
      return out;
    }
  ),

  benchPair(
    "createATR(14)",
    "atr14",
    () => {
      const out = new Array(recomputeSize);
      for (let t = 0; t < recomputeSize; t++) {
        const hSlice = high.slice(0, t + 1);
        const lSlice = low.slice(0, t + 1);
        const cSlice = close.slice(0, t + 1);
        const res = atr(hSlice, lSlice, cSlice, 14);
        out[t] = res[res.length - 1];
      }
      return out;
    },
    () => {
      const ind = createATR(14);
      const out = new Array(recomputeSize);
      for (let t = 0; t < recomputeSize; t++) {
        out[t] = ind.next({ high: high[t], low: low[t], close: close[t] });
      }
      return out;
    }
  ),

  benchPair(
    "createBBANDS(20,2)",
    "bbands20",
    () => {
      const out = new Array(recomputeSize);
      for (let t = 0; t < recomputeSize; t++) {
        const slice = close.slice(0, t + 1);
        const res = bbands(slice, 20, 2);
        out[t] = res.basis[res.basis.length - 1];
      }
      return out;
    },
    () => {
      const ind = createBBANDS(20, 2);
      const out = new Array(recomputeSize);
      for (let t = 0; t < recomputeSize; t++) out[t] = ind.next(close[t]);
      return out;
    }
  ),

  benchPair(
    "createRealizedVol(30)",
    "realizedVol30",
    () => {
      const out = new Array(recomputeSize);
      for (let t = 0; t < recomputeSize; t++) {
        const slice = close.slice(0, t + 1);
        const res = realizedVolatility(slice, 30, 365);
        out[t] = res[res.length - 1];
      }
      return out;
    },
    () => {
      const ind = createRealizedVolatility(30, 365);
      const out = new Array(recomputeSize);
      for (let t = 0; t < recomputeSize; t++) out[t] = ind.next(close[t]);
      return out;
    }
  ),

  benchPair(
    "createVolatilityRegime(30)",
    "volatilityRegime30",
    () => {
      const out = new Array(recomputeSize);
      for (let t = 0; t < recomputeSize; t++) {
        const slice = close.slice(0, t + 1);
        const res = volatilityRegime(slice, 30, 365, -0.5, 0.5);
        out[t] = res[res.length - 1];
      }
      return out;
    },
    () => {
      const ind = createVolatilityRegime(30, 365, -0.5, 0.5);
      const out = new Array(recomputeSize);
      for (let t = 0; t < recomputeSize; t++) out[t] = ind.next(close[t]);
      return out;
    }
  ),

  benchPair(
    "createVolumeDelta(14)",
    "volumeDelta14",
    () => {
      const out = new Array(recomputeSize);
      for (let t = 0; t < recomputeSize; t++) {
        const oSlice = open.slice(0, t + 1);
        const cSlice = close.slice(0, t + 1);
        const vSlice = volume.slice(0, t + 1);
        const res = volumeDelta(oSlice, cSlice, vSlice, 14);
        out[t] = res[res.length - 1];
      }
      return out;
    },
    () => {
      const ind = createVolumeDelta(14);
      const out = new Array(recomputeSize);
      for (let t = 0; t < recomputeSize; t++) {
        out[t] = ind.next({ open: open[t], close: close[t], volume: volume[t] });
      }
      return out;
    }
  ),

  benchPair(
    "createOrderflowImbal(14)",
    "orderflowImbal14",
    () => {
      const out = new Array(recomputeSize);
      for (let t = 0; t < recomputeSize; t++) {
        const oSlice = open.slice(0, t + 1);
        const cSlice = close.slice(0, t + 1);
        const vSlice = volume.slice(0, t + 1);
        const res = orderflowImbalance(oSlice, cSlice, vSlice, 14);
        out[t] = res[res.length - 1];
      }
      return out;
    },
    () => {
      const ind = createOrderflowImbalance(14);
      const out = new Array(recomputeSize);
      for (let t = 0; t < recomputeSize; t++) {
        out[t] = ind.next({ open: open[t], close: close[t], volume: volume[t] });
      }
      return out;
    }
  ),

  benchPair(
    "createVWAPSession()",
    "vwapSession",
    () => {
      const out = new Array(recomputeSize);
      for (let t = 0; t < recomputeSize; t++) {
        const hSlice = high.slice(0, t + 1);
        const lSlice = low.slice(0, t + 1);
        const cSlice = close.slice(0, t + 1);
        const vSlice = volume.slice(0, t + 1);
        const sSlice = sessions.slice(0, t + 1);
        const res = vwapSession(hSlice, lSlice, cSlice, vSlice, sSlice);
        out[t] = res[res.length - 1];
      }
      return out;
    },
    () => {
      const ind = createVWAPSession();
      const out = new Array(recomputeSize);
      for (let t = 0; t < recomputeSize; t++) {
        out[t] = ind.next({
          high: high[t],
          low: low[t],
          close: close[t],
          volume: volume[t],
          sessionId: sessions[t]
        });
      }
      return out;
    }
  )
];

const headers = ["Indicator", "Dataset", "Batch Recompute (ms)", "Streaming (ms)", "Speedup", "Parity"];
const rows = comparisons.map(c => [
  c.name,
  `${recomputeSize.toLocaleString("en-US")} bars`,
  c.batchMs.toFixed(2),
  c.streamMs.toFixed(3),
  c.speedup,
  c.parity
]);

console.log(formatAsciiTable(headers, rows));

// 3. STREAMING HIGH-THROUGHPUT (100k items)
const largeSize = BENCH_SIZES.LARGE_100K;
const largeData = getDataset(largeSize);
const lClose = largeData.close;
const lOpen = largeData.open;
const lHigh = largeData.high;
const lLow = largeData.low;
const lVolume = largeData.volume;

console.log(`\n--- Scenario B: Stateful Streaming High-Throughput (${largeSize.toLocaleString("en-US")} items) ---`);

const streamResults = [
  measureBenchmark("createSMA(20)", () => {
    const ind = createSMA(20);
    for (let i = 0; i < largeSize; i++) ind.next(lClose[i]);
  }, { datasetSize: largeSize, id: "streaming.sma20.100k" }),

  measureBenchmark("createEMA(20)", () => {
    const ind = createEMA(20);
    for (let i = 0; i < largeSize; i++) ind.next(lClose[i]);
  }, { datasetSize: largeSize, id: "streaming.ema20.100k" }),

  measureBenchmark("createRSI(14)", () => {
    const ind = createRSI(14);
    for (let i = 0; i < largeSize; i++) ind.next(lClose[i]);
  }, { datasetSize: largeSize, id: "streaming.rsi14.100k" }),

  measureBenchmark("createMACD(12,26,9)", () => {
    const ind = createMACD(12, 26, 9);
    for (let i = 0; i < largeSize; i++) ind.next(lClose[i]);
  }, { datasetSize: largeSize, id: "streaming.macd.100k" }),

  measureBenchmark("createATR(14)", () => {
    const ind = createATR(14);
    for (let i = 0; i < largeSize; i++) ind.next({ high: lHigh[i], low: lLow[i], close: lClose[i] });
  }, { datasetSize: largeSize, id: "streaming.atr14.100k" }),

  measureBenchmark("createBBANDS(20,2)", () => {
    const ind = createBBANDS(20, 2);
    for (let i = 0; i < largeSize; i++) ind.next(lClose[i]);
  }, { datasetSize: largeSize, id: "streaming.bbands20.100k" }),

  measureBenchmark("createRealizedVol(30)", () => {
    const ind = createRealizedVolatility(30, 365);
    for (let i = 0; i < largeSize; i++) ind.next(lClose[i]);
  }, { datasetSize: largeSize, id: "streaming.realizedVol30.100k" }),

  measureBenchmark("createVolatilityRegime(30)", () => {
    const ind = createVolatilityRegime(30, 365, -0.5, 0.5);
    for (let i = 0; i < largeSize; i++) ind.next(lClose[i]);
  }, { datasetSize: largeSize, id: "streaming.volatilityRegime30.100k" }),

  measureBenchmark("createVolumeDelta(14)", () => {
    const ind = createVolumeDelta(14);
    for (let i = 0; i < largeSize; i++) ind.next({ open: lOpen[i], close: lClose[i], volume: lVolume[i] });
  }, { datasetSize: largeSize, id: "streaming.volumeDelta14.100k" }),

  measureBenchmark("createOrderflowImbal(14)", () => {
    const ind = createOrderflowImbalance(14);
    for (let i = 0; i < largeSize; i++) ind.next({ open: lOpen[i], close: lClose[i], volume: lVolume[i] });
  }, { datasetSize: largeSize, id: "streaming.orderflowImbal14.100k" })
];

const streamHeaders = ["Stateful Constructor", "Dataset", "Median (ms)", "Min (ms)", "Max (ms)", "Throughput (ops/sec)"];
const streamRows = streamResults.map(r => [
  r.name,
  `${largeSize.toLocaleString("en-US")} items`,
  r.medianMs.toFixed(2),
  r.minMs.toFixed(2),
  r.maxMs.toFixed(2),
  r.opsPerSec ? r.opsPerSec.toLocaleString("en-US") : "N/A"
]);

console.log(formatAsciiTable(streamHeaders, streamRows));
console.log("\n[bench-stateful] Completed successfully with zero parity divergences.");
