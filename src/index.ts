export { sma, ema, rma, hl2, hlc3, ohlc4, vwap, bbands } from "./core/overlap.js";
export { rsi, macd, stoch } from "./core/momentum.js";
export { trueRange, atr, natr } from "./core/volatility.js";
export { logReturn, percentReturn, realizedVolatility } from "./core/performance.js";
export { obv, mfi } from "./core/volume.js";
export { adx } from "./core/trend.js";
export {
  vwapSession,
  fundingRateCumulative,
  fundingRateAPR,
  volatilityRegime,
  signedVolume,
  volumeDelta,
  orderflowImbalance
} from "./core/crypto.js";
export { pluckOpen, pluckHigh, pluckLow, pluckClose, pluckVolume, toOHLCV } from "./candles.js";
export { createRSI, createVWAPSession } from "./stateful.js";
export * from "./types.js";

import * as overlap from "./core/overlap.js";
import * as momentum from "./core/momentum.js";
import * as volatility from "./core/volatility.js";
import * as performance from "./core/performance.js";
import * as volume from "./core/volume.js";
import * as trend from "./core/trend.js";
import * as crypto from "./core/crypto.js";
import * as candles from "./candles.js";
import * as stateful from "./stateful.js";

export const ta = {
  ...overlap,
  ...momentum,
  ...volatility,
  ...performance,
  ...volume,
  ...trend,
  ...crypto,
  ...candles,
  ...stateful
};

