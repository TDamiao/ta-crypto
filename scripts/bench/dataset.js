import { createRNG, DEFAULT_BENCH_SEED } from "./prng.js";

export const BENCH_SIZES = {
  RECOMPUTE_SMALL: 2000,
  RECOMPUTE_MED: 5000,
  STANDARD_10K: 10000,
  LARGE_100K: 100000
};

/**
 * Generates a deterministic market dataset with realistic crypto price action
 * and rigorous financial domain validity (positive prices, valid OHLC relationships, non-negative volume).
 *
 * @param {object} [options]
 * @param {number} [options.size=10000] Number of candles/data points
 * @param {number} [options.seed=DEFAULT_BENCH_SEED] PRNG seed
 * @param {number} [options.basePrice=100.0] Initial base price
 * @returns {{ open: number[], high: number[], low: number[], close: number[], volume: number[], candles: Array<{ open: number, high: number, low: number, close: number, volume: number }> }}
 */
export function generateDeterministicDataset(options = {}) {
  const size = Math.max(1, Math.floor(options.size ?? BENCH_SIZES.STANDARD_10K));
  const seed = options.seed ?? DEFAULT_BENCH_SEED;
  const basePrice = options.basePrice ?? 100.0;

  const rng = createRNG(seed);

  const open = new Array(size);
  const high = new Array(size);
  const low = new Array(size);
  const close = new Array(size);
  const volume = new Array(size);
  const candles = new Array(size);

  let currentPrice = basePrice;

  for (let i = 0; i < size; i++) {
    const o = i === 0 ? basePrice : currentPrice;

    // Geometric step with periodic trend, cycles, and stochastic noise
    const cycle = Math.sin(i * 0.015) * 0.004 + Math.cos(i * 0.003) * 0.002;
    const noise = (rng() - 0.499) * 0.025;
    const returnStep = cycle + noise;

    // Ensure price stays strictly positive (> 1.0)
    const c = Math.max(1.0, o * Math.exp(returnStep));
    currentPrice = c;

    const candleMax = Math.max(o, c);
    const candleMin = Math.min(o, c);

    // High extends above candle body, Low extends below candle body
    const upperWick = rng() * (candleMax * 0.008) + 0.02;
    const lowerWick = rng() * (candleMin * 0.008) + 0.02;

    const h = candleMax + upperWick;
    const l = Math.max(0.01, candleMin - lowerWick);

    // Volume with occasional volume spikes
    const isSpike = (i % 25 === 0);
    const v = 20.0 + rng() * 150.0 + (isSpike ? rng() * 400.0 : 0.0);

    open[i] = o;
    high[i] = h;
    low[i] = l;
    close[i] = c;
    volume[i] = v;

    candles[i] = { open: o, high: h, low: l, close: c, volume: v };
  }

  return { open, high, low, close, volume, candles };
}

// In-memory cache for repeated standard sizes with default seed
const datasetCache = new Map();

/**
 * Returns a cached or newly generated deterministic dataset.
 * @param {number} size
 * @param {number} [seed=DEFAULT_BENCH_SEED]
 * @returns {ReturnType<typeof generateDeterministicDataset>}
 */
export function getDataset(size, seed = DEFAULT_BENCH_SEED) {
  const key = `${size}_${seed}`;
  if (!datasetCache.has(key)) {
    datasetCache.set(key, generateDeterministicDataset({ size, seed }));
  }
  return datasetCache.get(key);
}
