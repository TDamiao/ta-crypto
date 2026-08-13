import test from "node:test";
import assert from "node:assert/strict";
import {
  sma,
  ema,
  rma,
  bbands,
  rsi,
  macd,
  stoch,
  atr,
  natr,
  obv,
  mfi,
  adx,
  vwap,
  vwapSession,
  signedVolume,
  volumeDelta,
  orderflowImbalance,
  realizedVolatility,
  volatilityRegime,
  fundingRateAPR,
  pluckVolume,
  toOHLCV,
  createSMA,
  createEMA,
  createRSI,
  createVWAPSession
} from "../dist/index.js";

const close = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110];
const high = [102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112];
const low = [98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108];
const open = [99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109];
const volume = [10, 20, 15, 25, 30, 20, 18, 22, 28, 35, 40];

const invalidPeriods = [0, -1, -14, 2.5, 3.14, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];

test("all single-period batch indicators reject non-positive and non-integer periods", () => {
  const singlePeriodIndicators = [
    { name: "sma", fn: (p) => sma(close, p) },
    { name: "ema", fn: (p) => ema(close, p) },
    { name: "rma", fn: (p) => rma(close, p) },
    { name: "bbands", fn: (p) => bbands(close, p) },
    { name: "rsi", fn: (p) => rsi(close, p) },
    { name: "atr", fn: (p) => atr(high, low, close, p) },
    { name: "natr", fn: (p) => natr(high, low, close, p) },
    { name: "mfi", fn: (p) => mfi(high, low, close, volume, p) },
    { name: "adx", fn: (p) => adx(high, low, close, p) },
    { name: "vwap (periodic)", fn: (p) => vwap(high, low, close, volume, p) },
    { name: "volumeDelta", fn: (p) => volumeDelta(open, close, volume, p) },
    { name: "orderflowImbalance", fn: (p) => orderflowImbalance(open, close, volume, p) },
    { name: "realizedVolatility", fn: (p) => realizedVolatility(close, p) },
    { name: "volatilityRegime", fn: (p) => volatilityRegime(close, p) }
  ];

  for (const { name, fn } of singlePeriodIndicators) {
    for (const p of invalidPeriods) {
      assert.throws(
        () => fn(p),
        /must be a positive integer/,
        `${name} did not reject invalid period: ${p}`
      );
    }
  }
});

test("multi-period indicators (macd, stoch) reject invalid parameters", () => {
  // macd
  for (const p of invalidPeriods) {
    assert.throws(() => macd(close, p, 26, 9), /fast must be a positive integer/);
    assert.throws(() => macd(close, 12, p, 9), /slow must be a positive integer/);
    assert.throws(() => macd(close, 12, 26, p), /signal must be a positive integer/);
  }
  assert.throws(() => macd(close, 26, 12, 9), /fast period .* must be less than slow period/);
  assert.throws(() => macd(close, 20, 20, 9), /fast period .* must be less than slow period/);

  // stoch
  for (const p of invalidPeriods) {
    assert.throws(() => stoch(high, low, close, p, 3), /kLength must be a positive integer/);
    assert.throws(() => stoch(high, low, close, 14, p), /dLength must be a positive integer/);
  }
});

test("stateful constructors reject non-positive and non-integer periods", () => {
  const statefulFactories = [
    { name: "createSMA", fn: (p) => createSMA(p) },
    { name: "createEMA", fn: (p) => createEMA(p) },
    { name: "createRSI", fn: (p) => createRSI(p) }
  ];

  for (const { name, fn } of statefulFactories) {
    for (const p of invalidPeriods) {
      assert.throws(
        () => fn(p),
        /period must be a positive integer/,
        `${name} did not reject invalid period: ${p}`
      );
    }
  }
});

test("bbands rejects negative and non-finite std multipliers", () => {
  assert.throws(() => bbands(close, 20, -1), /std must be a non-negative finite number/);
  assert.throws(() => bbands(close, 20, Number.NaN), /std must be a non-negative finite number/);
  assert.throws(() => bbands(close, 20, Number.POSITIVE_INFINITY), /std must be a non-negative finite number/);
});

test("fundingRateAPR rejects non-positive periodsPerYear", () => {
  assert.throws(() => fundingRateAPR([0.001], 0), /periodsPerYear must be a positive number/);
  assert.throws(() => fundingRateAPR([0.001], -365), /periodsPerYear must be a positive number/);
  assert.throws(() => fundingRateAPR([0.001], Number.NaN), /periodsPerYear must be a positive number/);
});

test("empty array input produces empty array or empty structure across all indicators", () => {
  assert.deepEqual(sma([], 14), []);
  assert.deepEqual(ema([], 14), []);
  assert.deepEqual(rma([], 14), []);
  assert.deepEqual(rsi([], 14), []);
  assert.deepEqual(atr([], [], [], 14), []);
  assert.deepEqual(natr([], [], [], 14), []);
  assert.deepEqual(vwap([], [], [], []), []);
  assert.deepEqual(vwap([], [], [], [], 14), []);
  assert.deepEqual(mfi([], [], [], [], 14), []);
  assert.deepEqual(realizedVolatility([], 14), []);
  assert.deepEqual(volatilityRegime([], 14), []);
  assert.deepEqual(volumeDelta([], [], [], 14), []);
  assert.deepEqual(orderflowImbalance([], [], [], 14), []);

  const emptyBBands = bbands([], 20);
  assert.deepEqual(emptyBBands.basis, []);
  assert.deepEqual(emptyBBands.upper, []);
  assert.deepEqual(emptyBBands.lower, []);

  const emptyMACD = macd([], 12, 26, 9);
  assert.deepEqual(emptyMACD.macd, []);
  assert.deepEqual(emptyMACD.signal, []);
  assert.deepEqual(emptyMACD.histogram, []);

  const emptyStoch = stoch([], [], [], 14, 3);
  assert.deepEqual(emptyStoch.k, []);
  assert.deepEqual(emptyStoch.d, []);

  const emptyADX = adx([], [], [], 14);
  assert.deepEqual(emptyADX.adx, []);
  assert.deepEqual(emptyADX.plusDI, []);
  assert.deepEqual(emptyADX.minusDI, []);
});

test("volume-dependent indicators accept zero volume and reject negative/non-finite volume", () => {
  const c = [100, 101, 102];
  const h = [102, 103, 104];
  const l = [98, 99, 100];
  const o = [99, 100, 101];
  const sessions = ["s1", "s1", "s1"];

  const zeroVol = [0, 0, 0];
  const validVol = [10, 0, 20];
  const negVol = [10, -5, 20];
  const nanVol = [10, Number.NaN, 20];
  const infVol = [10, Number.POSITIVE_INFINITY, 20];
  const negInfVol = [10, Number.NEGATIVE_INFINITY, 20];

  // 1. Zero volume is valid
  assert.doesNotThrow(() => obv(c, zeroVol));
  assert.doesNotThrow(() => mfi(h, l, c, zeroVol, 2));
  assert.doesNotThrow(() => vwap(h, l, c, zeroVol));
  assert.doesNotThrow(() => vwap(h, l, c, zeroVol, 2));
  assert.doesNotThrow(() => vwapSession(h, l, c, zeroVol, sessions));
  assert.doesNotThrow(() => signedVolume(o, c, zeroVol));
  assert.doesNotThrow(() => volumeDelta(o, c, zeroVol, 2));
  assert.doesNotThrow(() => orderflowImbalance(o, c, zeroVol, 2));

  // 2. Negative volume throws index-aware error
  const volIndicators = [
    { name: "obv", fn: () => obv(c, negVol) },
    { name: "mfi", fn: () => mfi(h, l, c, negVol, 2) },
    { name: "vwap cumulative", fn: () => vwap(h, l, c, negVol) },
    { name: "vwap periodic", fn: () => vwap(h, l, c, negVol, 2) },
    { name: "vwapSession", fn: () => vwapSession(h, l, c, negVol, sessions) },
    { name: "signedVolume", fn: () => signedVolume(o, c, negVol) },
    { name: "volumeDelta", fn: () => volumeDelta(o, c, negVol, 2) },
    { name: "orderflowImbalance", fn: () => orderflowImbalance(o, c, negVol, 2) }
  ];

  for (const { name, fn } of volIndicators) {
    assert.throws(
      () => fn(),
      /volume\[1\] must be a non-negative number \(>= 0\), got -5/,
      `${name} did not reject negative volume with index-aware error`
    );
  }

  // 3. NaN and Infinity volume throw finite number error
  for (const badVol of [nanVol, infVol, negInfVol]) {
    for (const { name, fn } of [
      { name: "obv", fn: () => obv(c, badVol) },
      { name: "mfi", fn: () => mfi(h, l, c, badVol, 2) },
      { name: "vwap", fn: () => vwap(h, l, c, badVol) },
      { name: "signedVolume", fn: () => signedVolume(o, c, badVol) }
    ]) {
      assert.throws(
        () => fn(),
        /volume\[1\] must be a finite number/,
        `${name} did not reject non-finite volume`
      );
    }
  }

  // 4. Stateful createVWAPSession validation
  const session = createVWAPSession();
  assert.throws(
    () => session.next({ high: 102, low: 98, close: 100, volume: -10, sessionId: "s1" }),
    /volume must be a non-negative number \(>= 0\)/
  );
  assert.throws(
    () => session.next({ high: 102, low: 98, close: 100, volume: Number.NaN, sessionId: "s1" }),
    /must be finite numbers/
  );
  assert.doesNotThrow(
    () => session.next({ high: 102, low: 98, close: 100, volume: 0, sessionId: "s1" })
  );

  // 5. Candle helpers (pluckVolume, toOHLCV) validation
  assert.throws(
    () => pluckVolume([{ open: 100, high: 105, low: 95, close: 100, volume: -5 }]),
    /candles\[0\]\.volume \(or \.v\) must be a non-negative number \(>= 0\), got -5/
  );
  assert.throws(
    () => toOHLCV([{ o: 100, h: 105, l: 95, c: 100, v: -5 }]),
    /candles\[0\]\.volume \(or \.v\) must be a non-negative number \(>= 0\), got -5/
  );
  assert.throws(
    () => toOHLCV({ open: [100], high: [105], low: [95], close: [100], volume: [-5] }),
    /volume\[0\] must be a non-negative number \(>= 0\), got -5/
  );
  assert.throws(
    () => toOHLCV({ o: [100], h: [105], l: [95], c: [100], v: [-5] }),
    /volume\[0\] must be a non-negative number \(>= 0\), got -5/
  );
  assert.throws(
    () => pluckVolume([{ open: 100, high: 105, low: 95, close: 100 }], -1),
    /volumeFallback must be a non-negative number \(>= 0\), got -1/
  );
  assert.throws(
    () => toOHLCV([{ o: 100, h: 105, l: 95, c: 100 }], -1),
    /volumeFallback must be a non-negative number \(>= 0\), got -1/
  );
});
