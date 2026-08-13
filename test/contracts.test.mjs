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

test("pluckVolume validates non-negative volume, fallbacks, and non-finite values table-driven", () => {
  const validLong = [
    { open: 100, high: 105, low: 95, close: 100, volume: 10 },
    { open: 100, high: 105, low: 95, close: 100, volume: 0 },
    { open: 100, high: 105, low: 95, close: 100 } // missing volume
  ];
  const validAlias = [
    { o: 100, h: 105, l: 95, c: 100, v: 10 },
    { o: 100, h: 105, l: 95, c: 100, v: 0 },
    { o: 100, h: 105, l: 95, c: 100 } // missing volume
  ];

  // Valid default fallback (0) and custom fallback (5)
  assert.deepEqual(pluckVolume(validLong), [10, 0, 0]);
  assert.deepEqual(pluckVolume(validLong, 5), [10, 0, 5]);
  assert.deepEqual(pluckVolume(validAlias), [10, 0, 0]);
  assert.deepEqual(pluckVolume(validAlias, 5), [10, 0, 5]);

  // Invalid negative fallbacks
  assert.throws(() => pluckVolume(validLong, -1), /volumeFallback must be a non-negative number \(>= 0\), got -1/);
  assert.throws(() => pluckVolume(validLong, -0.01), /volumeFallback must be a non-negative number \(>= 0\), got -0.01/);

  // Invalid non-finite fallbacks
  assert.throws(() => pluckVolume(validLong, Number.NaN), /volumeFallback must be a finite number/);
  assert.throws(() => pluckVolume(validLong, Number.POSITIVE_INFINITY), /volumeFallback must be a finite number/);
  assert.throws(() => pluckVolume(validLong, Number.NEGATIVE_INFINITY), /volumeFallback must be a finite number/);

  // Negative volume in candles
  assert.throws(
    () => pluckVolume([{ open: 100, high: 105, low: 95, close: 100, volume: -10 }]),
    /candles\[0\]\.volume \(or \.v\) must be a non-negative number \(>= 0\), got -10/
  );
  assert.throws(
    () => pluckVolume([
      { o: 100, h: 105, l: 95, c: 100, v: 10 },
      { o: 100, h: 105, l: 95, c: 100, v: -5.5 }
    ]),
    /candles\[1\]\.volume \(or \.v\) must be a non-negative number \(>= 0\), got -5.5/
  );

  // Non-finite volume in candles
  assert.throws(
    () => pluckVolume([{ open: 100, high: 105, low: 95, close: 100, volume: Number.NaN }]),
    /candles\[0\]\.volume \(or \.v\) must be a finite number/
  );
  assert.throws(
    () => pluckVolume([{ o: 100, h: 105, l: 95, c: 100, v: Number.POSITIVE_INFINITY }]),
    /candles\[0\]\.volume \(or \.v\) must be a finite number/
  );
  assert.throws(
    () => pluckVolume([{ o: 100, h: 105, l: 95, c: 100, v: Number.NEGATIVE_INFINITY }]),
    /candles\[0\]\.volume \(or \.v\) must be a finite number/
  );
});

test("toOHLCV validates non-negative volume across all candle formats and OHLCV array inputs", () => {
  // 1. Long candle objects
  const candlesLong = [
    { open: 100, high: 105, low: 95, close: 100, volume: 10 },
    { open: 100, high: 105, low: 95, close: 100, volume: 0 }
  ];
  assert.deepEqual(toOHLCV(candlesLong).volume, [10, 0]);

  assert.throws(
    () => toOHLCV([{ open: 100, high: 105, low: 95, close: 100, volume: -1 }]),
    /candles\[0\]\.volume \(or \.v\) must be a non-negative number \(>= 0\), got -1/
  );
  assert.throws(
    () => toOHLCV(candlesLong, -5),
    /volumeFallback must be a non-negative number \(>= 0\), got -5/
  );
  assert.throws(
    () => toOHLCV(candlesLong, Number.NaN),
    /volumeFallback must be a finite number/
  );

  // 2. Alias candle objects
  const candlesAliasObj = [
    { o: 100, h: 105, l: 95, c: 100, v: 20 },
    { o: 100, h: 105, l: 95, c: 100, v: 0 }
  ];
  assert.deepEqual(toOHLCV(candlesAliasObj).volume, [20, 0]);

  assert.throws(
    () => toOHLCV([{ o: 100, h: 105, l: 95, c: 100, v: -20 }]),
    /candles\[0\]\.volume \(or \.v\) must be a non-negative number \(>= 0\), got -20/
  );

  // 3. OHLCV array object
  const validArrayOHLCV = {
    open: [100, 101],
    high: [105, 106],
    low: [95, 96],
    close: [100, 101],
    volume: [10, 0]
  };
  assert.deepEqual(toOHLCV(validArrayOHLCV).volume, [10, 0]);

  // Missing volume in array OHLCV defaults to fallback
  const missingArrayOHLCV = {
    open: [100, 101],
    high: [105, 106],
    low: [95, 96],
    close: [100, 101]
  };
  assert.deepEqual(toOHLCV(missingArrayOHLCV).volume, [0, 0]);
  assert.deepEqual(toOHLCV(missingArrayOHLCV, 15).volume, [15, 15]);

  assert.throws(
    () => toOHLCV({ ...validArrayOHLCV, volume: [10, -5] }),
    /volume\[1\] must be a non-negative number \(>= 0\), got -5/
  );
  assert.throws(
    () => toOHLCV({ ...validArrayOHLCV, volume: [10, Number.NaN] }),
    /volume\[1\] must be a finite number/
  );
  assert.throws(
    () => toOHLCV({ ...validArrayOHLCV, volume: [10, Number.POSITIVE_INFINITY] }),
    /volume\[1\] must be a finite number/
  );
  assert.throws(
    () => toOHLCV(missingArrayOHLCV, -10),
    /volumeFallback must be a non-negative number \(>= 0\), got -10/
  );

  // 4. Alias OHLCV array object
  const validAliasArrayOHLCV = {
    o: [100, 101],
    h: [105, 106],
    l: [95, 96],
    c: [100, 101],
    v: [30, 0]
  };
  assert.deepEqual(toOHLCV(validAliasArrayOHLCV).volume, [30, 0]);

  const missingAliasArrayOHLCV = {
    o: [100, 101],
    h: [105, 106],
    l: [95, 96],
    c: [100, 101]
  };
  assert.deepEqual(toOHLCV(missingAliasArrayOHLCV).volume, [0, 0]);
  assert.deepEqual(toOHLCV(missingAliasArrayOHLCV, 8).volume, [8, 8]);

  assert.throws(
    () => toOHLCV({ ...validAliasArrayOHLCV, v: [30, -0.001] }),
    /volume\[1\] must be a non-negative number \(>= 0\), got -0.001/
  );
  assert.throws(
    () => toOHLCV({ ...validAliasArrayOHLCV, v: [Number.NaN, 0] }),
    /volume\[0\] must be a finite number/
  );
  assert.throws(
    () => toOHLCV({ ...validAliasArrayOHLCV, v: [Number.NEGATIVE_INFINITY, 0] }),
    /volume\[0\] must be a finite number/
  );
  assert.throws(
    () => toOHLCV(missingAliasArrayOHLCV, -1),
    /volumeFallback must be a non-negative number \(>= 0\), got -1/
  );
});
