import { RollingMean, RollingStdDev, RollingSum } from "./core/rolling.js";
import { assertPositiveInteger } from "./core/math.js";
import { classifyVolatilityRegime } from "./core/crypto.js";
import type {
  ATRInput,
  BBANDSOutput,
  MACDOutput,
  OrderflowInput,
  StatefulIndicator,
  VWAPSessionInput
} from "./types.js";

export type {
  ATRInput,
  BBANDSOutput,
  MACDOutput,
  OrderflowInput,
  StatefulIndicator,
  VWAPSessionInput
};

export function createSMA(period = 14): StatefulIndicator<number, number | null> {
  assertPositiveInteger("period", period);

  const rolling = new RollingMean(period);

  return {
    next(value: number): number | null {
      if (!Number.isFinite(value)) {
        throw new Error("value must be a finite number");
      }

      return rolling.next(value);
    },
    reset(): void {
      rolling.reset();
    }
  };
}

export function createEMA(period = 14): StatefulIndicator<number, number | null> {
  assertPositiveInteger("period", period);

  const k = 2 / (period + 1);
  let seedSum = 0;
  let seedCount = 0;
  let prev: number | null = null;

  return {
    next(value: number): number | null {
      if (!Number.isFinite(value)) {
        throw new Error("value must be a finite number");
      }

      if (prev === null) {
        seedSum += value;
        seedCount += 1;
        if (seedCount < period) {
          return null;
        }
        prev = seedSum / period;
        return prev;
      }

      prev = (value - prev) * k + prev;
      return prev;
    },
    reset(): void {
      seedSum = 0;
      seedCount = 0;
      prev = null;
    }
  };
}

export function createRSI(period = 14): StatefulIndicator<number, number | null> {
  assertPositiveInteger("period", period);

  let prevPrice: number | null = null;
  let avgGain = 0;
  let avgLoss = 0;
  let seedGain = 0;
  let seedLoss = 0;
  let seedCount = 0;
  let count = 0;

  return {
    next(price: number): number | null {
      if (!Number.isFinite(price)) {
        throw new Error("price must be a finite number");
      }

      count += 1;
      if (prevPrice === null) {
        prevPrice = price;
        return null;
      }

      const diff = price - prevPrice;
      prevPrice = price;

      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? -diff : 0;

      if (seedCount < period) {
        seedGain += gain;
        seedLoss += loss;
        seedCount += 1;
        if (seedCount < period) return null;
        avgGain = seedGain / period;
        avgLoss = seedLoss / period;
      } else {
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
      }

      if (count < period + 1) return null;
      if (avgLoss === 0) return 100;
      const rs = avgGain / avgLoss;
      return 100 - 100 / (1 + rs);
    },
    reset(): void {
      prevPrice = null;
      avgGain = 0;
      avgLoss = 0;
      seedGain = 0;
      seedLoss = 0;
      seedCount = 0;
      count = 0;
    }
  };
}

export function createMACD(
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): StatefulIndicator<number, MACDOutput> {
  assertPositiveInteger("fastPeriod", fastPeriod);
  assertPositiveInteger("slowPeriod", slowPeriod);
  assertPositiveInteger("signalPeriod", signalPeriod);
  if (fastPeriod >= slowPeriod) {
    throw new Error(`fast period (${fastPeriod}) must be less than slow period (${slowPeriod})`);
  }

  const fastEma = createEMA(fastPeriod);
  const slowEma = createEMA(slowPeriod);
  const signalEma = createEMA(signalPeriod);

  return {
    next(price: number): MACDOutput {
      if (!Number.isFinite(price)) {
        throw new Error("price must be a finite number");
      }

      const f = fastEma.next(price);
      const s = slowEma.next(price);

      let macdVal: number | null = null;
      if (f !== null && s !== null) {
        macdVal = f - s;
      }

      const sig = signalEma.next(macdVal === null ? 0 : macdVal);
      const hist = macdVal === null || sig === null ? null : macdVal - sig;

      return {
        macd: macdVal,
        signal: sig,
        histogram: hist
      };
    },
    reset(): void {
      fastEma.reset();
      slowEma.reset();
      signalEma.reset();
    }
  };
}

export function createATR(period = 14): StatefulIndicator<ATRInput, number | null> {
  assertPositiveInteger("period", period);

  let prevClose: number | null = null;
  let prevRma: number | null = null;
  let seedSum = 0;
  let seedCount = 0;

  return {
    next(candle: ATRInput): number | null {
      const h = "high" in candle ? candle.high : (candle as { h: number }).h;
      const l = "low" in candle ? candle.low : (candle as { l: number }).l;
      const c = "close" in candle ? candle.close : (candle as { c: number }).c;

      if (!Number.isFinite(h) || !Number.isFinite(l) || !Number.isFinite(c)) {
        throw new Error("high, low, and close must be finite numbers");
      }

      let tr: number;
      if (prevClose === null) {
        tr = h - l;
      } else {
        tr = Math.max(h - l, Math.abs(h - prevClose), Math.abs(l - prevClose));
      }
      prevClose = c;

      if (prevRma === null) {
        seedSum += tr;
        seedCount += 1;
        if (seedCount < period) {
          return null;
        }
        prevRma = seedSum / period;
        return prevRma;
      }

      prevRma = (prevRma * (period - 1) + tr) / period;
      return prevRma;
    },
    reset(): void {
      prevClose = null;
      prevRma = null;
      seedSum = 0;
      seedCount = 0;
    }
  };
}

export function createBBANDS(
  period = 20,
  stdMultiplier = 2
): StatefulIndicator<number, BBANDSOutput> {
  assertPositiveInteger("period", period);
  if (!Number.isFinite(stdMultiplier) || stdMultiplier < 0) {
    throw new Error("stdMultiplier must be a non-negative finite number");
  }

  const meanEngine = new RollingMean(period);
  const stdEngine = new RollingStdDev(period);

  return {
    next(price: number): BBANDSOutput {
      if (!Number.isFinite(price)) {
        throw new Error("price must be a finite number");
      }

      const basis = meanEngine.next(price);
      const stdDev = stdEngine.next(price);

      if (basis === null || stdDev === null) {
        return { basis: null, upper: null, lower: null };
      }

      return {
        basis,
        upper: basis + stdMultiplier * stdDev,
        lower: basis - stdMultiplier * stdDev
      };
    },
    reset(): void {
      meanEngine.reset();
      stdEngine.reset();
    }
  };
}

export function createVWAPSession(): StatefulIndicator<VWAPSessionInput, number | null> {
  let cumPV = 0;
  let cumV = 0;
  let lastSession: string | number | undefined;

  return {
    next(candle: VWAPSessionInput): number | null {
      const { high, low, close, volume, sessionId } = candle;
      if (!Number.isFinite(high) || !Number.isFinite(low) || !Number.isFinite(close) || !Number.isFinite(volume)) {
        throw new Error("high, low, close and volume must be finite numbers");
      }
      if (volume < 0) {
        throw new Error("volume must be a non-negative number (>= 0)");
      }

      if (lastSession !== sessionId) {
        cumPV = 0;
        cumV = 0;
        lastSession = sessionId;
      }

      const typical = (high + low + close) / 3;
      cumPV += typical * volume;
      cumV += volume;
      return cumV === 0 ? null : cumPV / cumV;
    },
    reset(): void {
      cumPV = 0;
      cumV = 0;
      lastSession = undefined;
    }
  };
}

export function createRealizedVolatility(
  length = 30,
  periodsPerYear = 365
): StatefulIndicator<number, number | null> {
  assertPositiveInteger("length", length);
  if (!Number.isFinite(periodsPerYear) || periodsPerYear <= 0) {
    throw new Error("periodsPerYear must be a positive number");
  }

  const factor = Math.sqrt(periodsPerYear);
  let prevPrice: number | null = null;
  const stdEngine = new RollingStdDev(length);

  return {
    next(price: number): number | null {
      if (!Number.isFinite(price)) {
        throw new Error("price must be a finite number");
      }
      if (price <= 0) {
        throw new Error(`price must be a positive number (> 0), got ${price}`);
      }

      if (prevPrice === null) {
        prevPrice = price;
        return null;
      }

      const ret = Math.log(price / prevPrice);
      prevPrice = price;

      const std = stdEngine.next(ret);
      return std === null ? null : std * factor;
    },
    reset(): void {
      prevPrice = null;
      stdEngine.reset();
    }
  };
}

export function createVolatilityRegime(
  length = 30,
  periodsPerYear = 365,
  lowZ = -0.5,
  highZ = 0.5
): StatefulIndicator<number, number | null> {
  assertPositiveInteger("length", length);
  if (!Number.isFinite(periodsPerYear) || periodsPerYear <= 0) {
    throw new Error("periodsPerYear must be a positive number");
  }

  const volEngine = createRealizedVolatility(length, periodsPerYear);
  const meanEngine = new RollingMean(length);
  const stdEngine = new RollingStdDev(length);
  let volCount = 0;

  return {
    next(price: number): number | null {
      const vol = volEngine.next(price);
      if (vol === null) {
        return null;
      }

      volCount += 1;
      // In batch volatilityRegime:
      // vol[length] is the 1st emitted volatility (at price index length).
      // The rolling window for volatility regime starts with values from vol[length + 1] to vol[length * 2].
      // So the very first emitted vol point (volCount === 1) is excluded from the regime window.
      if (volCount === 1) {
        return null;
      }

      const mean = meanEngine.next(vol);
      const s = stdEngine.next(vol);

      if (mean === null || s === null) {
        return null;
      }

      if (s <= 1e-12) {
        return 0;
      }

      const z = (vol - mean) / s;
      return classifyVolatilityRegime(z, lowZ, highZ);
    },
    reset(): void {
      volEngine.reset();
      meanEngine.reset();
      stdEngine.reset();
      volCount = 0;
    }
  };
}

export function createVolumeDelta(period = 14): StatefulIndicator<OrderflowInput, number | null> {
  assertPositiveInteger("period", period);

  const svSum = new RollingSum(period);

  return {
    next(candle: OrderflowInput): number | null {
      const o = "open" in candle ? candle.open : (candle as { o: number }).o;
      const c = "close" in candle ? candle.close : (candle as { c: number }).c;
      const v = "volume" in candle ? candle.volume : (candle as { v: number }).v;

      if (!Number.isFinite(o) || !Number.isFinite(c) || !Number.isFinite(v)) {
        throw new Error("open, close, and volume must be finite numbers");
      }
      if (v < 0) {
        throw new Error(`volume must be a non-negative number (>= 0), got ${v}`);
      }

      const diff = c - o;
      const sv = diff > 0 ? v : diff < 0 ? -v : 0;

      return svSum.next(sv);
    },
    reset(): void {
      svSum.reset();
    }
  };
}

export function createOrderflowImbalance(period = 14): StatefulIndicator<OrderflowInput, number | null> {
  assertPositiveInteger("period", period);

  const svSum = new RollingSum(period);
  const vSum = new RollingSum(period);

  return {
    next(candle: OrderflowInput): number | null {
      const o = "open" in candle ? candle.open : (candle as { o: number }).o;
      const c = "close" in candle ? candle.close : (candle as { c: number }).c;
      const v = "volume" in candle ? candle.volume : (candle as { v: number }).v;

      if (!Number.isFinite(o) || !Number.isFinite(c) || !Number.isFinite(v)) {
        throw new Error("open, close, and volume must be finite numbers");
      }
      if (v < 0) {
        throw new Error(`volume must be a non-negative number (>= 0), got ${v}`);
      }

      const diff = c - o;
      const sv = diff > 0 ? v : diff < 0 ? -v : 0;

      const signedTotal = svSum.next(sv);
      const volumeTotal = vSum.next(v);

      if (signedTotal === null || volumeTotal === null) {
        return null;
      }

      return volumeTotal === 0 ? null : signedTotal / volumeTotal;
    },
    reset(): void {
      svSum.reset();
      vSum.reset();
    }
  };
}
