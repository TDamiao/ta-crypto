import type { Candle, OHLCVInput, PriceInput } from "./types.js";
import { assertFiniteSeries } from "./core/math.js";
import { normalizePrice, toOHLCV } from "./candles.js";
import {
  sma as coreSma,
  ema as coreEma,
  rma as coreRma,
  hl2 as coreHl2,
  hlc3 as coreHlc3,
  ohlc4 as coreOhlc4,
  vwap as coreVwap,
  bbands as coreBbands
} from "./core/overlap.js";
import { rsi as coreRsi, macd as coreMacd, stoch as coreStoch } from "./core/momentum.js";
import { trueRange as coreTrueRange, atr as coreAtr, natr as coreNatr } from "./core/volatility.js";
import {
  logReturn as coreLogReturn,
  percentReturn as corePercentReturn,
  realizedVolatility as coreRealizedVolatility
} from "./core/performance.js";
import { obv as coreObv, mfi as coreMfi } from "./core/volume.js";
import { adx as coreAdx } from "./core/trend.js";
import {
  vwapSession as coreVwapSession,
  fundingRateCumulative as coreFundingRateCumulative,
  fundingRateAPR as coreFundingRateAPR,
  volatilityRegime as coreVolatilityRegime,
  signedVolume as coreSignedVolume,
  volumeDelta as coreVolumeDelta,
  orderflowImbalance as coreOrderflowImbalance
} from "./core/crypto.js";

type OHLCInput = Candle[] | OHLCVInput;

function isNumericArray(input: unknown): input is number[] {
  return Array.isArray(input) && (input.length === 0 || typeof input[0] === "number");
}

function parseHLC(input: number[] | OHLCInput, low?: number[], close?: number[]) {
  if (isNumericArray(input)) {
    if (!low || !close) {
      throw new Error("Expected high, low, close arrays or candles/OHLCV object input");
    }
    assertFiniteSeries("high", input);
    assertFiniteSeries("low", low);
    assertFiniteSeries("close", close);
    return { high: input, low, close };
  }
  return toOHLCV(input);
}

function parseOHLC(input: number[] | OHLCInput, high?: number[], low?: number[], close?: number[]) {
  if (isNumericArray(input)) {
    if (!high || !low || !close) {
      throw new Error("Expected open, high, low, close arrays or candles/OHLCV object input");
    }
    assertFiniteSeries("open", input);
    assertFiniteSeries("high", high);
    assertFiniteSeries("low", low);
    assertFiniteSeries("close", close);
    return { open: input, high, low, close };
  }
  return toOHLCV(input);
}

function parseHLCV(
  input: number[] | OHLCInput,
  low?: number[],
  close?: number[],
  volume?: number[]
) {
  if (isNumericArray(input)) {
    if (!low || !close || !volume) {
      throw new Error("Expected high, low, close, volume arrays or candles/OHLCV object input");
    }
    assertFiniteSeries("high", input);
    assertFiniteSeries("low", low);
    assertFiniteSeries("close", close);
    assertFiniteSeries("volume", volume);
    return { high: input, low, close, volume };
  }
  return toOHLCV(input);
}

function parseOCV(input: number[] | OHLCInput, close?: number[], volume?: number[]) {
  if (isNumericArray(input)) {
    if (!close || !volume) {
      throw new Error("Expected open, close, volume arrays or candles/OHLCV object input");
    }
    assertFiniteSeries("open", input);
    assertFiniteSeries("close", close);
    assertFiniteSeries("volume", volume);
    return { open: input, close, volume };
  }
  return toOHLCV(input);
}

export function sma(input: PriceInput, length = 14): Array<number | null> {
  return coreSma(normalizePrice(input), length);
}

export function ema(input: PriceInput, length = 14): Array<number | null> {
  return coreEma(normalizePrice(input), length);
}

export function rma(input: PriceInput, length = 14): Array<number | null> {
  return coreRma(normalizePrice(input), length);
}

export function bbands(input: PriceInput, length = 20, std = 2) {
  return coreBbands(normalizePrice(input), length, std);
}

export function macd(input: PriceInput, fast = 12, slow = 26, signal = 9) {
  return coreMacd(normalizePrice(input), fast, slow, signal);
}

export function rsi(input: PriceInput, length = 14): Array<number | null> {
  return coreRsi(normalizePrice(input), length);
}

export function logReturn(input: PriceInput, cumulative = false): Array<number | null> {
  return coreLogReturn(normalizePrice(input), cumulative);
}

export function percentReturn(input: PriceInput, cumulative = false): Array<number | null> {
  return corePercentReturn(normalizePrice(input), cumulative);
}

export function realizedVolatility(input: PriceInput, length = 30, periodsPerYear = 365): Array<number | null> {
  return coreRealizedVolatility(normalizePrice(input), length, periodsPerYear);
}

export function hl2(high: number[], low: number[]): Array<number | null>;
export function hl2(input: OHLCInput): Array<number | null>;
export function hl2(input: number[] | OHLCInput, low?: number[]): Array<number | null> {
  if (isNumericArray(input)) {
    if (!low) throw new Error("Expected high + low arrays or candles/OHLCV object input");
    return coreHl2(input, low);
  }
  const ohlcv = toOHLCV(input);
  return coreHl2(ohlcv.high, ohlcv.low);
}

export function hlc3(high: number[], low: number[], close: number[]): Array<number | null>;
export function hlc3(input: OHLCInput): Array<number | null>;
export function hlc3(input: number[] | OHLCInput, low?: number[], close?: number[]): Array<number | null> {
  const ohlcv = parseHLC(input, low, close);
  return coreHlc3(ohlcv.high, ohlcv.low, ohlcv.close);
}

export function ohlc4(open: number[], high: number[], low: number[], close: number[]): Array<number | null>;
export function ohlc4(input: OHLCInput): Array<number | null>;
export function ohlc4(
  input: number[] | OHLCInput,
  high?: number[],
  low?: number[],
  close?: number[]
): Array<number | null> {
  const ohlcv = parseOHLC(input, high, low, close);
  return coreOhlc4(ohlcv.open, ohlcv.high, ohlcv.low, ohlcv.close);
}

export function vwap(
  high: number[],
  low: number[],
  close: number[],
  volume: number[],
  length?: number
): Array<number | null>;
export function vwap(input: OHLCInput, length?: number): Array<number | null>;
export function vwap(
  input: number[] | OHLCInput,
  lowOrLength?: number[] | number,
  close?: number[],
  volume?: number[],
  length?: number
): Array<number | null> {
  if (isNumericArray(input)) {
    const low = Array.isArray(lowOrLength) ? lowOrLength : undefined;
    const resolvedLength = typeof lowOrLength === "number" ? lowOrLength : length;
    const ohlcv = parseHLCV(input, low, close, volume);
    return coreVwap(ohlcv.high, ohlcv.low, ohlcv.close, ohlcv.volume, resolvedLength);
  }
  const ohlcv = toOHLCV(input);
  const resolvedLength = typeof lowOrLength === "number" ? lowOrLength : length;
  return coreVwap(ohlcv.high, ohlcv.low, ohlcv.close, ohlcv.volume, resolvedLength);
}

export function stoch(
  high: number[],
  low: number[],
  close: number[],
  kLength?: number,
  dLength?: number
): { k: Array<number | null>; d: Array<number | null> };
export function stoch(input: OHLCInput, kLength?: number, dLength?: number): { k: Array<number | null>; d: Array<number | null> };
export function stoch(
  input: number[] | OHLCInput,
  lowOrKLength?: number[] | number,
  closeOrDLength?: number[] | number,
  kLength = 14,
  dLength = 3
) {
  if (isNumericArray(input)) {
    const low = Array.isArray(lowOrKLength) ? lowOrKLength : undefined;
    const close = Array.isArray(closeOrDLength) ? closeOrDLength : undefined;
    const resolvedK = typeof lowOrKLength === "number" ? lowOrKLength : kLength;
    const resolvedD = typeof closeOrDLength === "number" ? closeOrDLength : dLength;
    const ohlcv = parseHLC(input, low, close);
    return coreStoch(ohlcv.high, ohlcv.low, ohlcv.close, resolvedK, resolvedD);
  }
  const resolvedK = typeof lowOrKLength === "number" ? lowOrKLength : kLength;
  const resolvedD = typeof closeOrDLength === "number" ? closeOrDLength : dLength;
  const ohlcv = toOHLCV(input);
  return coreStoch(ohlcv.high, ohlcv.low, ohlcv.close, resolvedK, resolvedD);
}

export function trueRange(high: number[], low: number[], close: number[]): Array<number | null>;
export function trueRange(input: OHLCInput): Array<number | null>;
export function trueRange(input: number[] | OHLCInput, low?: number[], close?: number[]): Array<number | null> {
  const ohlcv = parseHLC(input, low, close);
  return coreTrueRange(ohlcv.high, ohlcv.low, ohlcv.close);
}

export function atr(high: number[], low: number[], close: number[], length?: number): Array<number | null>;
export function atr(input: OHLCInput, length?: number): Array<number | null>;
export function atr(
  input: number[] | OHLCInput,
  lowOrLength?: number[] | number,
  close?: number[],
  length = 14
): Array<number | null> {
  if (isNumericArray(input)) {
    const low = Array.isArray(lowOrLength) ? lowOrLength : undefined;
    const resolvedLength = typeof lowOrLength === "number" ? lowOrLength : length;
    const ohlcv = parseHLC(input, low, close);
    return coreAtr(ohlcv.high, ohlcv.low, ohlcv.close, resolvedLength);
  }
  const ohlcv = toOHLCV(input);
  const resolvedLength = typeof lowOrLength === "number" ? lowOrLength : length;
  return coreAtr(ohlcv.high, ohlcv.low, ohlcv.close, resolvedLength);
}

export function natr(high: number[], low: number[], close: number[], length?: number): Array<number | null>;
export function natr(input: OHLCInput, length?: number): Array<number | null>;
export function natr(
  input: number[] | OHLCInput,
  lowOrLength?: number[] | number,
  close?: number[],
  length = 14
): Array<number | null> {
  if (isNumericArray(input)) {
    const low = Array.isArray(lowOrLength) ? lowOrLength : undefined;
    const resolvedLength = typeof lowOrLength === "number" ? lowOrLength : length;
    const ohlcv = parseHLC(input, low, close);
    return coreNatr(ohlcv.high, ohlcv.low, ohlcv.close, resolvedLength);
  }
  const ohlcv = toOHLCV(input);
  const resolvedLength = typeof lowOrLength === "number" ? lowOrLength : length;
  return coreNatr(ohlcv.high, ohlcv.low, ohlcv.close, resolvedLength);
}

export function obv(close: number[], volume: number[]): Array<number | null>;
export function obv(input: OHLCInput): Array<number | null>;
export function obv(input: number[] | OHLCInput, volume?: number[]): Array<number | null> {
  if (isNumericArray(input)) {
    if (!volume) throw new Error("Expected close + volume arrays or candles/OHLCV object input");
    return coreObv(input, volume);
  }
  const ohlcv = toOHLCV(input);
  return coreObv(ohlcv.close, ohlcv.volume);
}

export function mfi(
  high: number[],
  low: number[],
  close: number[],
  volume: number[],
  length?: number
): Array<number | null>;
export function mfi(input: OHLCInput, length?: number): Array<number | null>;
export function mfi(
  input: number[] | OHLCInput,
  lowOrLength?: number[] | number,
  close?: number[],
  volume?: number[],
  length = 14
): Array<number | null> {
  if (isNumericArray(input)) {
    const low = Array.isArray(lowOrLength) ? lowOrLength : undefined;
    const resolvedLength = typeof lowOrLength === "number" ? lowOrLength : length;
    const ohlcv = parseHLCV(input, low, close, volume);
    return coreMfi(ohlcv.high, ohlcv.low, ohlcv.close, ohlcv.volume, resolvedLength);
  }
  const ohlcv = toOHLCV(input);
  const resolvedLength = typeof lowOrLength === "number" ? lowOrLength : length;
  return coreMfi(ohlcv.high, ohlcv.low, ohlcv.close, ohlcv.volume, resolvedLength);
}

export function adx(
  high: number[],
  low: number[],
  close: number[],
  length?: number
): { adx: Array<number | null>; plusDI: Array<number | null>; minusDI: Array<number | null> };
export function adx(
  input: OHLCInput,
  length?: number
): { adx: Array<number | null>; plusDI: Array<number | null>; minusDI: Array<number | null> };
export function adx(
  input: number[] | OHLCInput,
  lowOrLength?: number[] | number,
  close?: number[],
  length = 14
): { adx: Array<number | null>; plusDI: Array<number | null>; minusDI: Array<number | null> } {
  if (isNumericArray(input)) {
    const low = Array.isArray(lowOrLength) ? lowOrLength : undefined;
    const resolvedLength = typeof lowOrLength === "number" ? lowOrLength : length;
    const ohlcv = parseHLC(input, low, close);
    return coreAdx(ohlcv.high, ohlcv.low, ohlcv.close, resolvedLength);
  }
  const ohlcv = toOHLCV(input);
  const resolvedLength = typeof lowOrLength === "number" ? lowOrLength : length;
  return coreAdx(ohlcv.high, ohlcv.low, ohlcv.close, resolvedLength);
}

export function vwapSession(
  high: number[],
  low: number[],
  close: number[],
  volume: number[],
  session: Array<string | number>
): Array<number | null>;
export function vwapSession(input: OHLCInput, session: Array<string | number>): Array<number | null>;
export function vwapSession(
  input: number[] | OHLCInput,
  lowOrSession: number[] | Array<string | number>,
  close?: number[],
  volume?: number[],
  session?: Array<string | number>
): Array<number | null> {
  if (isNumericArray(input)) {
    if (!isNumericArray(lowOrSession)) {
      throw new Error("Expected high, low, close, volume, session arrays");
    }
    if (!session || !close || !volume) {
      throw new Error("Expected high, low, close, volume, session arrays");
    }
    return coreVwapSession(input, lowOrSession, close, volume, session);
  }
  if (!Array.isArray(lowOrSession)) {
    throw new Error("session must be an array");
  }
  const ohlcv = toOHLCV(input);
  return coreVwapSession(ohlcv.high, ohlcv.low, ohlcv.close, ohlcv.volume, lowOrSession as Array<string | number>);
}

export function signedVolume(open: number[], close: number[], volume: number[]): Array<number | null>;
export function signedVolume(input: OHLCInput): Array<number | null>;
export function signedVolume(input: number[] | OHLCInput, close?: number[], volume?: number[]): Array<number | null> {
  const ohlcv = parseOCV(input, close, volume);
  return coreSignedVolume(ohlcv.open, ohlcv.close, ohlcv.volume);
}

export function volumeDelta(open: number[], close: number[], volume: number[], length?: number): Array<number | null>;
export function volumeDelta(input: OHLCInput, length?: number): Array<number | null>;
export function volumeDelta(
  input: number[] | OHLCInput,
  closeOrLength?: number[] | number,
  volume?: number[],
  length = 14
): Array<number | null> {
  if (isNumericArray(input)) {
    const close = Array.isArray(closeOrLength) ? closeOrLength : undefined;
    const resolvedLength = typeof closeOrLength === "number" ? closeOrLength : length;
    const ohlcv = parseOCV(input, close, volume);
    return coreVolumeDelta(ohlcv.open, ohlcv.close, ohlcv.volume, resolvedLength);
  }
  const ohlcv = toOHLCV(input);
  const resolvedLength = typeof closeOrLength === "number" ? closeOrLength : length;
  return coreVolumeDelta(ohlcv.open, ohlcv.close, ohlcv.volume, resolvedLength);
}

export function orderflowImbalance(
  open: number[],
  close: number[],
  volume: number[],
  length?: number
): Array<number | null>;
export function orderflowImbalance(input: OHLCInput, length?: number): Array<number | null>;
export function orderflowImbalance(
  input: number[] | OHLCInput,
  closeOrLength?: number[] | number,
  volume?: number[],
  length = 14
): Array<number | null> {
  if (isNumericArray(input)) {
    const close = Array.isArray(closeOrLength) ? closeOrLength : undefined;
    const resolvedLength = typeof closeOrLength === "number" ? closeOrLength : length;
    const ohlcv = parseOCV(input, close, volume);
    return coreOrderflowImbalance(ohlcv.open, ohlcv.close, ohlcv.volume, resolvedLength);
  }
  const ohlcv = toOHLCV(input);
  const resolvedLength = typeof closeOrLength === "number" ? closeOrLength : length;
  return coreOrderflowImbalance(ohlcv.open, ohlcv.close, ohlcv.volume, resolvedLength);
}

export function fundingRateCumulative(values: number[]): Array<number | null> {
  assertFiniteSeries("values", values);
  return coreFundingRateCumulative(values);
}

export function fundingRateAPR(values: number[], periodsPerYear = 365 * 3): Array<number | null> {
  assertFiniteSeries("values", values);
  return coreFundingRateAPR(values, periodsPerYear);
}

export function volatilityRegime(
  input: PriceInput,
  length = 30,
  periodsPerYear = 365,
  lowZ = -0.5,
  highZ = 0.5
): Array<number | null> {
  return coreVolatilityRegime(normalizePrice(input), length, periodsPerYear, lowZ, highZ);
}
