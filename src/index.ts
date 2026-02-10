export { sma, ema, rma, hl2, hlc3, ohlc4, vwap, bbands } from "./core/overlap";
export { rsi, macd, stoch } from "./core/momentum";
export { trueRange, atr, natr } from "./core/volatility";
export { logReturn, percentReturn, realizedVolatility } from "./core/performance";
export { obv, mfi } from "./core/volume";
export { adx } from "./core/trend";
export {
  vwapSession,
  fundingRateCumulative,
  fundingRateAPR,
  volatilityRegime,
  signedVolume,
  volumeDelta,
  orderflowImbalance
} from "./core/crypto";
export * from "./types";

import * as overlap from "./core/overlap";
import * as momentum from "./core/momentum";
import * as volatility from "./core/volatility";
import * as performance from "./core/performance";
import * as volume from "./core/volume";
import * as trend from "./core/trend";
import * as crypto from "./core/crypto";

export const ta = {
  ...overlap,
  ...momentum,
  ...volatility,
  ...performance,
  ...volume,
  ...trend,
  ...crypto
};
