import { createVWAPSession, vwapSession } from "ta-crypto";

const high = [101, 103, 104, 102, 99, 101, 103, 105];
const low = [99, 100, 101, 99, 96, 98, 100, 102];
const close = [100, 102, 103, 100, 98, 100, 102, 104];
const volume = [10, 15, 13, 20, 11, 14, 16, 19];
const session = ["asia", "asia", "asia", "asia", "eu", "eu", "eu", "eu"];

const batch = vwapSession(high, low, close, volume, session);

const stateful = createVWAPSession();
const streaming = close.map((_, i) =>
  stateful.next({
    high: high[i],
    low: low[i],
    close: close[i],
    volume: volume[i],
    sessionId: session[i]
  })
);

console.log("Batch VWAP session:", batch);
console.log("Streaming VWAP session:", streaming);
