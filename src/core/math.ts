export function isNum(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function assertFiniteSeries(name: string, values: number[]): void {
  for (let i = 0; i < values.length; i++) {
    if (!isNum(values[i])) {
      throw new Error(`${name}[${i}] must be a finite number`);
    }
  }
}

export function assertSameLength(...series: number[][]): void {
  if (series.length === 0) return;
  const len = series[0].length;
  for (const s of series) {
    if (s.length !== len) {
      throw new Error(`All series must have the same length (expected ${len}, got ${s.length})`);
    }
  }
}

export function makeSeries(length: number): Array<number | null> {
  return Array.from({ length }, () => null);
}

export function sum(values: number[], start: number, end: number): number {
  let acc = 0;
  for (let i = start; i <= end; i++) acc += values[i];
  return acc;
}

export function mean(values: number[], start: number, end: number): number {
  return sum(values, start, end) / (end - start + 1);
}

export function variance(values: number[], start: number, end: number): number {
  const m = mean(values, start, end);
  let acc = 0;
  for (let i = start; i <= end; i++) {
    const d = values[i] - m;
    acc += d * d;
  }
  return acc / (end - start + 1);
}

export function stdev(values: number[], start: number, end: number): number {
  return Math.sqrt(variance(values, start, end));
}
