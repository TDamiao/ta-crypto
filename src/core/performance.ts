import { assertFiniteSeries, assertPositiveInteger, assertPositiveSeries, makeSeries, stdev } from "./math.js";
import type { PercentReturnMode, PercentReturnOptions } from "../types.js";

export function logReturn(values: number[], cumulative = false): Array<number | null> {
  assertPositiveSeries("values", values);
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

export function sumPeriodicReturns(values: number[]): Array<number | null> {
  assertFiniteSeries("values", values);
  const out = makeSeries(values.length);
  let acc = 0;
  for (let i = 1; i < values.length; i++) {
    const r = values[i] / values[i - 1] - 1;
    acc += r;
    out[i] = acc;
  }
  return out;
}

export function percentReturn(
  values: number[],
  options?: PercentReturnOptions | boolean
): Array<number | null> {
  assertFiniteSeries("values", values);
  const out = makeSeries(values.length);
  if (values.length < 2) return out;

  let mode: PercentReturnMode = "periodic";
  if (typeof options === "boolean") {
    mode = options ? "compound" : "periodic";
  } else if (options && typeof options === "object") {
    if (options.mode !== undefined) {
      if (options.mode !== "periodic" && options.mode !== "compound" && options.mode !== "sum") {
        throw new Error(`Invalid percentReturn mode: expected "periodic", "compound", or "sum", got "${options.mode}"`);
      }
      mode = options.mode;
    } else if (options.cumulative !== undefined) {
      mode = options.cumulative ? "compound" : "periodic";
    }
  }

  if (mode === "sum") {
    let acc = 0;
    for (let i = 1; i < values.length; i++) {
      const r = values[i] / values[i - 1] - 1;
      acc += r;
      out[i] = acc;
    }
    return out;
  }

  if (mode === "compound") {
    const initial = values[0];
    for (let i = 1; i < values.length; i++) {
      out[i] = values[i] / initial - 1;
    }
    return out;
  }

  for (let i = 1; i < values.length; i++) {
    out[i] = values[i] / values[i - 1] - 1;
  }
  return out;
}

export function realizedVolatility(values: number[], length = 30, periodsPerYear = 365): Array<number | null> {
  assertPositiveInteger("length", length);
  if (!Number.isFinite(periodsPerYear) || periodsPerYear <= 0) {
    throw new Error("periodsPerYear must be a positive number");
  }
  assertPositiveSeries("values", values);
  const len = values.length;
  const out = makeSeries(len);
  if (len <= length) return out;

  const rets = new Array<number>(len);
  rets[0] = 0;
  for (let i = 1; i < len; i++) {
    rets[i] = Math.log(values[i] / values[i - 1]);
  }

  const factor = Math.sqrt(periodsPerYear);
  let retSum = 0;
  let retSumSq = 0;

  for (let i = 1; i < len; i++) {
    const r = rets[i];
    retSum += r;
    retSumSq += r * r;
    if (i > length) {
      const removed = rets[i - length];
      retSum -= removed;
      retSumSq -= removed * removed;
    }
    if (i >= length) {
      const m = retSum / length;
      const variance = Math.max(0, retSumSq / length - m * m);
      const s = Math.sqrt(variance);
      out[i] = s * factor;
    }
  }
  return out;
}

