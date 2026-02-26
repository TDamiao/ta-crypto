export {
  sma,
  ema,
  rma,
  hl2,
  hlc3,
  ohlc4,
  vwap,
  bbands,
  rsi,
  macd,
  stoch,
  trueRange,
  atr,
  natr,
  logReturn,
  percentReturn,
  realizedVolatility,
  obv,
  mfi,
  adx,
  vwapSession,
  fundingRateCumulative,
  fundingRateAPR,
  volatilityRegime,
  signedVolume,
  volumeDelta,
  orderflowImbalance
} from "./api.js";
export { pluckOpen, pluckHigh, pluckLow, pluckClose, pluckVolume, toOHLCV } from "./candles.js";
export { createRSI, createVWAPSession } from "./stateful.js";
export * from "./types.js";

import * as api from "./api.js";
import * as candles from "./candles.js";
import * as stateful from "./stateful.js";

export const ta = {
  ...api,
  ...candles,
  ...stateful
};

