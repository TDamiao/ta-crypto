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
import { getDataset, BENCH_SIZES } from "./bench/dataset.js";
import { measureBenchmark, getEnvironmentMetadata, formatAsciiTable } from "./bench/harness.js";

const env = getEnvironmentMetadata();
console.log("================================================================================");
console.log(" ta-crypto Deterministic Indicator Benchmark");
console.log(` Node: ${env.nodeVersion} | Platform: ${env.platform} (${env.arch}) | CPU: ${env.cpuModel} (${env.cpuCount} cores)`);
console.log("================================================================================\n");

const size = BENCH_SIZES.STANDARD_10K;
const data = getDataset(size);
const { open, high, low, close, volume } = data;

console.log(`[bench] Executing 10k deterministic candle benchmark (seed: 0x43525950, 7 samples, 3 warmups)...\n`);

const results = [
  measureBenchmark("sma(20)", () => sma(close, 20), { datasetSize: size, id: "batch.sma20.10k" }),
  measureBenchmark("ema(20)", () => ema(close, 20), { datasetSize: size, id: "batch.ema20.10k" }),
  measureBenchmark("rsi(14)", () => rsi(close, 14), { datasetSize: size, id: "batch.rsi14.10k" }),
  measureBenchmark("macd(12,26,9)", () => macd(close, 12, 26, 9), { datasetSize: size, id: "batch.macd.10k" }),
  measureBenchmark("bbands(20,2)", () => bbands(close, 20, 2), { datasetSize: size, id: "batch.bbands20.10k" }),
  measureBenchmark("atr(14)", () => atr(high, low, close, 14), { datasetSize: size, id: "batch.atr14.10k" }),
  measureBenchmark("adx(14)", () => adx(high, low, close, 14), { datasetSize: size, id: "batch.adx14.10k" }),
  measureBenchmark("mfi(14)", () => mfi(high, low, close, volume, 14), { datasetSize: size, id: "batch.mfi14.10k" }),
  measureBenchmark("vwap(20)", () => vwap(high, low, close, volume, 20), { datasetSize: size, id: "batch.vwap20.10k" }),
  measureBenchmark("volumeDelta(14)", () => volumeDelta(open, close, volume, 14), { datasetSize: size, id: "batch.volumeDelta14.10k" }),
  measureBenchmark("orderflowImbalance(14)", () => orderflowImbalance(open, close, volume, 14), { datasetSize: size, id: "batch.orderflowImbal14.10k" }),
  measureBenchmark("realizedVol(30)", () => realizedVolatility(close, 30, 365), { datasetSize: size, id: "batch.realizedVol30.10k" }),
  measureBenchmark("volatilityRegime(30)", () => volatilityRegime(close, 30, 365, -0.5, 0.5), { datasetSize: size, id: "batch.volatilityRegime30.10k" })
];

const headers = ["Indicator", "Dataset", "Median (ms)", "Min (ms)", "Max (ms)", "Ops / sec"];
const rows = results.map(r => [
  r.name,
  `${size.toLocaleString("en-US")} bars`,
  r.medianMs.toFixed(3),
  r.minMs.toFixed(3),
  r.maxMs.toFixed(3),
  r.opsPerSec ? r.opsPerSec.toLocaleString("en-US") : "N/A"
]);

console.log(formatAsciiTable(headers, rows));
console.log("\n[bench] Completed successfully with zero Math.random() calls.");
