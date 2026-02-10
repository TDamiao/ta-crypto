import { assertSameLength, makeSeries } from "./math";
import { rma } from "./overlap";

export function trueRange(high: number[], low: number[], close: number[]): Array<number | null> {
  assertSameLength(high, low, close);
  const out = makeSeries(high.length);
  for (let i = 0; i < high.length; i++) {
    if (i === 0) {
      out[i] = high[i] - low[i];
    } else {
      const tr = Math.max(
        high[i] - low[i],
        Math.abs(high[i] - close[i - 1]),
        Math.abs(low[i] - close[i - 1])
      );
      out[i] = tr;
    }
  }
  return out;
}

export function atr(high: number[], low: number[], close: number[], length = 14): Array<number | null> {
  const tr = trueRange(high, low, close).map(v => (v === null ? 0 : v));
  return rma(tr, length);
}

export function natr(high: number[], low: number[], close: number[], length = 14): Array<number | null> {
  const atrv = atr(high, low, close, length);
  const out = makeSeries(close.length);
  for (let i = 0; i < close.length; i++) {
    if (atrv[i] === null) continue;
    out[i] = (atrv[i] as number) / close[i] * 100;
  }
  return out;
}
