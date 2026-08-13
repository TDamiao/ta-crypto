import { assertPositiveInteger, assertSameLength, makeSeries } from "./math.js";

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
  assertPositiveInteger("length", length);
  const len = close.length;
  const out = makeSeries(len);
  if (len <= length) return out;

  const posBuf = new Float64Array(length);
  const negBuf = new Float64Array(length);

  let prevTP = (high[0] + low[0] + close[0]) / 3;
  let posSum = 0;
  let negSum = 0;

  for (let i = 1; i < len; i++) {
    const tp = (high[i] + low[i] + close[i]) / 3;
    const mf = tp * volume[i];
    const pos = tp > prevTP ? mf : 0;
    const neg = tp < prevTP ? mf : 0;
    prevTP = tp;

    const slot = (i - 1) % length;
    posSum += pos - posBuf[slot];
    negSum += neg - negBuf[slot];
    posBuf[slot] = pos;
    negBuf[slot] = neg;

    if (i >= length) {
      if (posSum + negSum === 0) {
        out[i] = 50;
      } else if (negSum === 0) {
        out[i] = 100;
      } else {
        const ratio = posSum / negSum;
        out[i] = 100 - 100 / (1 + ratio);
      }
    }
  }

  return out;
}

