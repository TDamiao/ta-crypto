/**
 * Regression policy evaluator for ta-crypto benchmark suite.
 * Evaluates candidate timings against baseline, algorithmic scaling ratios, and streaming speedups.
 */

export const DEFAULT_THRESHOLDS = {
  // Delta percentage against baseline:
  // <= 25% is PASS (normal runner variability)
  // 25% to 50% is WARN (observed runner variability)
  // > 50% is FAIL (potential regression)
  deltaPassPct: 25.0,
  deltaWarnPct: 50.0,

  // Absolute noise floor (in ms): differences smaller than 0.25ms (250 microseconds)
  // are within standard OS / timer scheduling jitter and do not trigger regression failures.
  absNoiseFloorMs: 0.25,

  // Maximum allowed time growth ratio for 10x dataset scaling (10k -> 100k):
  // For O(N), ratio is ~10x-15x. Anything > 35x indicates quadratic degradation back to O(N^2).
  scalingRatioMax: 35.0,

  // Minimum required speedup for streaming over naive batch recomputation
  streamingSpeedupMin: 1.0
};

/**
 * Evaluates a candidate benchmark result against a baseline benchmark entry.
 *
 * @param {object} candidate Candidate benchmark result
 * @param {number} candidate.medianMs Candidate median time
 * @param {object} [baseline] Optional baseline entry
 * @param {number} [baseline.medianMs] Baseline median time
 * @param {object} [options]
 * @param {number} [options.deltaPassPct]
 * @param {number} [options.deltaWarnPct]
 * @param {number} [options.absNoiseFloorMs]
 * @returns {{ status: "PASS" | "WARN" | "FAIL" | "NEW", deltaPercent: number | null, message: string }}
 */
export function evaluateBenchmarkDelta(candidate, baseline, options = {}) {
  const passThreshold = options.deltaPassPct ?? DEFAULT_THRESHOLDS.deltaPassPct;
  const warnThreshold = options.deltaWarnPct ?? DEFAULT_THRESHOLDS.deltaWarnPct;
  const noiseFloor = options.absNoiseFloorMs ?? DEFAULT_THRESHOLDS.absNoiseFloorMs;

  if (!candidate || typeof candidate.medianMs !== "number" || !Number.isFinite(candidate.medianMs)) {
    return {
      status: "FAIL",
      deltaPercent: null,
      message: "Candidate benchmark median is not a finite number"
    };
  }

  if (candidate.medianMs <= 0) {
    return {
      status: "FAIL",
      deltaPercent: null,
      message: `Candidate benchmark median is non-positive (${candidate.medianMs} ms)`
    };
  }

  if (!baseline || typeof baseline.medianMs !== "number" || !Number.isFinite(baseline.medianMs) || baseline.medianMs <= 0) {
    return {
      status: "NEW",
      deltaPercent: null,
      message: "No valid baseline recorded for this benchmark ID"
    };
  }

  const absDiff = candidate.medianMs - baseline.medianMs;
  const deltaPercent = Number(((absDiff / baseline.medianMs) * 100).toFixed(2));

  // If the absolute time difference is within the sub-millisecond noise floor, pass cleanly
  if (absDiff <= noiseFloor) {
    return {
      status: "PASS",
      deltaPercent,
      message: deltaPercent <= 0
        ? `Faster by ${Math.abs(deltaPercent)}%`
        : `Within absolute noise floor (+${absDiff.toFixed(3)} ms <= +${noiseFloor} ms)`
    };
  }

  if (deltaPercent <= passThreshold) {
    return {
      status: "PASS",
      deltaPercent,
      message: `Within relative pass tolerance (+${deltaPercent}% <= +${passThreshold}%)`
    };
  }

  if (deltaPercent <= warnThreshold) {
    return {
      status: "WARN",
      deltaPercent,
      message: `Moderate increase (+${deltaPercent}%), flagged for runner noise inspection`
    };
  }

  return {
    status: "FAIL",
    deltaPercent,
    message: `Significant regression (+${deltaPercent}% > +${warnThreshold}%)`
  };
}

/**
 * Evaluates the scaling ratio between 10k and 100k data points.
 *
 * @param {object} bench10k Benchmark result for 10k dataset
 * @param {object} bench100k Benchmark result for 100k dataset
 * @param {object} [options]
 * @param {number} [options.scalingRatioMax]
 * @returns {{ status: "PASS" | "FAIL", ratio: number | null, message: string }}
 */
export function evaluateScalingRatio(bench10k, bench100k, options = {}) {
  const ratioMax = options.scalingRatioMax ?? DEFAULT_THRESHOLDS.scalingRatioMax;

  if (!bench10k || !bench100k || !Number.isFinite(bench10k.medianMs) || !Number.isFinite(bench100k.medianMs)) {
    return {
      status: "FAIL",
      ratio: null,
      message: "Missing or invalid benchmark timing for scaling evaluation"
    };
  }

  if (bench10k.medianMs <= 0 || bench100k.medianMs <= 0) {
    return {
      status: "FAIL",
      ratio: null,
      message: "Non-positive benchmark timing for scaling evaluation"
    };
  }

  const ratio = Number((bench100k.medianMs / bench10k.medianMs).toFixed(2));

  if (ratio <= ratioMax) {
    return {
      status: "PASS",
      ratio,
      message: `Scaling ratio ${ratio}x <= ${ratioMax}x (linear-like complexity preserved)`
    };
  }

  return {
    status: "FAIL",
    ratio,
    message: `Scaling regression: ratio ${ratio}x exceeds maximum ${ratioMax}x (potential O(N^2) degradation)`
  };
}

/**
 * Evaluates the streaming advantage over naive batch recomputation.
 *
 * @param {object} batchRecompute Benchmark result for naive batch recompute
 * @param {object} streaming Benchmark result for streaming indicator
 * @param {object} [options]
 * @param {number} [options.streamingSpeedupMin]
 * @returns {{ status: "PASS" | "FAIL", speedup: number | null, message: string }}
 */
export function evaluateStreamingSpeedup(batchRecompute, streaming, options = {}) {
  const minSpeedup = options.streamingSpeedupMin ?? DEFAULT_THRESHOLDS.streamingSpeedupMin;

  if (!batchRecompute || !streaming || !Number.isFinite(batchRecompute.medianMs) || !Number.isFinite(streaming.medianMs)) {
    return {
      status: "FAIL",
      speedup: null,
      message: "Invalid or missing benchmark timings for streaming evaluation"
    };
  }

  if (batchRecompute.medianMs <= 0 || streaming.medianMs <= 0) {
    return {
      status: "FAIL",
      speedup: null,
      message: "Non-positive timing in streaming speedup evaluation"
    };
  }

  const speedup = Number((batchRecompute.medianMs / streaming.medianMs).toFixed(2));

  if (speedup >= minSpeedup) {
    return {
      status: "PASS",
      speedup,
      message: `Streaming is ${speedup}x faster than batch recomputation`
    };
  }

  return {
    status: "FAIL",
    speedup,
    message: `Streaming speedup (${speedup}x) is below required minimum (${minSpeedup}x)`
  };
}

/**
 * Generates an end-to-end regression evaluation summary.
 *
 * @param {object} params
 * @param {Array<object>} params.candidateBenchmarks Array of candidate benchmark results
 * @param {object} params.baseline Baseline dictionary keyed by benchmark ID
 * @param {Array<object>} [params.scalingPairs] Array of { id, name, bench10k, bench100k }
 * @param {Array<object>} [params.streamingPairs] Array of { id, name, batchRecompute, streaming }
 * @param {object} [params.options] Custom threshold options
 * @returns {object} Full evaluation report
 */
export function evaluateRegressionSuite({
  candidateBenchmarks,
  baseline,
  scalingPairs = [],
  streamingPairs = [],
  options = {}
}) {
  const benchmarkEvaluations = [];
  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;
  let newCount = 0;

  for (const candidate of candidateBenchmarks) {
    const baseEntry = baseline?.benchmarks?.[candidate.id];
    const evaluation = evaluateBenchmarkDelta(candidate, baseEntry, options);

    if (evaluation.status === "PASS") passCount++;
    else if (evaluation.status === "WARN") warnCount++;
    else if (evaluation.status === "FAIL") failCount++;
    else if (evaluation.status === "NEW") newCount++;

    benchmarkEvaluations.push({
      ...candidate,
      baselineMedianMs: baseEntry?.medianMs ?? null,
      deltaPercent: evaluation.deltaPercent,
      status: evaluation.status,
      message: evaluation.message
    });
  }

  const scalingEvaluations = [];
  for (const pair of scalingPairs) {
    const evaluation = evaluateScalingRatio(pair.bench10k, pair.bench100k, options);
    if (evaluation.status === "FAIL") {
      failCount++;
    }
    scalingEvaluations.push({
      id: pair.id,
      name: pair.name,
      median10k: pair.bench10k.medianMs,
      median100k: pair.bench100k.medianMs,
      ratio: evaluation.ratio,
      status: evaluation.status,
      message: evaluation.message
    });
  }

  const streamingEvaluations = [];
  for (const pair of streamingPairs) {
    const evaluation = evaluateStreamingSpeedup(pair.batchRecompute, pair.streaming, options);
    if (evaluation.status === "FAIL") {
      failCount++;
    }
    streamingEvaluations.push({
      id: pair.id,
      name: pair.name,
      datasetSize: pair.datasetSize,
      batchRecomputeMedianMs: pair.batchRecompute.medianMs,
      streamingMedianMs: pair.streaming.medianMs,
      speedup: evaluation.speedup,
      status: evaluation.status,
      message: evaluation.message
    });
  }

  const overallStatus = failCount > 0 ? "FAIL" : warnCount > 0 ? "WARN" : "PASS";

  return {
    overallStatus,
    summary: {
      total: benchmarkEvaluations.length + scalingEvaluations.length + streamingEvaluations.length,
      passCount,
      warnCount,
      failCount,
      newCount
    },
    benchmarks: benchmarkEvaluations,
    scaling: scalingEvaluations,
    streaming: streamingEvaluations
  };
}
