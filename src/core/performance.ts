import { makeSeries, stdev } from "./math";

export function logReturn(values: number[], cumulative = false): Array<number | null> {
  const out = makeSeries(values.length);
  let acc = 0;
  for (let i = 1; i < values.length; i++) {
    const r = Math.log(values[i] / values[i - 1]);
    if (cumulative) {
      acc += r;
      out[i] = acc;
    } else {
      out[i] = r;
    }
  }
  return out;
}

export function percentReturn(values: number[], cumulative = false): Array<number | null> {
  const out = makeSeries(values.length);
  let acc = 0;
  for (let i = 1; i < values.length; i++) {
    const r = values[i] / values[i - 1] - 1;
    if (cumulative) {
      acc += r;
      out[i] = acc;
    } else {
      out[i] = r;
    }
  }
  return out;
}

export function realizedVolatility(values: number[], length = 30, periodsPerYear = 365): Array<number | null> {
  const rets = logReturn(values).map(v => (v === null ? 0 : v));
  const out = makeSeries(values.length);
  for (let i = length; i < values.length; i++) {
    const s = stdev(rets, i - length + 1, i);
    out[i] = s * Math.sqrt(periodsPerYear);
  }
  return out;
}
