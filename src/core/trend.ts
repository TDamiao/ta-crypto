import { makeSeries } from "./math.js";
import { rma } from "./overlap.js";
import { trueRange } from "./volatility.js";

export function adx(high: number[], low: number[], close: number[], length = 14) {
  const len = close.length;
  if (high.length !== len || low.length !== len) {
    throw new Error("All series must have the same length");
  }

  const plusDM: number[] = new Array(len).fill(0);
  const minusDM: number[] = new Array(len).fill(0);
  for (let i = 1; i < len; i++) {
    const up = high[i] - high[i - 1];
    const down = low[i - 1] - low[i];
    plusDM[i] = up > down && up > 0 ? up : 0;
    minusDM[i] = down > up && down > 0 ? down : 0;
  }

  const tr = trueRange(high, low, close).map(v => (v === null ? 0 : v));
  const atr = rma(tr, length);
  const plus = rma(plusDM, length);
  const minus = rma(minusDM, length);

  const plusDI = makeSeries(len);
  const minusDI = makeSeries(len);
  const dx = makeSeries(len);

  for (let i = 0; i < len; i++) {
    if (atr[i] === null) continue;
    const atrv = atr[i] as number;
    plusDI[i] = atrv === 0 ? 0 : ((plus[i] as number) / atrv) * 100;
    minusDI[i] = atrv === 0 ? 0 : ((minus[i] as number) / atrv) * 100;
    const denom = (plusDI[i] as number) + (minusDI[i] as number);
    dx[i] = denom === 0 ? 0 : (Math.abs((plusDI[i] as number) - (minusDI[i] as number)) / denom) * 100;
  }

  const adxRaw = rma(dx.map(v => (v === null ? 0 : v)), length);
  const adx = makeSeries(len);
  for (let i = 0; i < len; i++) {
    if (dx[i] === null) continue;
    adx[i] = adxRaw[i];
  }

  return { adx, plusDI, minusDI };
}

