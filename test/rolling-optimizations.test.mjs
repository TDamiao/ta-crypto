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
