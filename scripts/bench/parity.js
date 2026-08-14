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
} from "../../dist/api.js";
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
} from "../../dist/stateful.js";
import { getDataset } from "./dataset.js";

/**
 * Asserts series parity between actual and expected numeric/null arrays.
 * Throws a descriptive diagnostic error on any divergence.
 *
 * @param {string} indicator
 * @param {Array<number | null>} actual
 * @param {Array<number | null>} expected
 * @param {number} [tolerance=1e-10]
 * @returns {number} Maximum absolute difference observed
 */
export function assertSeriesParity(indicator, actual, expected, tolerance = 1e-9) {
  if (!Array.isArray(actual) || !Array.isArray(expected)) {
    throw new TypeError(`[parity-gate] ${indicator}: actual and expected must be arrays`);
  }

  if (actual.length !== expected.length) {
    throw new Error(
      `[parity-gate] ${indicator}: length mismatch (actual=${actual.length}, expected=${expected.length})`
    );
  }

  let maxDiff = 0;

  for (let i = 0; i < actual.length; i++) {
    const a = actual[i];
    const e = expected[i];

    if (a === null || e === null) {
      if (a !== e) {
        throw new Error(
          `[parity-gate] ${indicator}: null mismatch at index ${i} (actual=${a}, expected=${e})`
        );
      }
    } else {
      if (!Number.isFinite(a) || !Number.isFinite(e)) {
        throw new Error(
          `[parity-gate] ${indicator}: non-finite value at index ${i} (actual=${a}, expected=${e})`
        );
      }

      const diff = Math.abs(a - e);
      if (diff > maxDiff) {
        maxDiff = diff;
      }

      if (diff > tolerance) {
        throw new Error(
          `[parity-gate] ${indicator}: numeric tolerance breach at index ${i}\n` +
          `  actual:    ${a}\n` +
          `  expected:  ${e}\n` +
          `  diff:      ${diff}\n` +
          `  tolerance: ${tolerance}`
        );
      }
    }
  }

  return maxDiff;
}

/**
 * Asserts exact discrete value match (e.g. for volatility regime labels: -1, 0, 1, null).
 *
 * @param {string} indicator
 * @param {Array<number | null>} actual
 * @param {Array<number | null>} expected
 */
export function assertDiscreteParity(indicator, actual, expected) {
  if (actual.length !== expected.length) {
    throw new Error(
      `[parity-gate] ${indicator}: length mismatch (actual=${actual.length}, expected=${expected.length})`
    );
  }

  for (let i = 0; i < actual.length; i++) {
    const a = actual[i];
    const e = expected[i];
    if (a !== e) {
      throw new Error(
        `[parity-gate] ${indicator}: discrete label mismatch at index ${i} (actual=${a}, expected=${e})`
      );
    }
  }
}

/**
 * Runs a full point-by-point parity gate across all stateful constructors versus batch API.
 * Aborts immediately with descriptive error if any parity check fails.
 *
 * @param {object} [dataset] Optional custom dataset
 * @param {number} [datasetSize=2000] Dataset size for parity verification
 * @returns {{ passed: boolean, checksCount: number, details: Record<string, { points: number, maxDiff: number }> }}
 */
export function runComprehensiveParityGate(dataset, datasetSize = 2000) {
  const data = dataset ?? getDataset(datasetSize);
  const { open, high, low, close, volume, candles } = data;
  const n = close.length;

  const details = {};
  let checksCount = 0;

  // 1. SMA(20)
  {
    const expected = sma(close, 20);
    const ind = createSMA(20);
    const actual = new Array(n);
    for (let i = 0; i < n; i++) actual[i] = ind.next(close[i]);
    const maxDiff = assertSeriesParity("SMA(20)", actual, expected, 1e-10);
    details["SMA(20)"] = { points: n, maxDiff };
    checksCount++;
  }

  // 2. EMA(20)
  {
    const expected = ema(close, 20);
    const ind = createEMA(20);
    const actual = new Array(n);
    for (let i = 0; i < n; i++) actual[i] = ind.next(close[i]);
    const maxDiff = assertSeriesParity("EMA(20)", actual, expected, 1e-10);
    details["EMA(20)"] = { points: n, maxDiff };
    checksCount++;
  }

  // 3. RSI(14)
  {
    const expected = rsi(close, 14);
    const ind = createRSI(14);
    const actual = new Array(n);
    for (let i = 0; i < n; i++) actual[i] = ind.next(close[i]);
    const maxDiff = assertSeriesParity("RSI(14)", actual, expected, 1e-10);
    details["RSI(14)"] = { points: n, maxDiff };
    checksCount++;
  }

  // 4. MACD(12, 26, 9)
  {
    const expected = macd(close, 12, 26, 9);
    const ind = createMACD(12, 26, 9);
    const actMacd = new Array(n);
    const actSignal = new Array(n);
    const actHist = new Array(n);
    for (let i = 0; i < n; i++) {
      const res = ind.next(close[i]);
      actMacd[i] = res.macd;
      actSignal[i] = res.signal;
      actHist[i] = res.histogram;
    }
    const diffM = assertSeriesParity("MACD.line(12,26,9)", actMacd, expected.macd, 1e-10);
    const diffS = assertSeriesParity("MACD.signal(12,26,9)", actSignal, expected.signal, 1e-10);
    const diffH = assertSeriesParity("MACD.histogram(12,26,9)", actHist, expected.histogram, 1e-10);
    details["MACD(12,26,9)"] = { points: n, maxDiff: Math.max(diffM, diffS, diffH) };
    checksCount += 3;
  }

  // 5. ATR(14)
  {
    const expected = atr(high, low, close, 14);
    const ind = createATR(14);
    const actual = new Array(n);
    for (let i = 0; i < n; i++) actual[i] = ind.next({ high: high[i], low: low[i], close: close[i] });
    const maxDiff = assertSeriesParity("ATR(14)", actual, expected, 1e-10);
    details["ATR(14)"] = { points: n, maxDiff };
    checksCount++;
  }

  // 6. BBANDS(20, 2)
  {
    const expected = bbands(close, 20, 2);
    const ind = createBBANDS(20, 2);
    const actBasis = new Array(n);
    const actUpper = new Array(n);
    const actLower = new Array(n);
    for (let i = 0; i < n; i++) {
      const res = ind.next(close[i]);
      actBasis[i] = res.basis;
      actUpper[i] = res.upper;
      actLower[i] = res.lower;
    }
    const diffB = assertSeriesParity("BBANDS.basis(20,2)", actBasis, expected.basis, 1e-10);
    const diffU = assertSeriesParity("BBANDS.upper(20,2)", actUpper, expected.upper, 1e-10);
    const diffL = assertSeriesParity("BBANDS.lower(20,2)", actLower, expected.lower, 1e-10);
    details["BBANDS(20,2)"] = { points: n, maxDiff: Math.max(diffB, diffU, diffL) };
    checksCount += 3;
  }

  // 7. RealizedVolatility(30, 365)
  {
    const expected = realizedVolatility(close, 30, 365);
    const ind = createRealizedVolatility(30, 365);
    const actual = new Array(n);
    for (let i = 0; i < n; i++) actual[i] = ind.next(close[i]);
    const maxDiff = assertSeriesParity("RealizedVolatility(30)", actual, expected, 1e-10);
    details["RealizedVolatility(30)"] = { points: n, maxDiff };
    checksCount++;
  }

  // 8. VolatilityRegime(30, 365, -0.5, 0.5)
  {
    const expected = volatilityRegime(close, 30, 365, -0.5, 0.5);
    const ind = createVolatilityRegime(30, 365, -0.5, 0.5);
    const actual = new Array(n);
    for (let i = 0; i < n; i++) actual[i] = ind.next(close[i]);
    assertDiscreteParity("VolatilityRegime(30)", actual, expected);
    details["VolatilityRegime(30)"] = { points: n, maxDiff: 0 };
    checksCount++;
  }

  // 9. VolumeDelta(14)
  {
    const expected = volumeDelta(open, close, volume, 14);
    const ind = createVolumeDelta(14);
    const actual = new Array(n);
    for (let i = 0; i < n; i++) actual[i] = ind.next({ open: open[i], close: close[i], volume: volume[i] });
    const maxDiff = assertSeriesParity("VolumeDelta(14)", actual, expected, 1e-10);
    details["VolumeDelta(14)"] = { points: n, maxDiff };
    checksCount++;
  }

  // 10. OrderflowImbalance(14)
  {
    const expected = orderflowImbalance(open, close, volume, 14);
    const ind = createOrderflowImbalance(14);
    const actual = new Array(n);
    for (let i = 0; i < n; i++) actual[i] = ind.next({ open: open[i], close: close[i], volume: volume[i] });
    const maxDiff = assertSeriesParity("OrderflowImbalance(14)", actual, expected, 1e-10);
    details["OrderflowImbalance(14)"] = { points: n, maxDiff };
    checksCount++;
  }

  // 11. VWAPSession
  {
    const sessions = new Array(n);
    for (let i = 0; i < n; i++) {
      sessions[i] = `session_${Math.floor(i / 100)}`;
    }
    const expected = vwapSession(high, low, close, volume, sessions);
    const ind = createVWAPSession();
    const actual = new Array(n);
    for (let i = 0; i < n; i++) {
      actual[i] = ind.next({
        high: high[i],
        low: low[i],
        close: close[i],
        volume: volume[i],
        sessionId: sessions[i]
      });
    }
    const maxDiff = assertSeriesParity("VWAPSession", actual, expected, 1e-10);
    details["VWAPSession"] = { points: n, maxDiff };
    checksCount++;
  }

  return { passed: true, checksCount, details };
}
