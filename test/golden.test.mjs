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

test("stateful parity: RSI and VWAPSession", () => {
  const rsiState = createRSI(14);
  const actualStatefulRSI = close.map(v => rsiState.next(v));
  approxSeries(actualStatefulRSI, golden.statefulRSI14);
  approxSeries(actualStatefulRSI, rsi(close, 14));

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
});
