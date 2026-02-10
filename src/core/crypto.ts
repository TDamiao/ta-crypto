import { assertSameLength, makeSeries, mean, stdev } from "./math.js";
import { hlc3 } from "./overlap.js";
import { realizedVolatility } from "./performance.js";

export function vwapSession(
  high: number[],
  low: number[],
  close: number[],
  volume: number[],
  session: Array<string | number>
): Array<number | null> {
  assertSameLength(high, low, close, volume);
  if (session.length !== high.length) {
    throw new Error("All series must have the same length");
  }
  const out = makeSeries(high.length);
  const typical = hlc3(high, low, close).map(v => (v === null ? 0 : v));
  let cumPV = 0;
  let cumV = 0;
  let lastSession: string | number | undefined = undefined;

  for (let i = 0; i < high.length; i++) {
    if (lastSession !== session[i]) {
      cumPV = 0;
      cumV = 0;
      lastSession = session[i];
    }
    cumPV += typical[i] * volume[i];
    cumV += volume[i];
    out[i] = cumV === 0 ? null : cumPV / cumV;
  }

  return out;
}

export function fundingRateCumulative(values: number[]): Array<number | null> {
  const out = makeSeries(values.length);
  let acc = 0;
  for (let i = 0; i < values.length; i++) {
    acc += values[i];
    out[i] = acc;
  }
  return out;
}

export function fundingRateAPR(values: number[], periodsPerYear = 365 * 3): Array<number | null> {
  const out = makeSeries(values.length);
  for (let i = 0; i < values.length; i++) {
    out[i] = values[i] * periodsPerYear * 100;
  }
  return out;
}

export function volatilityRegime(
  values: number[],
  length = 30,
  periodsPerYear = 365,
  lowZ = -0.5,
  highZ = 0.5
): Array<number | null> {
  const vol = realizedVolatility(values, length, periodsPerYear);
  const out = makeSeries(values.length);

  for (let i = length * 2; i < values.length; i++) {
    const windowStart = i - length + 1;
    const windowEnd = i;
    const window = vol.slice(windowStart, windowEnd + 1).map(v => (v === null ? 0 : v));
    const m = mean(window, 0, window.length - 1);
    const s = stdev(window, 0, window.length - 1);
    if (s === 0) {
      out[i] = 0;
      continue;
    }
    const z = ((vol[i] as number) - m) / s;
    out[i] = z > highZ ? 1 : z < lowZ ? -1 : 0;
  }

  return out;
}

export function signedVolume(open: number[], close: number[], volume: number[]): Array<number | null> {
  assertSameLength(open, close, volume);
  const out = makeSeries(close.length);
  for (let i = 0; i < close.length; i++) {
    const diff = close[i] - open[i];
    out[i] = diff > 0 ? volume[i] : diff < 0 ? -volume[i] : 0;
  }
  return out;
}

export function volumeDelta(
  open: number[],
  close: number[],
  volume: number[],
  length = 14
): Array<number | null> {
  const sv = signedVolume(open, close, volume).map(v => (v === null ? 0 : v));
  const out = makeSeries(close.length);
  if (length <= 0) return out;
  for (let i = length - 1; i < close.length; i++) {
    let acc = 0;
    for (let j = i - length + 1; j <= i; j++) acc += sv[j];
    out[i] = acc;
  }
  return out;
}

export function orderflowImbalance(
  open: number[],
  close: number[],
  volume: number[],
  length = 14
): Array<number | null> {
  assertSameLength(open, close, volume);
  const out = makeSeries(close.length);
  if (length <= 0) return out;
  for (let i = length - 1; i < close.length; i++) {
    let signed = 0;
    let total = 0;
    for (let j = i - length + 1; j <= i; j++) {
      const diff = close[j] - open[j];
      signed += diff > 0 ? volume[j] : diff < 0 ? -volume[j] : 0;
      total += volume[j];
    }
    out[i] = total === 0 ? null : signed / total;
  }
  return out;
}

