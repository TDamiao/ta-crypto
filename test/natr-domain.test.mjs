import test from "node:test";
import assert from "node:assert/strict";
import { natr, atr, toOHLCV, ta } from "../dist/index.js";

const eps = 1e-10;

function assertSeriesApprox(actual, expected) {
  assert.equal(actual.length, expected.length, "length mismatch");
  for (let i = 0; i < actual.length; i++) {
    const a = actual[i];
    const e = expected[i];
    if (a === null || e === null) {
      assert.equal(a, e, `null mismatch at index ${i}`);
    } else {
      assert.ok(
        Math.abs(a - e) <= eps,
        `numeric mismatch at index ${i}: actual ${a} !== expected ${e}`
      );
    }
  }
}

test("natr computes normalized average true range (ATR / close * 100) on valid positive inputs", () => {
  const high = [102, 103, 101, 106, 112];
  const low = [99, 100, 98, 102, 107];
  const close = [101, 102, 99, 105, 110];

  const atrv = atr(high, low, close, 3);
  const natrv = natr(high, low, close, 3);

  assert.equal(natrv.length, close.length);
  assert.equal(natrv[0], null);
  assert.equal(natrv[1], null);

  for (let i = 2; i < close.length; i++) {
    const expected = (atrv[i] / close[i]) * 100;
    assert.ok(Math.abs(natrv[i] - expected) <= eps);
    assert.ok(natrv[i] > 0, "NATR must be positive");
  }
});

test("natr rejects zero and negative close prices with index-aware errors", () => {
  assert.throws(
    () => natr([102, 103], [99, 100], [0, 102], 2),
    /close\[0\] must be a positive number \(> 0\), got 0/
  );
  assert.throws(
    () => natr([102, 103], [99, 100], [101, 0], 2),
    /close\[1\] must be a positive number \(> 0\), got 0/
  );
  assert.throws(
    () => natr([102, 103], [99, 100], [-5, 102], 2),
    /close\[0\] must be a positive number \(> 0\), got -5/
  );
  assert.throws(
    () => natr([102, 103], [99, 100], [101, -10.5], 2),
    /close\[1\] must be a positive number \(> 0\), got -10.5/
  );
});

test("natr rejects non-positive or non-integer length", () => {
  assert.throws(() => natr([102], [99], [101], 0), /length must be a positive integer/);
  assert.throws(() => natr([102], [99], [101], -2), /length must be a positive integer/);
  assert.throws(() => natr([102], [99], [101], 2.5), /length must be a positive integer/);
  assert.throws(() => natr([102], [99], [101], Number.NaN), /length must be a positive integer/);
});

test("natr handles empty and single-element positive inputs", () => {
  assert.deepEqual(natr([], [], [], 3), []);
  assert.deepEqual(natr([102], [99], [101], 3), [null]);
});

test("natr supports candle objects, candle aliases, and full OHLCV input", () => {
  const candles = [
    { open: 100, high: 102, low: 99, close: 101, volume: 10 },
    { open: 101, high: 103, low: 100, close: 102, volume: 12 },
    { open: 100, high: 101, low: 98, close: 99, volume: 11 }
  ];
  const candleAliases = [
    { o: 100, h: 102, l: 99, c: 101, v: 10 },
    { o: 101, h: 103, l: 100, c: 102, v: 12 },
    { o: 100, h: 101, l: 98, c: 99, v: 11 }
  ];

  const byCandles = natr(candles, 2);
  const byAliases = natr(candleAliases, 2);
  const byOHLCV = natr(toOHLCV(candles), 2);

  assertSeriesApprox(byCandles, byAliases);
  assertSeriesApprox(byCandles, byOHLCV);

  // Rejection in candles
  const invalidCandles = [
    { open: 100, high: 102, low: 99, close: 101 },
    { open: 101, high: 103, low: 100, close: 0 }
  ];
  assert.throws(
    () => natr(invalidCandles, 2),
    /close\[1\] must be a positive number \(> 0\), got 0/
  );
});

test("ta namespace exports natr correctly with positive close validation", () => {
  assert.equal(typeof ta.natr, "function");
  assert.throws(
    () => ta.natr([102], [99], [0], 2),
    /close\[0\] must be a positive number \(> 0\), got 0/
  );
});
