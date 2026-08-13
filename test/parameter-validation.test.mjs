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
  mfi,
  adx,
  vwap,
  volumeDelta,
  orderflowImbalance,
  realizedVolatility,
  volatilityRegime,
  fundingRateAPR,
  createSMA,
  createEMA,
  createRSI
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
