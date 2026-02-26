import { assertFiniteSeries, assertSameLength, isNum } from "./core/math.js";
import type { Candle, OHLCV, OHLCVInput, PriceInput, TimeValue } from "./types.js";

function readField(candle: Candle, index: number, name: string, alias: string): number {
  const value = (candle as Record<string, unknown>)[name] ?? (candle as Record<string, unknown>)[alias];
  if (!isNum(value)) {
    throw new Error(`candles[${index}].${name} (or .${alias}) must be a finite number`);
  }
  return value;
}

function readTime(candle: Candle): TimeValue | undefined {
  const value = (candle as Record<string, unknown>).time ?? (candle as Record<string, unknown>).t;
  return value as TimeValue | undefined;
}

function hasOHLCVArrays(input: OHLCVInput): input is OHLCV {
  return "open" in input && "high" in input && "low" in input && "close" in input;
}

export function isCandleArray(input: PriceInput | OHLCVInput): input is Candle[] {
  return Array.isArray(input) && input.length > 0 && typeof input[0] !== "number";
}

export function normalizePrice(input: PriceInput, name = "values"): number[] {
  if (Array.isArray(input) && (input.length === 0 || typeof input[0] === "number")) {
    assertFiniteSeries(name, input as number[]);
    return input as number[];
  }
  return pluckClose(input as Candle[]);
}

export function pluckOpen(candles: Candle[]): number[] {
  const out = candles.map((candle, index) => readField(candle, index, "open", "o"));
  assertFiniteSeries("open", out);
  return out;
}

export function pluckHigh(candles: Candle[]): number[] {
  const out = candles.map((candle, index) => readField(candle, index, "high", "h"));
  assertFiniteSeries("high", out);
  return out;
}

export function pluckLow(candles: Candle[]): number[] {
  const out = candles.map((candle, index) => readField(candle, index, "low", "l"));
  assertFiniteSeries("low", out);
  return out;
}

export function pluckClose(candles: Candle[]): number[] {
  const out = candles.map((candle, index) => readField(candle, index, "close", "c"));
  assertFiniteSeries("close", out);
  return out;
}

export function pluckVolume(candles: Candle[], fallback = 0): number[] {
  if (!isNum(fallback)) {
    throw new Error("volumeFallback must be a finite number");
  }
  const out = candles.map((candle, index) => {
    const value = (candle as Record<string, unknown>).volume ?? (candle as Record<string, unknown>).v;
    const normalized = value === undefined ? fallback : value;
    if (!isNum(normalized)) {
      throw new Error(`candles[${index}].volume (or .v) must be a finite number`);
    }
    return normalized;
  });
  assertFiniteSeries("volume", out);
  return out;
}

export function toOHLCV(input: Candle[] | OHLCVInput, volumeFallback = 0): OHLCV {
  if (Array.isArray(input)) {
    return {
      open: pluckOpen(input),
      high: pluckHigh(input),
      low: pluckLow(input),
      close: pluckClose(input),
      volume: pluckVolume(input, volumeFallback),
      time: input.map(c => readTime(c))
    };
  }

  if (hasOHLCVArrays(input)) {
    assertFiniteSeries("open", input.open);
    assertFiniteSeries("high", input.high);
    assertFiniteSeries("low", input.low);
    assertFiniteSeries("close", input.close);
    const volume = input.volume ?? new Array(input.close.length).fill(volumeFallback);
    assertFiniteSeries("volume", volume);
    assertSameLength(input.open, input.high, input.low, input.close, volume);
    const time = input.time ?? new Array(input.close.length).fill(undefined);
    if (time.length !== input.close.length) {
      throw new Error(`All series must have the same length (expected ${input.close.length}, got ${time.length})`);
    }
    return { open: input.open, high: input.high, low: input.low, close: input.close, volume, time };
  }

  assertFiniteSeries("open", input.o);
  assertFiniteSeries("high", input.h);
  assertFiniteSeries("low", input.l);
  assertFiniteSeries("close", input.c);
  const volume = input.v ?? new Array(input.c.length).fill(volumeFallback);
  assertFiniteSeries("volume", volume);
  assertSameLength(input.o, input.h, input.l, input.c, volume);
  const time = input.t ?? new Array(input.c.length).fill(undefined);
  if (time.length !== input.c.length) {
    throw new Error(`All series must have the same length (expected ${input.c.length}, got ${time.length})`);
  }
  return { open: input.o, high: input.h, low: input.l, close: input.c, volume, time };
}
