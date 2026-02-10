import type { Candle } from "./types.js";
import { assertFiniteSeries } from "./core/math.js";

export type OHLCV = {
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
  time: Array<number | string | Date | undefined>;
};

export function pluckOpen(candles: Candle[]): number[] {
  const out = candles.map(c => c.open);
  assertFiniteSeries("open", out);
  return out;
}

export function pluckHigh(candles: Candle[]): number[] {
  const out = candles.map(c => c.high);
  assertFiniteSeries("high", out);
  return out;
}

export function pluckLow(candles: Candle[]): number[] {
  const out = candles.map(c => c.low);
  assertFiniteSeries("low", out);
  return out;
}

export function pluckClose(candles: Candle[]): number[] {
  const out = candles.map(c => c.close);
  assertFiniteSeries("close", out);
  return out;
}

export function pluckVolume(candles: Candle[], fallback = 0): number[] {
  const out = candles.map(c => (c.volume === undefined ? fallback : c.volume));
  assertFiniteSeries("volume", out);
  return out;
}

export function toOHLCV(candles: Candle[], volumeFallback = 0): OHLCV {
  return {
    open: pluckOpen(candles),
    high: pluckHigh(candles),
    low: pluckLow(candles),
    close: pluckClose(candles),
    volume: pluckVolume(candles, volumeFallback),
    time: candles.map(c => c.time)
  };
}
