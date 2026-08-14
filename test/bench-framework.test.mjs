import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createRNG, DEFAULT_BENCH_SEED } from "../scripts/bench/prng.js";
import { generateDeterministicDataset, getDataset, BENCH_SIZES } from "../scripts/bench/dataset.js";
import { measureBenchmark, getEnvironmentMetadata } from "../scripts/bench/harness.js";
import { assertSeriesParity, assertDiscreteParity } from "../scripts/bench/parity.js";
import {
  evaluateBenchmarkDelta,
  evaluateScalingRatio,
  evaluateStreamingSpeedup,
  evaluateRegressionSuite,
  DEFAULT_THRESHOLDS
} from "../scripts/bench/regression-evaluator.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASELINE_PATH = path.resolve(__dirname, "../bench/baseline.json");

test("PRNG: determinism and seed differentiation", () => {
  const rng1 = createRNG(0x12345678);
  const rng2 = createRNG(0x12345678);
  const rng3 = createRNG(0x87654321);

  const seq1 = Array.from({ length: 50 }, () => rng1());
  const seq2 = Array.from({ length: 50 }, () => rng2());
  const seq3 = Array.from({ length: 50 }, () => rng3());

  assert.deepEqual(seq1, seq2, "same seed must generate identical random sequences");
  assert.notDeepEqual(seq1, seq3, "different seeds must produce different sequences");

  for (const val of seq1) {
    assert(val >= 0 && val < 1, `value ${val} out of [0, 1) bounds`);
  }
});

test("dataset generator: deterministic outputs and financial domain integrity", () => {
  const d1 = generateDeterministicDataset({ size: 500, seed: 12345 });
  const d2 = generateDeterministicDataset({ size: 500, seed: 12345 });
  const d3 = generateDeterministicDataset({ size: 500, seed: 99999 });

  assert.equal(d1.close.length, 500);
  assert.equal(d1.open.length, 500);
  assert.equal(d1.high.length, 500);
  assert.equal(d1.low.length, 500);
  assert.equal(d1.volume.length, 500);
  assert.equal(d1.candles.length, 500);

  assert.deepEqual(d1.close, d2.close, "same seed must yield exact same close array");
  assert.deepEqual(d1.high, d2.high, "same seed must yield exact same high array");
  assert.deepEqual(d1.low, d2.low, "same seed must yield exact same low array");
  assert.deepEqual(d1.volume, d2.volume, "same seed must yield exact same volume array");

  assert.notDeepEqual(d1.close, d3.close, "different seed must yield different close array");

  // Validate financial invariants on all 500 bars
  for (let i = 0; i < 500; i++) {
    const o = d1.open[i];
    const h = d1.high[i];
    const l = d1.low[i];
    const c = d1.close[i];
    const v = d1.volume[i];

    assert(o > 0, `open price must be positive at index ${i}`);
    assert(c > 0, `close price must be positive at index ${i}`);
    assert(h > 0, `high price must be positive at index ${i}`);
    assert(l > 0, `low price must be positive at index ${i}`);
    assert(v >= 0, `volume must be non-negative at index ${i}`);

    assert(h >= Math.max(o, c), `high must be >= max(open, close) at index ${i}`);
    assert(l <= Math.min(o, c), `low must be <= min(open, close) at index ${i}`);
    assert(h >= l, `high must be >= low at index ${i}`);
  }
});

test("dataset caching: getDataset returns consistent references", () => {
  const ref1 = getDataset(BENCH_SIZES.RECOMPUTE_SMALL);
  const ref2 = getDataset(BENCH_SIZES.RECOMPUTE_SMALL);
  assert.strictEqual(ref1, ref2, "getDataset should cache standard datasets");
});

test("measurement harness: warmups, statistics, and validation", () => {
  let callCount = 0;
  const fn = () => {
    callCount++;
    return 42;
  };

  const res = measureBenchmark("test-bench", fn, {
    datasetSize: 1000,
    warmupRuns: 2,
    sampleCount: 5,
    id: "test.bench.1"
  });

  assert.equal(callCount, 7, "warmups (2) + samples (5) should equal 7 total calls");
  assert.equal(res.id, "test.bench.1");
  assert.equal(res.datasetSize, 1000);
  assert.equal(res.samples.length, 5);
  assert(res.medianMs > 0);
  assert(res.minMs <= res.medianMs);
  assert(res.maxMs >= res.medianMs);
  assert(res.opsPerSec > 0);

  // Validate rejection of invalid inputs
  assert.throws(() => measureBenchmark("bad", "not-a-function"), /must be a function/);

  // Validate validator callback
  assert.throws(
    () => measureBenchmark("bad-return", () => NaN, { validateResult: v => !Number.isNaN(v) }),
    /invalid result/
  );
});

test("environment metadata: reports system toolchain info", () => {
  const env = getEnvironmentMetadata();
  assert(typeof env.nodeVersion === "string" && env.nodeVersion.startsWith("v"));
  assert(typeof env.platform === "string");
  assert(typeof env.arch === "string");
  assert(typeof env.cpuCount === "number" && env.cpuCount > 0);
  assert(typeof env.totalMemoryMb === "number" && env.totalMemoryMb > 0);
});

test("parity assertions: assertSeriesParity", () => {
  const seriesA = [1.0, 2.0, null, 4.0, 5.00000000001];
  const seriesB = [1.0, 2.0, null, 4.0, 5.0];

  // Passes within tolerance
  const diff = assertSeriesParity("test-series", seriesA, seriesB, 1e-9);
  assert(diff <= 1e-9);

  // Fails on length mismatch
  assert.throws(
    () => assertSeriesParity("len-mismatch", [1, 2], [1, 2, 3]),
    /length mismatch/
  );

  // Fails on null mismatch
  assert.throws(
    () => assertSeriesParity("null-mismatch", [1, null], [1, 2]),
    /null mismatch at index 1/
  );

  // Fails on numeric tolerance breach with diagnostic details
  assert.throws(
    () => assertSeriesParity("numeric-mismatch", [1.0, 2.5], [1.0, 2.0], 1e-4),
    /numeric tolerance breach at index 1/
  );

  // Fails on NaN
  assert.throws(
    () => assertSeriesParity("nan-check", [1.0, NaN], [1.0, 2.0]),
    /non-finite value/
  );
});

test("parity assertions: assertDiscreteParity", () => {
  assert.doesNotThrow(() => {
    assertDiscreteParity("discrete", [-1, 0, 1, null, 0], [-1, 0, 1, null, 0]);
  });

  assert.throws(() => {
    assertDiscreteParity("discrete-fail", [-1, 0, 1], [-1, 1, 1]);
  }, /discrete label mismatch at index 1/);
});

test("regression evaluator: evaluateBenchmarkDelta", () => {
  const baseline = { medianMs: 10.0 };

  // Improvement (faster) => PASS
  const faster = evaluateBenchmarkDelta({ medianMs: 8.0 }, baseline);
  assert.equal(faster.status, "PASS");
  assert.equal(faster.deltaPercent, -20);

  // Small increase (within +25%) => PASS
  const smallIncrease = evaluateBenchmarkDelta({ medianMs: 11.0 }, baseline);
  assert.equal(smallIncrease.status, "PASS");
  assert.equal(smallIncrease.deltaPercent, 10);

  // Moderate increase (+25% to +50%) => WARN
  const moderateIncrease = evaluateBenchmarkDelta({ medianMs: 13.5 }, baseline);
  assert.equal(moderateIncrease.status, "WARN");
  assert.equal(moderateIncrease.deltaPercent, 35);

  // Large regression (> +50%) => FAIL
  const largeRegression = evaluateBenchmarkDelta({ medianMs: 16.0 }, baseline);
  assert.equal(largeRegression.status, "FAIL");
  assert.equal(largeRegression.deltaPercent, 60);

  // Absolute noise floor handling (sub-millisecond delta passes regardless of %)
  const tinyBase = { medianMs: 0.10 };
  const tinyDelta = evaluateBenchmarkDelta({ medianMs: 0.15 }, tinyBase); // +50% but only 0.05ms diff <= 0.25ms
  assert.equal(tinyDelta.status, "PASS");

  // Missing baseline => NEW
  const missingBase = evaluateBenchmarkDelta({ medianMs: 1.00 }, null);
  assert.equal(missingBase.status, "NEW");

  // Invalid candidates (NaN, Infinity, negative) => FAIL
  assert.equal(evaluateBenchmarkDelta({ medianMs: NaN }, baseline).status, "FAIL");
  assert.equal(evaluateBenchmarkDelta({ medianMs: Infinity }, baseline).status, "FAIL");
  assert.equal(evaluateBenchmarkDelta({ medianMs: -1.0 }, baseline).status, "FAIL");
});

test("regression evaluator: evaluateScalingRatio (10k vs 100k)", () => {
  // Linear scaling (~10x data => ~10x time) => PASS
  const linear = evaluateScalingRatio({ medianMs: 0.10 }, { medianMs: 1.00 });
  assert.equal(linear.status, "PASS");
  assert.equal(linear.ratio, 10);

  // Sub-linear / JIT-warmed scaling => PASS
  const subLinear = evaluateScalingRatio({ medianMs: 0.20 }, { medianMs: 1.50 });
  assert.equal(subLinear.status, "PASS");
  assert.equal(subLinear.ratio, 7.5);

  // Acceptable upper bound (e.g. 80x <= 100x) => PASS
  const bounded = evaluateScalingRatio({ medianMs: 0.10 }, { medianMs: 8.00 });
  assert.equal(bounded.status, "PASS");
  assert.equal(bounded.ratio, 80);

  // Quadratic regression (~200x time) => FAIL
  const quadratic = evaluateScalingRatio({ medianMs: 0.10 }, { medianMs: 25.00 });
  assert.equal(quadratic.status, "FAIL");
  assert.equal(quadratic.ratio, 250);

  // Invalid inputs => FAIL
  assert.equal(evaluateScalingRatio({ medianMs: NaN }, { medianMs: 1.0 }).status, "FAIL");
});

test("regression evaluator: evaluateStreamingSpeedup", () => {
  // 100x faster streaming => PASS
  const fast = evaluateStreamingSpeedup({ medianMs: 10.0 }, { medianMs: 0.1 });
  assert.equal(fast.status, "PASS");
  assert.equal(fast.speedup, 100);

  // 1.5x faster streaming => PASS
  const mild = evaluateStreamingSpeedup({ medianMs: 1.5 }, { medianMs: 1.0 });
  assert.equal(mild.status, "PASS");

  // Slower streaming (0.5x speedup) => FAIL
  const slower = evaluateStreamingSpeedup({ medianMs: 1.0 }, { medianMs: 2.0 });
  assert.equal(slower.status, "FAIL");
  assert.equal(slower.speedup, 0.5);

  // Invalid inputs => FAIL
  assert.equal(evaluateStreamingSpeedup({ medianMs: NaN }, { medianMs: 1.0 }).status, "FAIL");
});

test("regression evaluator: evaluateRegressionSuite summary", () => {
  const candidateBenchmarks = [
    { id: "b1", medianMs: 10.0 },
    { id: "b2", medianMs: 13.5 },
    { id: "b3", medianMs: 20.0 }
  ];
  const baseline = {
    benchmarks: {
      b1: { medianMs: 10.0 },
      b2: { medianMs: 10.0 },
      b3: { medianMs: 10.0 }
    }
  };

  const report = evaluateRegressionSuite({ candidateBenchmarks, baseline });
  assert.equal(report.summary.passCount, 1);
  assert.equal(report.summary.warnCount, 1);
  assert.equal(report.summary.failCount, 1);
  assert.equal(report.overallStatus, "FAIL");
});

test("baseline file: schema, completeness, and non-volatility", () => {
  assert(fs.existsSync(BASELINE_PATH), "bench/baseline.json must exist");
  const raw = fs.readFileSync(BASELINE_PATH, "utf8");
  const parsed = JSON.parse(raw);

  assert.equal(parsed.$schemaVersion, 1);
  assert.equal(parsed.policyVersion, 1);
  assert.equal(parsed.seed, DEFAULT_BENCH_SEED);
  assert(typeof parsed.benchmarks === "object" && parsed.benchmarks !== null);

  const keys = Object.keys(parsed.benchmarks);
  assert(keys.length >= 30, `Expected at least 30 baseline benchmarks, got ${keys.length}`);

  const requiredPrefixes = ["batch.", "streaming."];
  for (const prefix of requiredPrefixes) {
    const hasPrefix = keys.some(k => k.startsWith(prefix));
    assert(hasPrefix, `baseline must contain benchmarks starting with ${prefix}`);
  }

  for (const [id, entry] of Object.entries(parsed.benchmarks)) {
    assert(typeof entry.name === "string" && entry.name.length > 0, `${id}: name must be non-empty string`);
    assert(typeof entry.datasetSize === "number" && entry.datasetSize > 0, `${id}: datasetSize must be positive`);
    assert(typeof entry.medianMs === "number" && entry.medianMs > 0, `${id}: medianMs must be positive`);
    assert(typeof entry.opsPerSec === "number" && entry.opsPerSec > 0, `${id}: opsPerSec must be positive`);
  }

  // Ensure no volatile environment metadata leaked into baseline file
  assert.equal(parsed.hostname, undefined);
  assert.equal(parsed.username, undefined);
  assert.equal(parsed.localPath, undefined);
  assert.equal(parsed.cpuModel, undefined);
});

test("baseline immutability: evaluateRegressionSuite does not mutate baseline file", () => {
  const contentBefore = fs.readFileSync(BASELINE_PATH, "utf8");
  const baseline = JSON.parse(contentBefore);

  evaluateRegressionSuite({
    candidateBenchmarks: [{ id: "batch.sma20.10k", medianMs: 0.5 }],
    baseline
  });

  const contentAfter = fs.readFileSync(BASELINE_PATH, "utf8");
  assert.equal(contentBefore, contentAfter, "baseline file must remain unmodified after evaluation");
});
