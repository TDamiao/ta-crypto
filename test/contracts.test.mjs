import test from "node:test";
import assert from "node:assert/strict";
import { atr, pluckClose, pluckVolume, rsi, sma, toOHLCV, vwap } from "../dist/index.js";

const candles = [
  { open: 100, high: 102, low: 99, close: 101, volume: 10, time: 1 },
  { open: 101, high: 103, low: 100, close: 102, volume: 12, time: 2 },
  { open: 102, high: 104, low: 101, close: 103, time: 3 }
];

const candlesAlias = [
  { o: 100, h: 102, l: 99, c: 101, v: 10, t: 1 },
  { o: 101, h: 103, l: 100, c: 102, v: 12, t: 2 },
  { o: 102, h: 104, l: 101, c: 103, v: 8, t: 3 }
];

test("candles helpers produce typed OHLCV arrays", () => {
  assert.deepEqual(pluckClose(candles), [101, 102, 103]);
  assert.deepEqual(pluckVolume(candles, 0), [10, 12, 0]);

  const ohlcv = toOHLCV(candles, 0);
  assert.deepEqual(ohlcv.open, [100, 101, 102]);
  assert.deepEqual(ohlcv.high, [102, 103, 104]);
  assert.deepEqual(ohlcv.low, [99, 100, 101]);
  assert.deepEqual(ohlcv.close, [101, 102, 103]);
  assert.deepEqual(ohlcv.volume, [10, 12, 0]);
});

test("candles helpers accept alias fields and array-based OHLCV inputs", () => {
  assert.deepEqual(pluckClose(candlesAlias), [101, 102, 103]);
  assert.deepEqual(pluckVolume(candlesAlias), [10, 12, 8]);

  const byAliases = toOHLCV(candlesAlias, 0);
  assert.deepEqual(byAliases.open, [100, 101, 102]);
  assert.deepEqual(byAliases.high, [102, 103, 104]);
  assert.deepEqual(byAliases.low, [99, 100, 101]);
  assert.deepEqual(byAliases.close, [101, 102, 103]);
  assert.deepEqual(byAliases.volume, [10, 12, 8]);
  assert.deepEqual(byAliases.time, [1, 2, 3]);

  const byArrays = toOHLCV({ o: [1, 2], h: [3, 4], l: [0, 1], c: [2, 3], v: [5, 6], t: ["a", "b"] });
  assert.deepEqual(byArrays.open, [1, 2]);
  assert.deepEqual(byArrays.volume, [5, 6]);
  assert.deepEqual(byArrays.time, ["a", "b"]);
});

test("main APIs support both primitive arrays and candle objects", () => {
  const close = [101, 102, 103];
  const high = [102, 103, 104];
  const low = [99, 100, 101];
  const volume = [10, 12, 8];

  assert.deepEqual(sma(close, 2), sma(candlesAlias, 2));
  assert.deepEqual(rsi(close, 2), rsi(candlesAlias, 2));
  assert.deepEqual(vwap(high, low, close, volume), vwap(candlesAlias));
  assert.deepEqual(atr(high, low, close, 2), atr(candlesAlias, 2));
});

test("length and numeric validations return actionable messages", () => {
  assert.throws(
    () => vwap([1, 2, 3], [1, 2], [1, 2, 3], [10, 20, 30]),
    /All series must have the same length/
  );
  assert.throws(() => vwap([1, 2, 3]), /Expected high, low, close, volume arrays or candles\/OHLCV object input/);
  assert.throws(() => pluckClose([{ open: 1, high: 2, low: 0, close: Number.NaN }]), /must be a finite number/);
  assert.throws(() => pluckClose([{ o: 1, h: 2, l: 0, c: Number.NaN }]), /candles\[0\]\.close \(or \.c\) must be a finite number/);
});
