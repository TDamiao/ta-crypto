import {
  assertNonNegativeSeries,
  assertPositiveInteger,
  assertPositiveSeries,
  assertSameLength,
  makeSeries
} from "./math.js";
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
  assertNonNegativeSeries("volume", volume);
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
  if (!Number.isFinite(periodsPerYear) || periodsPerYear <= 0) {
    throw new Error("periodsPerYear must be a positive number");
  }
  const out = makeSeries(values.length);
  for (let i = 0; i < values.length; i++) {
    out[i] = values[i] * periodsPerYear * 100;
  }
  return out;
}

export function classifyVolatilityRegime(z: number, lowZ: number, highZ: number): -1 | 0 | 1 {
  if (z > highZ) return 1;
  if (z < lowZ) return -1;
  return 0;
}

export function volatilityRegime(
  values: number[],
  length = 30,
  periodsPerYear = 365,
  lowZ = -0.5,
  highZ = 0.5
): Array<number | null> {
  assertPositiveInteger("length", length);
  if (!Number.isFinite(periodsPerYear) || periodsPerYear <= 0) {
    throw new Error("periodsPerYear must be a positive number");
  }
  assertPositiveSeries("values", values);
  const vol = realizedVolatility(values, length, periodsPerYear);
  const len = values.length;
  const out = makeSeries(len);
  if (len <= length * 2) return out;

  let mean = 0;
  let M2 = 0;

  for (let i = length + 1; i <= length * 2; i++) {
    const v = vol[i] as number;
    const count = i - length;
    const delta = v - mean;
    mean += delta / count;
    const delta2 = v - mean;
    M2 += delta * delta2;
  }

  const s0 = Math.sqrt(Math.max(0, M2 / length));
  // When rolling standard deviation of realized volatility is degenerate (s <= 1e-12),
  // window variation is dominated by IEEE 754 floating-point quantization noise.
  // To avoid division-by-near-zero instability and spurious regime flips, degenerate
  // volatility is classified as neutral regime (0).
  if (s0 <= 1e-12) {
    out[length * 2] = 0;
  } else {
    const z0 = ((vol[length * 2] as number) - mean) / s0;
    out[length * 2] = classifyVolatilityRegime(z0, lowZ, highZ);
  }

  for (let i = length * 2 + 1; i < len; i++) {
    const vNew = vol[i] as number;
    const vOld = vol[i - length] as number;
    const oldMean = mean;
    mean = oldMean + (vNew - vOld) / length;
    M2 += (vNew - vOld) * (vNew - mean + vOld - oldMean);
    if (M2 < 0) M2 = 0;
    const s = Math.sqrt(M2 / length);
    if (s <= 1e-12) {
      out[i] = 0;
    } else {
      const z = (vNew - mean) / s;
      out[i] = classifyVolatilityRegime(z, lowZ, highZ);
    }
  }

  return out;
}

export function signedVolume(open: number[], close: number[], volume: number[]): Array<number | null> {
  assertSameLength(open, close, volume);
  assertNonNegativeSeries("volume", volume);
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
  assertSameLength(open, close, volume);
  assertPositiveInteger("length", length);
  assertNonNegativeSeries("volume", volume);
  const len = close.length;
  const out = makeSeries(len);
  let total = 0;
  for (let i = 0; i < len; i++) {
    const diff = close[i] - open[i];
    const sv = diff > 0 ? volume[i] : diff < 0 ? -volume[i] : 0;
    total += sv;
    if (i >= length) {
      const oldDiff = close[i - length] - open[i - length];
      const oldSv = oldDiff > 0 ? volume[i - length] : oldDiff < 0 ? -volume[i - length] : 0;
      total -= oldSv;
    }
    if (i >= length - 1) {
      out[i] = total;
    }
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
  assertPositiveInteger("length", length);
  assertNonNegativeSeries("volume", volume);
  const len = close.length;
  const out = makeSeries(len);
  let signedTotal = 0;
  let volumeTotal = 0;
  for (let i = 0; i < len; i++) {
    const diff = close[i] - open[i];
    const sv = diff > 0 ? volume[i] : diff < 0 ? -volume[i] : 0;
    signedTotal += sv;
    volumeTotal += volume[i];
    if (i >= length) {
      const oldDiff = close[i - length] - open[i - length];
      const oldSv = oldDiff > 0 ? volume[i - length] : oldDiff < 0 ? -volume[i - length] : 0;
      signedTotal -= oldSv;
      volumeTotal -= volume[i - length];
    }
    if (i >= length - 1) {
      out[i] = volumeTotal === 0 ? null : signedTotal / volumeTotal;
    }
  }
  return out;
}

