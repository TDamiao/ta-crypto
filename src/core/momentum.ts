import { assertSameLength, makeSeries } from "./math.js";
import { ema } from "./overlap.js";

export function macd(values: number[], fast = 12, slow = 26, signal = 9) {
  const fastEma = ema(values, fast);
  const slowEma = ema(values, slow);
  const macdLine = makeSeries(values.length);
  for (let i = 0; i < values.length; i++) {
    if (fastEma[i] === null || slowEma[i] === null) continue;
    macdLine[i] = (fastEma[i] as number) - (slowEma[i] as number);
  }
  const signalLine = ema(macdLine.map(v => (v === null ? 0 : v)), signal);
  const histogram = makeSeries(values.length);
  for (let i = 0; i < values.length; i++) {
    if (macdLine[i] === null || signalLine[i] === null) continue;
    histogram[i] = (macdLine[i] as number) - (signalLine[i] as number);
  }
  return { macd: macdLine, signal: signalLine, histogram };
}

export function rsi(values: number[], length = 14): Array<number | null> {
  const out = makeSeries(values.length);
  if (length <= 0 || values.length < length + 1) return out;

  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= length; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gain += diff; else loss -= diff;
  }
  gain /= length;
  loss /= length;

  const rs = loss === 0 ? 0 : gain / loss;
  out[length] = loss === 0 ? 100 : 100 - 100 / (1 + rs);

  for (let i = length + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const g = diff > 0 ? diff : 0;
    const l = diff < 0 ? -diff : 0;
    gain = (gain * (length - 1) + g) / length;
    loss = (loss * (length - 1) + l) / length;
    const r = loss === 0 ? 0 : gain / loss;
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + r);
  }

  return out;
}

export function stoch(
  high: number[],
  low: number[],
  close: number[],
  kLength = 14,
  dLength = 3
) {
  assertSameLength(high, low, close);
  const len = close.length;
  const k = makeSeries(len);
  const d = makeSeries(len);

  for (let i = kLength - 1; i < len; i++) {
    let hh = -Infinity;
    let ll = Infinity;
    for (let j = i - kLength + 1; j <= i; j++) {
      if (high[j] > hh) hh = high[j];
      if (low[j] < ll) ll = low[j];
    }
    const range = hh - ll;
    k[i] = range === 0 ? 0 : ((close[i] - ll) / range) * 100;
  }

  for (let i = kLength - 1 + dLength - 1; i < len; i++) {
    let acc = 0;
    let ok = true;
    for (let j = i - dLength + 1; j <= i; j++) {
      if (k[j] === null) {
        ok = false;
        break;
      }
      acc += k[j] as number;
    }
    d[i] = ok ? acc / dLength : null;
  }

  return { k, d };
}

