import { writeFileSync } from "node:fs";
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
import { close, high, low, volume, session } from "../test/fixtures/input.mjs";

const rsiState = createRSI(14);
const statefulRSI = close.map(v => rsiState.next(v));

const vwapState = createVWAPSession();
const statefulVWAPSession = high.map((_, i) =>
  vwapState.next({
    high: high[i],
    low: low[i],
    close: close[i],
    volume: volume[i],
    sessionId: session[i]
  })
);

const golden = {
  sma14: sma(close, 14),
  ema14: ema(close, 14),
  rsi14: rsi(close, 14),
  macd: macd(close, 12, 26, 9),
  bbands20_2: bbands(close, 20, 2),
  atr14: atr(high, low, close, 14),
  adx14: adx(high, low, close, 14),
  vwapSession: vwapSession(high, low, close, volume, session),
  statefulRSI14: statefulRSI,
  statefulVWAPSession
};

const dest = resolve(process.cwd(), "test/fixtures/golden.json");
writeFileSync(dest, `${JSON.stringify(golden, null, 2)}\n`);
console.log(`Wrote ${dest}`);
