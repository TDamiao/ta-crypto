import test from "node:test";
import assert from "node:assert/strict";
import { logReturn, realizedVolatility, volatilityRegime, ta } from "../dist/index.js";

const eps = 1e-12;

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

test("logReturn computes periodic and cumulative log returns for valid positive prices", () => {
  const prices = [100, 110, 121];
  const periodic = logReturn(prices);
  assertSeriesApprox(periodic, [null, Math.log(1.1), Math.log(1.1)]);

  const cumulative = logReturn(prices, true);
  assertSeriesApprox(cumulative, [null, Math.log(1.1), Math.log(1.21)]);
});

test("logReturn handles empty and single-element positive inputs", () => {
  assert.deepEqual(logReturn([]), []);
  assert.deepEqual(logReturn([], true), []);
  assert.deepEqual(logReturn([100]), [null]);
  assert.deepEqual(logReturn([100], true), [null]);
});

test("logReturn rejects zero and negative prices with index-aware errors", () => {
  assert.throws(
    () => logReturn([0, 100]),
    /values\[0\] must be a positive number \(> 0\), got 0/
  );
  assert.throws(
    () => logReturn([100, 0, 105]),
    /values\[1\] must be a positive number \(> 0\), got 0/
  );
  assert.throws(
    () => logReturn([-10, 100]),
    /values\[0\] must be a positive number \(> 0\), got -10/
  );
  assert.throws(
    () => logReturn([100, -5.5, 105]),
    /values\[1\] must be a positive number \(> 0\), got -5.5/
  );
  assert.throws(
    () => logReturn([100, 105, -0.01]),
    /values\[2\] must be a positive number \(> 0\), got -0.01/
  );
});

test("logReturn rejects non-finite values with index-aware errors", () => {
  assert.throws(
    () => logReturn([100, Number.NaN, 105]),
    /values\[1\] must be a finite number/
  );
  assert.throws(
    () => logReturn([Number.POSITIVE_INFINITY, 100]),
    /values\[0\] must be a finite number/
  );
  assert.throws(
    () => logReturn([100, Number.NEGATIVE_INFINITY]),
    /values\[1\] must be a finite number/
  );
});

test("logReturn supports candle object and candle alias inputs", () => {
  const candles = [
    { open: 100, high: 105, low: 95, close: 100 },
    { open: 100, high: 115, low: 98, close: 110 }
  ];
  const candleAliases = [
    { o: 100, h: 105, l: 95, c: 100 },
    { o: 100, h: 115, l: 98, c: 110 }
  ];

  assertSeriesApprox(logReturn(candles), [null, Math.log(1.1)]);
  assertSeriesApprox(logReturn(candleAliases), [null, Math.log(1.1)]);

  const invalidCandles = [
    { open: 100, high: 105, low: 95, close: 100 },
    { open: 100, high: 115, low: 98, close: 0 }
  ];
  assert.throws(
    () => logReturn(invalidCandles),
    /values\[1\] must be a positive number \(> 0\), got 0/
  );

  const invalidAlias = [
    { o: 100, h: 105, l: 95, c: -5 },
    { o: 100, h: 115, l: 98, c: 100 }
  ];
  assert.throws(
    () => logReturn(invalidAlias),
    /values\[0\] must be a positive number \(> 0\), got -5/
  );
});

test("realizedVolatility rejects zero and negative prices with index-aware errors", () => {
  assert.throws(
    () => realizedVolatility([100, 0, 105], 2),
    /values\[1\] must be a positive number \(> 0\), got 0/
  );
  assert.throws(
    () => realizedVolatility([100, -10, 105], 2),
    /values\[1\] must be a positive number \(> 0\), got -10/
  );
  assert.throws(
    () => realizedVolatility([-5, 100, 105], 2),
    /values\[0\] must be a positive number \(> 0\), got -5/
  );
});

test("realizedVolatility validates period parameters", () => {
  assert.throws(() => realizedVolatility([100, 105, 110], 0), /length must be a positive integer/);
  assert.throws(() => realizedVolatility([100, 105, 110], -5), /length must be a positive integer/);
  assert.throws(() => realizedVolatility([100, 105, 110], 2, 0), /periodsPerYear must be a positive number/);
  assert.throws(() => realizedVolatility([100, 105, 110], 2, -365), /periodsPerYear must be a positive number/);
});

test("realizedVolatility preserves warmup and returns finite values for positive prices", () => {
  const prices = [100, 102, 101, 103, 104, 102, 105];
  const vol = realizedVolatility(prices, 3, 365);
  assert.equal(vol.length, prices.length);
  // Indices 0, 1, 2 should be null (length = 3)
  assert.equal(vol[0], null);
  assert.equal(vol[1], null);
  assert.equal(vol[2], null);
  // Indices 3..6 should be finite positive numbers
  for (let i = 3; i < prices.length; i++) {
    assert.ok(typeof vol[i] === "number" && Number.isFinite(vol[i]) && vol[i] >= 0);
  }
});

test("volatilityRegime rejects zero and negative prices with index-aware errors", () => {
  assert.throws(
    () => volatilityRegime([100, 0, 105], 2),
    /values\[1\] must be a positive number \(> 0\), got 0/
  );
  assert.throws(
    () => volatilityRegime([100, -5, 105], 2),
    /values\[1\] must be a positive number \(> 0\), got -5/
  );
  assert.throws(
    () => volatilityRegime([-1, 100, 105], 2),
    /values\[0\] must be a positive number \(> 0\), got -1/
  );
});

test("volatilityRegime validates parameters", () => {
  assert.throws(() => volatilityRegime([100, 105, 110], 0), /length must be a positive integer/);
  assert.throws(() => volatilityRegime([100, 105, 110], 2, 0), /periodsPerYear must be a positive number/);
});

test("volatilityRegime preserves warmup and outputs discrete regimes (-1, 0, 1)", () => {
  const prices = Array.from({ length: 100 }, (_, i) => 100 + i * 0.5 + Math.sin(i / 3) * 2);
  const regime = volatilityRegime(prices, 10, 365);
  assert.equal(regime.length, prices.length);
  // Warmup is length * 2 = 20
  for (let i = 0; i < 20; i++) {
    assert.equal(regime[i], null);
  }
  for (let i = 20; i < prices.length; i++) {
    assert.ok(regime[i] === -1 || regime[i] === 0 || regime[i] === 1);
  }
});

test("ta namespace exports logReturn, realizedVolatility, and volatilityRegime with domain validation", () => {
  assert.throws(() => ta.logReturn([0, 100]), /values\[0\] must be a positive number \(> 0\), got 0/);
  assert.throws(() => ta.realizedVolatility([0, 100]), /values\[0\] must be a positive number \(> 0\), got 0/);
  assert.throws(() => ta.volatilityRegime([0, 100]), /values\[0\] must be a positive number \(> 0\), got 0/);
});
