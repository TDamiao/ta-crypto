import test from "node:test";
import assert from "node:assert/strict";
import {
  percentReturn,
  sumPeriodicReturns,
  logReturn,
  ta
} from "../dist/index.js";

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

test("percentReturn baseline example [100, 110, 121] produces exact periodic, compound, and sum returns", () => {
  const prices = [100, 110, 121];

  // Periodic (10%, 10%)
  const periodic = percentReturn(prices);
  assertSeriesApprox(periodic, [null, 0.1, 0.1]);

  const periodicExplicit = percentReturn(prices, { mode: "periodic" });
  assertSeriesApprox(periodicExplicit, [null, 0.1, 0.1]);

  const periodicOptCumulativeFalse = percentReturn(prices, { cumulative: false });
  assertSeriesApprox(periodicOptCumulativeFalse, [null, 0.1, 0.1]);

  // Compounded cumulative (10%, 21%)
  const compoundOpt = percentReturn(prices, { cumulative: true });
  assertSeriesApprox(compoundOpt, [null, 0.1, 0.21]);

  const compoundMode = percentReturn(prices, { mode: "compound" });
  assertSeriesApprox(compoundMode, [null, 0.1, 0.21]);

  // Deprecated boolean signature in migration window: true produces compounded cumulative return
  const deprecatedTrue = percentReturn(prices, true);
  assertSeriesApprox(deprecatedTrue, [null, 0.1, 0.21]);

  const deprecatedFalse = percentReturn(prices, false);
  assertSeriesApprox(deprecatedFalse, [null, 0.1, 0.1]);

  // Arithmetic summation (10%, 20%)
  const sumMode = percentReturn(prices, { mode: "sum" });
  assertSeriesApprox(sumMode, [null, 0.1, 0.2]);

  const explicitSum = sumPeriodicReturns(prices);
  assertSeriesApprox(explicitSum, [null, 0.1, 0.2]);
});

test("percentReturn handles empty and single-element inputs consistently", () => {
  assert.deepEqual(percentReturn([]), []);
  assert.deepEqual(percentReturn([], true), []);
  assert.deepEqual(percentReturn([], { cumulative: true }), []);
  assert.deepEqual(percentReturn([], { mode: "sum" }), []);
  assert.deepEqual(sumPeriodicReturns([]), []);

  assert.deepEqual(percentReturn([100]), [null]);
  assert.deepEqual(percentReturn([100], true), [null]);
  assert.deepEqual(percentReturn([100], { cumulative: true }), [null]);
  assert.deepEqual(percentReturn([100], { mode: "sum" }), [null]);
  assert.deepEqual(sumPeriodicReturns([100]), [null]);
});

test("percentReturn handles flat price series [100, 100, 100]", () => {
  const flat = [100, 100, 100];
  assertSeriesApprox(percentReturn(flat), [null, 0, 0]);
  assertSeriesApprox(percentReturn(flat, { cumulative: true }), [null, 0, 0]);
  assertSeriesApprox(percentReturn(flat, { mode: "sum" }), [null, 0, 0]);
  assertSeriesApprox(sumPeriodicReturns(flat), [null, 0, 0]);
});

test("percentReturn handles gain series [100, 150, 300]", () => {
  const gains = [100, 150, 300];
  // periodic: +50%, +100%
  assertSeriesApprox(percentReturn(gains), [null, 0.5, 1.0]);
  // compound cumulative: 150/100 - 1 = +50%, 300/100 - 1 = +200%
  assertSeriesApprox(percentReturn(gains, { cumulative: true }), [null, 0.5, 2.0]);
  // arithmetic sum: 0.5 + 1.0 = 1.5 (+150%)
  assertSeriesApprox(percentReturn(gains, { mode: "sum" }), [null, 0.5, 1.5]);
  assertSeriesApprox(sumPeriodicReturns(gains), [null, 0.5, 1.5]);
});

test("percentReturn handles loss series [100, 80, 40]", () => {
  const losses = [100, 80, 40];
  // periodic: (80-100)/100 = -20%, (40-80)/80 = -50%
  assertSeriesApprox(percentReturn(losses), [null, -0.2, -0.5]);
  // compound cumulative: 80/100 - 1 = -20%, 40/100 - 1 = -60%
  assertSeriesApprox(percentReturn(losses, { cumulative: true }), [null, -0.2, -0.6]);
  // arithmetic sum: -0.2 + (-0.5) = -0.7 (-70%)
  assertSeriesApprox(percentReturn(losses, { mode: "sum" }), [null, -0.2, -0.7]);
  assertSeriesApprox(sumPeriodicReturns(losses), [null, -0.2, -0.7]);
});

test("percentReturn handles alternating gain/loss series [100, 50, 100]", () => {
  const prices = [100, 50, 100];
  // periodic: -50%, +100%
  assertSeriesApprox(percentReturn(prices), [null, -0.5, 1.0]);
  // compound cumulative: 50/100 - 1 = -50%, 100/100 - 1 = 0%
  assertSeriesApprox(percentReturn(prices, { cumulative: true }), [null, -0.5, 0.0]);
  // arithmetic sum: -0.5 + 1.0 = +0.5 (+50% - misleading gain)
  assertSeriesApprox(percentReturn(prices, { mode: "sum" }), [null, -0.5, 0.5]);
  assertSeriesApprox(sumPeriodicReturns(prices), [null, -0.5, 0.5]);
});

test("percentReturn handles multi-step hand-calculated reference [200, 250, 200, 150]", () => {
  const prices = [200, 250, 200, 150];
  // Step 1: 250/200 - 1 = +0.25 (+25%)
  // Step 2: 200/250 - 1 = -0.20 (-20%)
  // Step 3: 150/200 - 1 = -0.25 (-25%)
  assertSeriesApprox(percentReturn(prices), [null, 0.25, -0.2, -0.25]);

  // Compound: 250/200 - 1 = 0.25, 200/200 - 1 = 0.0, 150/200 - 1 = -0.25
  assertSeriesApprox(percentReturn(prices, { cumulative: true }), [null, 0.25, 0.0, -0.25]);

  // Sum: 0.25, 0.25 - 0.20 = 0.05, 0.05 - 0.25 = -0.20
  assertSeriesApprox(percentReturn(prices, { mode: "sum" }), [null, 0.25, 0.05, -0.2]);
  assertSeriesApprox(sumPeriodicReturns(prices), [null, 0.25, 0.05, -0.2]);
});

test("percentReturn accepts candle array and alias candle inputs", () => {
  const candleObjects = [
    { open: 100, high: 105, low: 95, close: 100, volume: 10 },
    { open: 100, high: 115, low: 98, close: 110, volume: 12 },
    { open: 110, high: 125, low: 108, close: 121, volume: 15 }
  ];
  const candleAliases = [
    { o: 100, h: 105, l: 95, c: 100, v: 10 },
    { o: 100, h: 115, l: 98, c: 110, v: 12 },
    { o: 110, h: 125, l: 108, c: 121, v: 15 }
  ];

  assertSeriesApprox(percentReturn(candleObjects, { cumulative: true }), [null, 0.1, 0.21]);
  assertSeriesApprox(percentReturn(candleAliases, { cumulative: true }), [null, 0.1, 0.21]);
  assertSeriesApprox(percentReturn(candleObjects, { mode: "sum" }), [null, 0.1, 0.2]);
  assertSeriesApprox(percentReturn(candleAliases, { mode: "sum" }), [null, 0.1, 0.2]);
  assertSeriesApprox(sumPeriodicReturns(candleObjects), [null, 0.1, 0.2]);
  assertSeriesApprox(sumPeriodicReturns(candleAliases), [null, 0.1, 0.2]);
});

test("percentReturn validates inputs and rejects invalid modes or non-finite values", () => {
  assert.throws(
    () => percentReturn([100, 110], { mode: "unknown" }),
    /Invalid percentReturn mode/
  );
  assert.throws(
    () => percentReturn([100, Number.NaN, 120]),
    /must be a finite number/
  );
  assert.throws(
    () => sumPeriodicReturns([100, Number.POSITIVE_INFINITY]),
    /must be a finite number/
  );
});

test("ta namespace exports percentReturn and sumPeriodicReturns correctly", () => {
  assert.equal(typeof ta.percentReturn, "function");
  assert.equal(typeof ta.sumPeriodicReturns, "function");
  assertSeriesApprox(ta.percentReturn([100, 110, 121], { cumulative: true }), [null, 0.1, 0.21]);
  assertSeriesApprox(ta.sumPeriodicReturns([100, 110, 121]), [null, 0.1, 0.2]);
});
