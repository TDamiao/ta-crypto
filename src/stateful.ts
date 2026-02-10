export type StatefulIndicator<TIn, TOut> = {
  next(value: TIn): TOut;
  reset(): void;
};

export function createRSI(period = 14): StatefulIndicator<number, number | null> {
  if (period <= 0) {
    throw new Error("period must be > 0");
  }

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

export type VWAPSessionInput = {
  high: number;
  low: number;
  close: number;
  volume: number;
  sessionId: string | number;
};

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
