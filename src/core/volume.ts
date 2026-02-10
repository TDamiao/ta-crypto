import { assertSameLength, makeSeries } from "./math.js";

export function obv(close: number[], volume: number[]): Array<number | null> {
  assertSameLength(close, volume);
  const out = makeSeries(close.length);
  let acc = 0;
  for (let i = 0; i < close.length; i++) {
    if (i === 0) {
      out[i] = acc;
      continue;
    }
    if (close[i] > close[i - 1]) acc += volume[i];
    else if (close[i] < close[i - 1]) acc -= volume[i];
    out[i] = acc;
  }
  return out;
}

export function mfi(
  high: number[],
  low: number[],
  close: number[],
  volume: number[],
  length = 14
): Array<number | null> {
  assertSameLength(high, low, close, volume);
  const len = close.length;

  const out = makeSeries(len);
  if (length <= 0) return out;

  const tp: number[] = new Array(len);
  const mf: number[] = new Array(len);
  for (let i = 0; i < len; i++) {
    tp[i] = (high[i] + low[i] + close[i]) / 3;
    mf[i] = tp[i] * volume[i];
  }

  for (let i = length; i < len; i++) {
    let pos = 0;
    let neg = 0;
    for (let j = i - length + 1; j <= i; j++) {
      if (tp[j] > tp[j - 1]) pos += mf[j];
      else if (tp[j] < tp[j - 1]) neg += mf[j];
    }
    if (pos + neg === 0) {
      out[i] = 50;
      continue;
    }
    const ratio = neg === 0 ? 0 : pos / neg;
    out[i] = neg === 0 ? 100 : 100 - 100 / (1 + ratio);
  }

  return out;
}

