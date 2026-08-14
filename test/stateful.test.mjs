import test from "node:test";
import assert from "node:assert/strict";
import {
  createSMA,
  createEMA,
  createRSI,
  createMACD,
  createATR,
  createBBANDS,
  createVWAPSession,
  createRealizedVolatility,
  createVolatilityRegime,
  createVolumeDelta,
  createOrderflowImbalance,
  sma,
  ema,
  rsi,
  macd,
  atr,
  bbands,
  vwapSession,
  realizedVolatility,
  volatilityRegime,
  volumeDelta,
  orderflowImbalance,
  ta
} from "../dist/index.js";
import { close, high, low, open, volume, session } from "./fixtures/input.mjs";

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

test("stateful MACD: batch parity, warmup, and reset", () => {
  const batch = macd(close, 12, 26, 9);
  const stateful = createMACD(12, 26, 9);

  const statefulOutputs = close.map(p => stateful.next(p));
  const sMacd = statefulOutputs.map(o => o.macd);
  const sSignal = statefulOutputs.map(o => o.signal);
  const sHist = statefulOutputs.map(o => o.histogram);

  assertSeriesApprox(sMacd, batch.macd);
  assertSeriesApprox(sSignal, batch.signal);
  assertSeriesApprox(sHist, batch.histogram);

  // Warmup checks: macd is null for first 25 items (0..24), signal emits at index 8, histogram at index 25
  for (let i = 0; i < 25; i++) {
    assert.equal(sMacd[i], null, `macd should be null at warmup index ${i}`);
    assert.equal(sHist[i], null, `histogram should be null at warmup index ${i}`);
  }
  for (let i = 0; i < 8; i++) {
    assert.equal(sSignal[i], null, `signal should be null at warmup index ${i}`);
  }
  assert.notEqual(sMacd[25], null);
  assert.notEqual(sHist[25], null);

  // Reset check
  stateful.reset();
  const postResetOutputs = close.map(p => stateful.next(p));
  assertSeriesApprox(postResetOutputs.map(o => o.macd), batch.macd);
  assertSeriesApprox(postResetOutputs.map(o => o.signal), batch.signal);
  assertSeriesApprox(postResetOutputs.map(o => o.histogram), batch.histogram);

  // Parameter and input validations
  assert.throws(() => createMACD(0, 26, 9), /fastPeriod must be a positive integer/);
  assert.throws(() => createMACD(26, 12, 9), /fast period \(26\) must be less than slow period \(12\)/);
  assert.throws(() => createMACD(12, 26, 0), /signalPeriod must be a positive integer/);
  assert.throws(() => createMACD().next(Number.NaN), /price must be a finite number/);
});

test("stateful ATR: batch parity, warmup, alias support, and reset", () => {
  const period = 14;
  const batch = atr(high, low, close, period);
  const stateful = createATR(period);

  const candles = high.map((h, i) => ({ high: h, low: low[i], close: close[i] }));
  const candleAliases = high.map((h, i) => ({ h, l: low[i], c: close[i] }));

  const statefulOutputs = candles.map(c => stateful.next(c));
  assertSeriesApprox(statefulOutputs, batch);

  // Warmup checks: first 13 items null (0..12), index 13 (call 14) emits
  for (let i = 0; i < period - 1; i++) {
    assert.equal(statefulOutputs[i], null, `ATR should be null at index ${i}`);
  }
  assert.notEqual(statefulOutputs[period - 1], null);

  // Reset and test with compact aliases
  stateful.reset();
  const aliasOutputs = candleAliases.map(c => stateful.next(c));
  assertSeriesApprox(aliasOutputs, batch);

  // Validations
  assert.throws(() => createATR(0), /period must be a positive integer/);
  assert.throws(() => createATR(14).next({ high: Number.NaN, low: 10, close: 11 }), /high, low, and close must be finite numbers/);
  assert.throws(() => createATR(14).next({ h: 10, l: Number.NEGATIVE_INFINITY, c: 11 }), /high, low, and close must be finite numbers/);
});

test("stateful BBANDS: batch parity, warmup, and reset", () => {
  const period = 20;
  const std = 2;
  const batch = bbands(close, period, std);
  const stateful = createBBANDS(period, std);

  const statefulOutputs = close.map(p => stateful.next(p));
  assertSeriesApprox(statefulOutputs.map(o => o.basis), batch.basis);
  assertSeriesApprox(statefulOutputs.map(o => o.upper), batch.upper);
  assertSeriesApprox(statefulOutputs.map(o => o.lower), batch.lower);

  // Warmup: first 19 (0..18) are null
  for (let i = 0; i < period - 1; i++) {
    assert.equal(statefulOutputs[i].basis, null);
    assert.equal(statefulOutputs[i].upper, null);
    assert.equal(statefulOutputs[i].lower, null);
  }
  assert.notEqual(statefulOutputs[period - 1].basis, null);

  // Reset
  stateful.reset();
  const postReset = close.map(p => stateful.next(p));
  assertSeriesApprox(postReset.map(o => o.basis), batch.basis);

  // Validations
  assert.throws(() => createBBANDS(0), /period must be a positive integer/);
  assert.throws(() => createBBANDS(20, -1), /stdMultiplier must be a non-negative finite number/);
  assert.throws(() => createBBANDS(20, Number.NaN), /stdMultiplier must be a non-negative finite number/);
  assert.throws(() => createBBANDS().next(Number.NaN), /price must be a finite number/);
});

test("stateful Realized Volatility: batch parity, positive price domain, warmup, and reset", () => {
  const length = 5;
  const batch = realizedVolatility(close, length, 365);
  const stateful = createRealizedVolatility(length, 365);

  const statefulOutputs = close.map(p => stateful.next(p));
  assertSeriesApprox(statefulOutputs, batch);

  // Warmup: first length items (0..4) are null, index 5 emits
  for (let i = 0; i < length; i++) {
    assert.equal(statefulOutputs[i], null, `RV should be null at index ${i}`);
  }
  assert.notEqual(statefulOutputs[length], null);

  // Reset
  stateful.reset();
  const postReset = close.map(p => stateful.next(p));
  assertSeriesApprox(postReset, batch);

  // Validations: positive price domain (> 0)
  assert.throws(() => createRealizedVolatility(0), /length must be a positive integer/);
  assert.throws(() => createRealizedVolatility(5, 0), /periodsPerYear must be a positive number/);
  assert.throws(() => createRealizedVolatility().next(0), /price must be a positive number \(> 0\), got 0/);
  assert.throws(() => createRealizedVolatility().next(-5), /price must be a positive number \(> 0\), got -5/);
  assert.throws(() => createRealizedVolatility().next(Number.NaN), /price must be a finite number/);
});

test("stateful Volatility Regime: batch parity, warmup, degenerate variance, and reset", () => {
  const length = 5;
  const batch = volatilityRegime(close, length, 365, -0.5, 0.5);
  const stateful = createVolatilityRegime(length, 365, -0.5, 0.5);

  const statefulOutputs = close.map(p => stateful.next(p));
  assertSeriesApprox(statefulOutputs, batch);

  // Warmup: length * 2 = 10 nulls (0..9), index 10 emits first regime
  for (let i = 0; i < length * 2; i++) {
    assert.equal(statefulOutputs[i], null, `Regime should be null at warmup index ${i}`);
  }
  assert.notEqual(statefulOutputs[length * 2], null);

  // Reset
  stateful.reset();
  const postReset = close.map(p => stateful.next(p));
  assertSeriesApprox(postReset, batch);

  // Flat price series (zero deviation) -> regime 0
  const flatState = createVolatilityRegime(length, 365);
  const flatPrices = Array.from({ length: 20 }, () => 100);
  const flatOutputs = flatPrices.map(p => flatState.next(p));
  for (let i = length * 2; i < flatPrices.length; i++) {
    assert.equal(flatOutputs[i], 0);
  }

  // Validations
  assert.throws(() => createVolatilityRegime(0), /length must be a positive integer/);
  assert.throws(() => createVolatilityRegime(5, -1), /periodsPerYear must be a positive number/);
  assert.throws(() => createVolatilityRegime().next(0), /price must be a positive number \(> 0\), got 0/);
});

test("stateful VolumeDelta and OrderflowImbalance: batch parity, aliases, and reset", () => {
  const period = 5;
  const batchVD = volumeDelta(open, close, volume, period);
  const batchOFI = orderflowImbalance(open, close, volume, period);

  const stateVD = createVolumeDelta(period);
  const stateOFI = createOrderflowImbalance(period);

  const candles = open.map((o, i) => ({ open: o, close: close[i], volume: volume[i] }));
  const candleAliases = open.map((o, i) => ({ o, c: close[i], v: volume[i] }));

  const vdOutputs = candles.map(c => stateVD.next(c));
  const ofiOutputs = candles.map(c => stateOFI.next(c));

  assertSeriesApprox(vdOutputs, batchVD);
  assertSeriesApprox(ofiOutputs, batchOFI);

  // Warmup checks: first period - 1 (0..3) null
  for (let i = 0; i < period - 1; i++) {
    assert.equal(vdOutputs[i], null);
    assert.equal(ofiOutputs[i], null);
  }
  assert.notEqual(vdOutputs[period - 1], null);
  assert.notEqual(ofiOutputs[period - 1], null);

  // Reset and test with aliases
  stateVD.reset();
  stateOFI.reset();
  const aliasVD = candleAliases.map(c => stateVD.next(c));
  const aliasOFI = candleAliases.map(c => stateOFI.next(c));
  assertSeriesApprox(aliasVD, batchVD);
  assertSeriesApprox(aliasOFI, batchOFI);

  // Zero-volume window handling
  const zeroStateOFI = createOrderflowImbalance(2);
  assert.equal(zeroStateOFI.next({ open: 100, close: 105, volume: 0 }), null);
  assert.equal(zeroStateOFI.next({ open: 105, close: 102, volume: 0 }), null); // zero total volume -> null

  // Validations
  assert.throws(() => createVolumeDelta(0), /period must be a positive integer/);
  assert.throws(() => createOrderflowImbalance(0), /period must be a positive integer/);
  assert.throws(() => createVolumeDelta(5).next({ open: 100, close: 101, volume: -5 }), /volume must be a non-negative number/);
  assert.throws(() => createOrderflowImbalance(5).next({ o: 100, c: 101, v: -5 }), /volume must be a non-negative number/);
  assert.throws(() => createVolumeDelta(5).next({ open: Number.NaN, close: 101, volume: 10 }), /must be finite numbers/);
});

test("instance isolation across all stateful constructors", () => {
  const a = createSMA(3);
  const b = createSMA(3);
  a.next(10);
  a.next(20);
  assert.equal(b.next(10), null); // b unaffected by a

  const m1 = createMACD(12, 26, 9);
  const m2 = createMACD(12, 26, 9);
  m1.next(100);
  assert.equal(m2.next(100).macd, null);

  const r1 = createRealizedVolatility(5);
  const r2 = createRealizedVolatility(5);
  r1.next(100);
  r1.next(105);
  assert.equal(r2.next(100), null);
});

test("ta namespace re-exports all stateful constructors", () => {
  assert.equal(typeof ta.createSMA, "function");
  assert.equal(typeof ta.createEMA, "function");
  assert.equal(typeof ta.createRSI, "function");
  assert.equal(typeof ta.createMACD, "function");
  assert.equal(typeof ta.createATR, "function");
  assert.equal(typeof ta.createBBANDS, "function");
  assert.equal(typeof ta.createVWAPSession, "function");
  assert.equal(typeof ta.createRealizedVolatility, "function");
  assert.equal(typeof ta.createVolatilityRegime, "function");
  assert.equal(typeof ta.createVolumeDelta, "function");
  assert.equal(typeof ta.createOrderflowImbalance, "function");
});
