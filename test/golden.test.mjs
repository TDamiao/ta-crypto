import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  sma,
  ema,
  rsi,
  macd,
  bbands,
  atr,
  adx,
  createSMA,
  createEMA,
  vwapSession,
  createRSI,
  createVWAPSession
} from "../dist/index.js";
import { close, high, low, volume, session } from "./fixtures/input.mjs";

const goldenPath = resolve(process.cwd(), "test/fixtures/golden.json");
const golden = JSON.parse(readFileSync(goldenPath, "utf8"));

function approxSeries(actual, expected, eps = 1e-10) {
  assert.equal(actual.length, expected.length, "series length mismatch");
  for (let i = 0; i < actual.length; i++) {
    const a = actual[i];
    const e = expected[i];
    if (a === null || e === null) {
      assert.equal(a, e, `mismatch at index ${i}`);
      continue;
    }
    assert.ok(Math.abs(a - e) <= eps, `mismatch at index ${i}: ${a} != ${e}`);
  }
}

test("golden parity: overlap/momentum/trend/volatility/crypto", () => {
  approxSeries(sma(close, 14), golden.sma14);
  approxSeries(ema(close, 14), golden.ema14);
  approxSeries(rsi(close, 14), golden.rsi14);
  approxSeries(atr(high, low, close, 14), golden.atr14);
  approxSeries(vwapSession(high, low, close, volume, session), golden.vwapSession);

  const actualMACD = macd(close, 12, 26, 9);
  approxSeries(actualMACD.macd, golden.macd.macd);
  approxSeries(actualMACD.signal, golden.macd.signal);
  approxSeries(actualMACD.histogram, golden.macd.histogram);

  const actualBBands = bbands(close, 20, 2);
  approxSeries(actualBBands.basis, golden.bbands20_2.basis);
  approxSeries(actualBBands.upper, golden.bbands20_2.upper);
  approxSeries(actualBBands.lower, golden.bbands20_2.lower);

  const actualADX = adx(high, low, close, 14);
  approxSeries(actualADX.adx, golden.adx14.adx);
  approxSeries(actualADX.plusDI, golden.adx14.plusDI);
  approxSeries(actualADX.minusDI, golden.adx14.minusDI);
});

test("stateful parity: SMA/EMA/RSI and VWAPSession", () => {
  const smaState = createSMA(14);
  const actualStatefulSMA = close.map(v => smaState.next(v));
  approxSeries(actualStatefulSMA, sma(close, 14));
  smaState.reset();
  const actualStatefulSMAAfterReset = close.map(v => smaState.next(v));
  approxSeries(actualStatefulSMAAfterReset, sma(close, 14));

  const emaState = createEMA(14);
  const actualStatefulEMA = close.map(v => emaState.next(v));
  approxSeries(actualStatefulEMA, ema(close, 14));
  emaState.reset();
  const actualStatefulEMAAfterReset = close.map(v => emaState.next(v));
  approxSeries(actualStatefulEMAAfterReset, ema(close, 14));

  const rsiState = createRSI(14);
  const actualStatefulRSI = close.map(v => rsiState.next(v));
  approxSeries(actualStatefulRSI, golden.statefulRSI14);
  approxSeries(actualStatefulRSI, rsi(close, 14));
  rsiState.reset();
  const actualStatefulRSIAfterReset = close.map(v => rsiState.next(v));
  approxSeries(actualStatefulRSIAfterReset, rsi(close, 14));

  const vwapState = createVWAPSession();
  const actualStatefulVWAP = high.map((_, i) =>
    vwapState.next({
      high: high[i],
      low: low[i],
      close: close[i],
      volume: volume[i],
      sessionId: session[i]
    })
  );

  approxSeries(actualStatefulVWAP, golden.statefulVWAPSession);
  approxSeries(actualStatefulVWAP, vwapSession(high, low, close, volume, session));
  vwapState.reset();
  const actualStatefulVWAPAfterReset = high.map((_, i) =>
    vwapState.next({
      high: high[i],
      low: low[i],
      close: close[i],
      volume: volume[i],
      sessionId: session[i]
    })
  );
  approxSeries(actualStatefulVWAPAfterReset, vwapSession(high, low, close, volume, session));
});

test("stateful API validates invalid inputs", () => {
  const smaState = createSMA(14);
  const emaState = createEMA(14);
  const rsiState = createRSI(14);

  assert.throws(() => smaState.next(Number.NaN), /value must be a finite number/);
  assert.throws(() => emaState.next(Number.POSITIVE_INFINITY), /value must be a finite number/);
  assert.throws(() => rsiState.next(Number.NaN), /price must be a finite number/);
});
