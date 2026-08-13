export type RollingValue = number | null;

function assertPeriod(period: number): void {
  if (!Number.isInteger(period) || period <= 0) {
    throw new Error("period must be a positive integer");
  }
}

function assertValue(value: number): void {
  if (!Number.isFinite(value)) {
    throw new Error("value must be a finite number");
  }
}

export class RollingWindow {
  readonly period: number;
  private readonly values: number[];
  private cursor = 0;
  private count = 0;

  constructor(period: number) {
    assertPeriod(period);
    this.period = period;
    this.values = new Array<number>(period);
  }

  get size(): number {
    return this.count;
  }

  get ready(): boolean {
    return this.count === this.period;
  }

  push(value: number): number | null {
    assertValue(value);
    const removed = this.ready ? this.values[this.cursor] : null;
    this.values[this.cursor] = value;
    this.cursor = (this.cursor + 1) % this.period;
    if (this.count < this.period) this.count += 1;
    return removed;
  }

  reset(): void {
    this.cursor = 0;
    this.count = 0;
  }
}

export class RollingSum {
  private readonly window: RollingWindow;
  private total = 0;

  constructor(period: number) {
    this.window = new RollingWindow(period);
  }

  get ready(): boolean {
    return this.window.ready;
  }

  next(value: number): RollingValue {
    const removed = this.window.push(value);
    this.total += value - (removed ?? 0);
    return this.ready ? this.total : null;
  }

  reset(): void {
    this.window.reset();
    this.total = 0;
  }
}

export class RollingMean {
  readonly period: number;
  private readonly sum: RollingSum;

  constructor(period: number) {
    assertPeriod(period);
    this.period = period;
    this.sum = new RollingSum(period);
  }

  next(value: number): RollingValue {
    const total = this.sum.next(value);
    return total === null ? null : total / this.period;
  }

  reset(): void {
    this.sum.reset();
  }
}

export class RollingStdDev {
  readonly period: number;
  private readonly window: RollingWindow;
  private mean = 0;
  private M2 = 0;

  constructor(period: number) {
    assertPeriod(period);
    this.period = period;
    this.window = new RollingWindow(period);
  }

  next(value: number): RollingValue {
    assertValue(value);
    const wasReady = this.window.ready;
    const removed = this.window.push(value);
    if (!wasReady) {
      const count = this.window.size;
      const delta = value - this.mean;
      this.mean += delta / count;
      const delta2 = value - this.mean;
      this.M2 += delta * delta2;
    } else if (removed !== null) {
      const oldMean = this.mean;
      this.mean = oldMean + (value - removed) / this.period;
      this.M2 += (value - removed) * (value - this.mean + removed - oldMean);
      if (this.M2 < 0) this.M2 = 0;
    }
    if (!this.window.ready) return null;
    return Math.sqrt(Math.max(0, this.M2 / this.period));
  }

  reset(): void {
    this.window.reset();
    this.mean = 0;
    this.M2 = 0;
  }
}

type ExtremumEntry = { index: number; value: number };

class RollingExtremum {
  private readonly period: number;
  private readonly compare: (candidate: number, tail: number) => boolean;
  private readonly deque: ExtremumEntry[] = [];
  private head = 0;
  private index = -1;

  constructor(period: number, compare: (candidate: number, tail: number) => boolean) {
    assertPeriod(period);
    this.period = period;
    this.compare = compare;
  }

  next(value: number): RollingValue {
    assertValue(value);
    this.index += 1;
    const firstValid = this.index - this.period + 1;
    while (this.head < this.deque.length && this.deque[this.head].index < firstValid) this.head += 1;
    while (this.deque.length > this.head && this.compare(value, this.deque[this.deque.length - 1].value)) {
      this.deque.pop();
    }
    this.deque.push({ index: this.index, value });

    if (this.head > 64 && this.head * 2 > this.deque.length) {
      this.deque.splice(0, this.head);
      this.head = 0;
    }
    return this.index + 1 < this.period ? null : this.deque[this.head].value;
  }

  reset(): void {
    this.deque.length = 0;
    this.head = 0;
    this.index = -1;
  }
}

export class RollingMin extends RollingExtremum {
  constructor(period: number) {
    super(period, (candidate, tail) => candidate <= tail);
  }
}

export class RollingMax extends RollingExtremum {
  constructor(period: number) {
    super(period, (candidate, tail) => candidate >= tail);
  }
}

function collect(values: number[], engine: { next(value: number): RollingValue }): RollingValue[] {
  return values.map(value => engine.next(value));
}

export function rollingSum(values: number[], period: number): RollingValue[] {
  assertPeriod(period);
  const out = new Array<RollingValue>(values.length).fill(null);
  let total = 0;
  for (let i = 0; i < values.length; i++) {
    total += values[i];
    if (i >= period) total -= values[i - period];
    if (i >= period - 1) out[i] = total;
  }
  return out;
}

export function rollingMean(values: number[], period: number): RollingValue[] {
  assertPeriod(period);
  const out = new Array<RollingValue>(values.length).fill(null);
  let total = 0;
  for (let i = 0; i < values.length; i++) {
    total += values[i];
    if (i >= period) total -= values[i - period];
    if (i >= period - 1) out[i] = total / period;
  }
  return out;
}

export function rollingStdDev(values: number[], period: number): RollingValue[] {
  assertPeriod(period);
  const out = new Array<RollingValue>(values.length).fill(null);
  if (values.length < period) return out;

  let mean = 0;
  let M2 = 0;
  for (let i = 0; i < period; i++) {
    const value = values[i];
    assertValue(value);
    const count = i + 1;
    const delta = value - mean;
    mean += delta / count;
    const delta2 = value - mean;
    M2 += delta * delta2;
  }
  out[period - 1] = Math.sqrt(Math.max(0, M2 / period));

  for (let i = period; i < values.length; i++) {
    const vNew = values[i];
    const vOld = values[i - period];
    assertValue(vNew);
    const oldMean = mean;
    mean = oldMean + (vNew - vOld) / period;
    M2 += (vNew - vOld) * (vNew - mean + vOld - oldMean);
    if (M2 < 0) M2 = 0;
    out[i] = Math.sqrt(Math.max(0, M2 / period));
  }
  return out;
}

export function rollingMeanStdDev(
  values: number[],
  period: number
): { mean: RollingValue[]; stdDev: RollingValue[] } {
  assertPeriod(period);
  const meanOut = new Array<RollingValue>(values.length).fill(null);
  const stdDevOut = new Array<RollingValue>(values.length).fill(null);
  if (values.length < period) return { mean: meanOut, stdDev: stdDevOut };

  let currentMean = 0;
  let M2 = 0;
  for (let i = 0; i < period; i++) {
    const value = values[i];
    assertValue(value);
    const count = i + 1;
    const delta = value - currentMean;
    currentMean += delta / count;
    const delta2 = value - currentMean;
    M2 += delta * delta2;
  }
  meanOut[period - 1] = currentMean;
  stdDevOut[period - 1] = Math.sqrt(Math.max(0, M2 / period));

  for (let i = period; i < values.length; i++) {
    const vNew = values[i];
    const vOld = values[i - period];
    assertValue(vNew);
    const oldMean = currentMean;
    currentMean = oldMean + (vNew - vOld) / period;
    M2 += (vNew - vOld) * (vNew - currentMean + vOld - oldMean);
    if (M2 < 0) M2 = 0;
    meanOut[i] = currentMean;
    stdDevOut[i] = Math.sqrt(Math.max(0, M2 / period));
  }
  return { mean: meanOut, stdDev: stdDevOut };
}

export function rollingMin(values: number[], period: number): RollingValue[] {
  return collect(values, new RollingMin(period));
}

export function rollingMax(values: number[], period: number): RollingValue[] {
  return collect(values, new RollingMax(period));
}
