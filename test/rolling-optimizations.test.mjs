import test from "node:test";
import assert from "node:assert/strict";
import {
  mfi,
  vwap,
  volumeDelta,
  orderflowImbalance,
  realizedVolatility,
  volatilityRegime,
  toOHLCV
} from "../dist/index.js";

const eps = 1e-10;

function assertSeriesApprox(actual, expected, tolerance = eps) {
  assert.equal(actual.length, expected.length, "length mismatch");
  for (let i = 0; i < actual.length; i++) {
    const a = actual[i];
    const e = expected[i];
    if (a === null || e === null) {
      assert.equal(a, e, `null mismatch at index ${i}`);
    } else {
      assert.ok(
        Math.abs(a - e) <= tolerance,
        `numeric mismatch at index ${i}: actual ${a} !== expected ${e}`
      );
    }
  }
}

test("mfi rolling implementation handles equal typical prices, zero negative flow, and all-zero flow", () => {
  // Flat prices -> all-zero flow -> output should be 50
  const flatH = [100, 100, 100, 100, 100];
  const flatL = [100, 100, 100, 100, 100];
  const flatC = [100, 100, 100, 100, 100];
  const vol = [10, 10, 10, 10, 10];

  const flatMFI = mfi(flatH, flatL, flatC, vol, 2);
  assert.equal(flatMFI[0], null);
  assert.equal(flatMFI[1], null);
  assert.equal(flatMFI[2], 50);
  assert.equal(flatMFI[3], 50);
  assert.equal(flatMFI[4], 50);

  // Pure upward movement -> zero negative flow -> output should be 100
  const upH = [100, 102, 104, 106, 108];
  const upL = [98, 100, 102, 104, 106];
  const upC = [99, 101, 103, 105, 107];
  const upMFI = mfi(upH, upL, upC, vol, 2);
  assert.equal(upMFI[2], 100);
  assert.equal(upMFI[3], 100);
  assert.equal(upMFI[4], 100);

  // Pure downward movement -> zero positive flow -> output should be 0
  const downH = [108, 106, 104, 102, 100];
  const downL = [106, 104, 102, 100, 98];
  const downC = [107, 105, 103, 101, 99];
  const downMFI = mfi(downH, downL, downC, vol, 2);
  assert.equal(downMFI[2], 0);
  assert.equal(downMFI[3], 0);
  assert.equal(downMFI[4], 0);
});

test("periodic vwap matches manual reference and handles zero-volume windows", () => {
  const high = [10, 12, 14, 16, 18];
  const low = [8, 10, 12, 14, 16];
  const close = [9, 11, 13, 15, 17];
  // typical = [9, 11, 13, 15, 17]
  const volume = [100, 200, 300, 0, 100];

  const pVWAP = vwap(high, low, close, volume, 3);
  assert.equal(pVWAP.length, 5);
  assert.equal(pVWAP[0], null);
  assert.equal(pVWAP[1], null);

  // at index 2: (9*100 + 11*200 + 13*300) / (100+200+300) = (900 + 2200 + 3900) / 600 = 7000 / 600 = 11.666666666666666
  assert.ok(Math.abs(pVWAP[2] - 7000 / 600) < eps);

  // at index 3: window [1, 2, 3] -> (11*200 + 13*300 + 15*0) / (200 + 300 + 0) = 6100 / 500 = 12.2
  assert.ok(Math.abs(pVWAP[3] - 12.2) < eps);

  // Zero-volume window
  const zeroVol = [0, 0, 0, 0];
  const zeroVWAP = vwap(high.slice(0, 4), low.slice(0, 4), close.slice(0, 4), zeroVol, 2);
  assert.equal(zeroVWAP[0], null);
  assert.equal(zeroVWAP[1], null);
  assert.equal(zeroVWAP[2], null);
  assert.equal(zeroVWAP[3], null);
});

test("volumeDelta and orderflowImbalance match deterministic definitions and candle parity", () => {
  const open = [100, 105, 102, 108, 106];
  const close = [105, 102, 104, 108, 103]; // signs: +1, -1, +1, 0, -1
  const volume = [10, 20, 30, 40, 50]; // signedVol: +10, -20, +30, 0, -50

  const vd = volumeDelta(open, close, volume, 2);
  // at 0: null, at 1: (+10 - 20) = -10, at 2: (-20 + 30) = 10, at 3: (+30 + 0) = 30, at 4: (0 - 50) = -50
  assert.deepEqual(vd, [null, -10, 10, 30, -50]);

  const ofi = orderflowImbalance(open, close, volume, 2);
  // at 0: null, at 1: -10 / 30 = -0.3333333333333333, at 2: 10 / 50 = 0.2, at 3: 30 / 70 = 0.42857142857142855, at 4: -50 / 90 = -0.5555555555555556
  assert.equal(ofi[0], null);
  assert.ok(Math.abs(ofi[1] - (-10 / 30)) < eps);
  assert.ok(Math.abs(ofi[2] - (10 / 50)) < eps);
  assert.ok(Math.abs(ofi[3] - (30 / 70)) < eps);
  assert.ok(Math.abs(ofi[4] - (-50 / 90)) < eps);

  // Candles vs aliases parity
  const candles = open.map((o, i) => ({ open: o, high: Math.max(o, close[i]) + 1, low: Math.min(o, close[i]) - 1, close: close[i], volume: volume[i] }));
  const candleAliases = open.map((o, i) => ({ o, h: Math.max(o, close[i]) + 1, l: Math.min(o, close[i]) - 1, c: close[i], v: volume[i] }));

  assert.deepEqual(volumeDelta(candles, 2), volumeDelta(candleAliases, 2));
  assert.deepEqual(orderflowImbalance(candles, 2), orderflowImbalance(candleAliases, 2));
});

test("realizedVolatility and volatilityRegime produce deterministic regimes on synthetic price paths", () => {
  // Flat prices -> zero volatility -> regime 0
  const flatPrices = Array.from({ length: 50 }, () => 100);
  const flatVol = realizedVolatility(flatPrices, 5, 365);
  for (let i = 5; i < flatPrices.length; i++) {
    assert.equal(flatVol[i], 0);
  }
  const flatRegime = volatilityRegime(flatPrices, 5, 365);
  for (let i = 10; i < flatPrices.length; i++) {
    assert.equal(flatRegime[i], 0);
  }

  // Geometric progression with steady growth (constant log-returns -> zero volatility variance)
  const trendingPrices = Array.from({ length: 60 }, (_, i) => 100 * Math.pow(1.01, i));
  const trendingVol = realizedVolatility(trendingPrices, 10, 365);
  assert.equal(trendingVol[0], null);
  assert.equal(trendingVol[9], null);
  assert.ok(Math.abs(trendingVol[10]) < eps);

  const trendingRegime = volatilityRegime(trendingPrices, 10, 365);
  assert.equal(trendingRegime[0], null);
  assert.equal(trendingRegime[19], null);
  // Constant growth -> constant volatility -> standard deviation of volatility is 0 -> regime is 0
  for (let i = 20; i < 60; i++) {
    assert.equal(trendingRegime[i], 0);
  }

  // Oscillating volatile prices -> positive realized volatility
  const oscillatingPrices = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i) * 10);
  const oscVol = realizedVolatility(oscillatingPrices, 10, 365);
  assert.ok(oscVol[10] > 0);
});

test("cumulative VWAP and periodic VWAP contract invariants and candle parity", () => {
  const high = [105, 110, 115, 120, 118];
  const low = [95, 100, 105, 110, 108];
  const close = [100, 105, 110, 115, 112];
  const volume = [100, 200, 300, 400, 500];

  // Cumulative VWAP (length undefined)
  const cumVwap = vwap(high, low, close, volume);
  assert.equal(cumVwap[0], 100);
  // index 1: (100*100 + 105*200) / 300 = 31000 / 300 = 103.33333333333333
  assert.ok(Math.abs(cumVwap[1] - 31000 / 300) < eps);
  // index 2: (31000 + 110*300) / 600 = 64000 / 600 = 106.66666666666667
  assert.ok(Math.abs(cumVwap[2] - 64000 / 600) < eps);

  // Candles vs aliases vs missing volume
  const candles = [
    { open: 98, high: 105, low: 95, close: 100, volume: 100 },
    { open: 102, high: 110, low: 100, close: 105, volume: 200 },
    { open: 107, high: 115, low: 105, close: 110 } // missing volume -> defaults to 0
  ];
  const candleVwap = vwap(candles);
  assert.equal(candleVwap[0], 100);
  assert.ok(Math.abs(candleVwap[1] - 31000 / 300) < eps);
  // index 2 with 0 volume -> cumPV remains 31000, cumV remains 300 -> vwap unchanged
  assert.ok(Math.abs(candleVwap[2] - 31000 / 300) < eps);

  // Periodic candle vwap
  const candlePeriodic = vwap(candles, 2);
  assert.equal(candlePeriodic[0], null);
  assert.ok(Math.abs(candlePeriodic[1] - 31000 / 300) < eps);
  // index 2 periodic with window 2: volume for window [1, 2] is 200 + 0 = 200, PV = 105*200 + 110*0 = 21000 -> 105
  assert.ok(Math.abs(candlePeriodic[2] - 105) < eps);
});

test("orderflowImbalance mathematical bounds [-1, 1], zero volume, and error contracts", () => {
  // Mismatched lengths
  assert.throws(() => volumeDelta([100], [100, 101], [10, 20]), /All series must have the same length/);
  assert.throws(() => orderflowImbalance([100, 101], [100], [10, 20]), /All series must have the same length/);

  // All zero volume -> OFI returns null, VolumeDelta returns 0
  const open = [100, 105, 102, 108];
  const close = [105, 102, 104, 108];
  const zeroVol = [0, 0, 0, 0];
  const zeroOFI = orderflowImbalance(open, close, zeroVol, 2);
  assert.deepEqual(zeroOFI, [null, null, null, null]);
  const zeroVD = volumeDelta(open, close, zeroVol, 2);
  assert.deepEqual(zeroVD, [null, 0, 0, 0]);

  // Flat candles (close === open)
  const flatOpen = [100, 100, 100];
  const flatClose = [100, 100, 100];
  const nonZeroVol = [50, 100, 150];
  const flatVD = volumeDelta(flatOpen, flatClose, nonZeroVol, 2);
  assert.deepEqual(flatVD, [null, 0, 0]);
  const flatOFI = orderflowImbalance(flatOpen, flatClose, nonZeroVol, 2);
  assert.deepEqual(flatOFI, [null, 0, 0]);

  // Arbitrary non-negative volumes stay bounded within [-1, 1] without NaN or Infinity
  const randOpen = Array.from({ length: 100 }, (_, i) => 100 + Math.sin(i));
  const randClose = Array.from({ length: 100 }, (_, i) => 100 + Math.cos(i));
  const randVol = Array.from({ length: 100 }, (_, i) => (i % 7 === 0 ? 0 : 10 + (i * 13) % 100));
  const randOFI = orderflowImbalance(randOpen, randClose, randVol, 10);
  for (let i = 9; i < 100; i++) {
    const val = randOFI[i];
    if (val !== null) {
      assert.ok(Number.isFinite(val), `OFI produced non-finite value at index ${i}: ${val}`);
      assert.ok(val >= -1 - 1e-12 && val <= 1 + 1e-12, `OFI value ${val} out of [-1, 1] at index ${i}`);
    }
  }
});

test("realizedVolatility and volatilityRegime numerical stability on tiny perturbation and large scale series", () => {
  // Two-pass reference for standard deviation
  function twoPassStdDev(arr) {
    const m = arr.reduce((a, b) => a + b, 0) / arr.length;
    const v = arr.reduce((acc, x) => acc + (x - m) * (x - m), 0) / arr.length;
    return Math.sqrt(Math.max(0, v));
  }

  // Adversarial series: constant return + deterministic tiny noise (1e-8)
  const N = 100;
  const p = new Array(N);
  p[0] = 1000000; // Large magnitude: $1,000,000
  for (let i = 1; i < N; i++) {
    const r = 0.01 + 1e-8 * Math.sin(i * 0.3);
    p[i] = p[i - 1] * Math.exp(r);
  }

  const length = 20;
  const vol = realizedVolatility(p, length, 365);
  const factor = Math.sqrt(365);

  const rets = new Array(N).fill(0);
  for (let i = 1; i < N; i++) rets[i] = Math.log(p[i] / p[i - 1]);

  for (let i = length; i < N; i++) {
    const windowRets = rets.slice(i - length + 1, i + 1);
    const expectedVol = twoPassStdDev(windowRets) * factor;
    assert.ok(
      Math.abs(vol[i] - expectedVol) < 1e-10,
      `realizedVolatility numerical divergence at index ${i}: actual ${vol[i]} vs expected ${expectedVol}`
    );
  }
});

test("volatilityRegime threshold boundary tests around lowZ and highZ", () => {
  // Construct precise price sequence where we control z-scores around boundaries
  // lowZ = -0.5, highZ = 0.5
  // Length = 10. Warmup index = 20.
  // We test discrete classifications:
  // z > highZ -> 1
  // z < lowZ -> -1
  // lowZ <= z <= highZ -> 0
  const length = 5;
  // Let prices create controlled volatility
  const basePrices = Array.from({ length: 30 }, (_, i) => 100 * (1 + (i % 2 === 0 ? 0.05 : -0.04)));
  const regime = volatilityRegime(basePrices, length, 365, -0.5, 0.5);

  // All computed regimes must be exactly -1, 0, or 1
  for (let i = length * 2; i < basePrices.length; i++) {
    assert.ok(
      regime[i] === -1 || regime[i] === 0 || regime[i] === 1,
      `Invalid discrete regime at index ${i}: ${regime[i]}`
    );
  }
});
