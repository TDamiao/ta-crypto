import test from "node:test";
import assert from "node:assert/strict";
import { pluckClose, pluckVolume, toOHLCV, vwap } from "../dist/index.js";

const candles = [
  { open: 100, high: 102, low: 99, close: 101, volume: 10, time: 1 },
  { open: 101, high: 103, low: 100, close: 102, volume: 12, time: 2 },
  { open: 102, high: 104, low: 101, close: 103, time: 3 }
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

test("length and numeric validations return actionable messages", () => {
  assert.throws(
    () => vwap([1, 2, 3], [1, 2], [1, 2, 3], [10, 20, 30]),
    /All series must have the same length/
  );
  assert.throws(() => pluckClose([{ open: 1, high: 2, low: 0, close: Number.NaN }]), /must be a finite number/);
});
