import { performance } from "node:perf_hooks";
import os from "node:os";

/**
 * Measures the execution performance of a target function with warm-up and multi-sample median.
 *
 * @param {string} name Human-readable benchmark name
 * @param {() => unknown} fn Function to benchmark
 * @param {object} [options]
 * @param {string} [options.id] Unique benchmark ID
 * @param {string} [options.group] Category / group
 * @param {number} [options.datasetSize] Number of elements in dataset (for ops/sec)
 * @param {number} [options.warmupRuns=3] Number of warm-up runs (not counted in metrics)
 * @param {number} [options.sampleCount=7] Number of measured sample runs (must be >= 1)
 * @param {number} [options.innerIterations=1] Inner loop iterations per sample to stabilize sub-ms timing
 * @param {(result: unknown) => boolean} [options.validateResult] Optional result validator
 * @returns {{
 *   id: string,
 *   name: string,
 *   group: string,
 *   datasetSize: number | null,
 *   warmupRuns: number,
 *   sampleCount: number,
 *   innerIterations: number,
 *   medianMs: number,
 *   minMs: number,
 *   maxMs: number,
 *   meanMs: number,
 *   stdDevMs: number,
 *   opsPerSec: number | null,
 *   samples: number[]
 * }}
 */
export function measureBenchmark(name, fn, options = {}) {
  if (typeof fn !== "function") {
    throw new TypeError(`Benchmark '${name}': fn must be a function`);
  }

  const id = options.id ?? name;
  const group = options.group ?? "general";
  const datasetSize = typeof options.datasetSize === "number" && options.datasetSize > 0 ? options.datasetSize : null;
  const warmupRuns = Math.max(0, options.warmupRuns ?? 3);
  const sampleCount = Math.max(1, options.sampleCount ?? 7);
  const innerIterations = Math.max(1, options.innerIterations ?? 1);

  if (typeof global !== "undefined" && typeof global.gc === "function") {
    try { global.gc(); } catch (_) {}
  }

  // Warm-up runs to trigger V8 tier-up and JIT optimization
  for (let i = 0; i < warmupRuns; i++) {
    for (let k = 0; k < innerIterations; k++) {
      const result = fn();
      if (options.validateResult && !options.validateResult(result)) {
        throw new Error(`Benchmark '${id}': warm-up run ${i + 1} produced an invalid result`);
      }
    }
  }

  const rawSamples = new Float64Array(sampleCount);

  for (let i = 0; i < sampleCount; i++) {
    const t0 = performance.now();
    for (let k = 0; k < innerIterations; k++) {
      const result = fn();
      if (options.validateResult && !options.validateResult(result)) {
        throw new Error(`Benchmark '${id}': sample ${i + 1} produced an invalid result`);
      }
    }
    const t1 = performance.now();
    const elapsed = (t1 - t0) / innerIterations;

    if (!Number.isFinite(elapsed) || Number.isNaN(elapsed) || elapsed < 0) {
      throw new Error(`Benchmark '${id}': sample ${i + 1} produced invalid elapsed time (${elapsed} ms)`);
    }

    rawSamples[i] = elapsed;
  }

  const sortedSamples = Array.from(rawSamples).sort((a, b) => a - b);
  const minMs = sortedSamples[0];
  const maxMs = sortedSamples[sortedSamples.length - 1];

  let medianMs;
  const mid = Math.floor(sortedSamples.length / 2);
  if (sortedSamples.length % 2 === 1) {
    medianMs = sortedSamples[mid];
  } else {
    medianMs = (sortedSamples[mid - 1] + sortedSamples[mid]) / 2;
  }

  const sum = sortedSamples.reduce((acc, v) => acc + v, 0);
  const meanMs = sum / sortedSamples.length;

  let variance = 0;
  for (const s of sortedSamples) {
    const d = s - meanMs;
    variance += d * d;
  }
  const stdDevMs = Math.sqrt(variance / sortedSamples.length);

  const opsPerSec = datasetSize !== null && medianMs > 0
    ? Math.round(datasetSize / (medianMs / 1000))
    : null;

  return {
    id,
    name,
    group,
    datasetSize,
    warmupRuns,
    sampleCount,
    innerIterations,
    medianMs: Number(medianMs.toFixed(4)),
    minMs: Number(minMs.toFixed(4)),
    maxMs: Number(maxMs.toFixed(4)),
    meanMs: Number(meanMs.toFixed(4)),
    stdDevMs: Number(stdDevMs.toFixed(4)),
    opsPerSec,
    samples: sortedSamples.map(v => Number(v.toFixed(4)))
  };
}

/**
 * Collects runtime and toolchain environment metadata.
 * @returns {object}
 */
export function getEnvironmentMetadata() {
  const cpus = os.cpus();
  return {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    v8Version: process.versions.v8,
    cpuModel: cpus.length > 0 ? cpus[0].model.trim() : "unknown",
    cpuCount: cpus.length,
    totalMemoryMb: Math.round(os.totalmem() / (1024 * 1024)),
    osRelease: os.release()
  };
}

/**
 * Formats a 2D array of rows into an ASCII table.
 * @param {string[]} headers
 * @param {Array<Array<string | number>>} rows
 * @returns {string}
 */
export function formatAsciiTable(headers, rows) {
  const colWidths = headers.map((h, i) => {
    let max = h.length;
    for (const row of rows) {
      const cell = String(row[i] ?? "");
      if (cell.length > max) max = cell.length;
    }
    return max;
  });

  const formatRow = (cells) =>
    "| " + cells.map((c, i) => String(c ?? "").padEnd(colWidths[i])).join(" | ") + " |";

  const divider = "|-" + colWidths.map(w => "-".repeat(w)).join("-|-") + "-|";

  const headerLine = formatRow(headers);
  const dataLines = rows.map(r => formatRow(r));

  return [headerLine, divider, ...dataLines].join("\n");
}
