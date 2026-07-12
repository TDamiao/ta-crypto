import { assertSameLength, isNum, makeSeries, mean } from "./math.js";
import { rollingMean, rollingMeanStdDev } from "./rolling.js";

export function sma(values: number[], length = 14): Array<number | null> {
  if (length <= 0) return makeSeries(values.length);
  return rollingMean(values, length);
}

export function ema(values: number[], length = 14): Array<number | null> {
  const out = makeSeries(values.length);
  if (length <= 0) return out;
  const k = 2 / (length + 1);
  let prev = 0;
  for (let i = 0; i < values.length; i++) {
    if (i === length - 1) {
      prev = mean(values, 0, i);
      out[i] = prev;
    } else if (i >= length) {
      prev = (values[i] - prev) * k + prev;
      out[i] = prev;
    }
  }
  return out;
}

export function rma(values: number[], length = 14): Array<number | null> {
  const out = makeSeries(values.length);
  if (length <= 0) return out;
  let prev = 0;
  for (let i = 0; i < values.length; i++) {
    if (i === length - 1) {
      prev = mean(values, 0, i);
      out[i] = prev;
    } else if (i >= length) {
      prev = (prev * (length - 1) + values[i]) / length;
      out[i] = prev;
    }
  }
  return out;
}

export function hl2(high: number[], low: number[]): Array<number | null> {
  assertSameLength(high, low);
  const out = makeSeries(high.length);
  for (let i = 0; i < high.length; i++) out[i] = (high[i] + low[i]) / 2;
  return out;
}

export function hlc3(high: number[], low: number[], close: number[]): Array<number | null> {
  assertSameLength(high, low, close);
  const out = makeSeries(high.length);
  for (let i = 0; i < high.length; i++) out[i] = (high[i] + low[i] + close[i]) / 3;
  return out;
}

export function ohlc4(open: number[], high: number[], low: number[], close: number[]): Array<number | null> {
  assertSameLength(open, high, low, close);
  const out = makeSeries(open.length);
  for (let i = 0; i < open.length; i++) out[i] = (open[i] + high[i] + low[i] + close[i]) / 4;
  return out;
}

export function vwap(
  high: number[],
  low: number[],
  close: number[],
  volume: number[],
  length?: number
): Array<number | null> {
  assertSameLength(high, low, close, volume);
  const typical = hlc3(high, low, close).map(v => (isNum(v) ? v : 0));
  const out = makeSeries(high.length);
  if (!length || length <= 0) {
    let cumPV = 0;
    let cumV = 0;
    for (let i = 0; i < high.length; i++) {
      cumPV += typical[i] * volume[i];
      cumV += volume[i];
      out[i] = cumV === 0 ? null : cumPV / cumV;
    }
    return out;
  }

  for (let i = length - 1; i < high.length; i++) {
    let pv = 0;
    let v = 0;
    for (let j = i - length + 1; j <= i; j++) {
      pv += typical[j] * volume[j];
      v += volume[j];
    }
    out[i] = v === 0 ? null : pv / v;
  }
  return out;
}

export function bbands(values: number[], length = 20, std = 2) {
  if (length <= 0) {
    return {
      basis: makeSeries(values.length),
      upper: makeSeries(values.length),
      lower: makeSeries(values.length)
    };
  }
  const { mean: basis, stdDev: upper } = rollingMeanStdDev(values, length);
  const lower = makeSeries(values.length);
  for (let i = 0; i < values.length; i++) {
    const s = upper[i];
    if (s === null) continue;
    upper[i] = (basis[i] as number) + std * s;
    lower[i] = (basis[i] as number) - std * s;
  }
  return { basis, upper, lower };
}
