/**
 * Seeded PRNG based on Mulberry32 algorithm.
 * Deterministic, fast, 32-bit state, zero dependencies.
 */

export const DEFAULT_BENCH_SEED = 0x43525950; // "CRYP" (1129466192)

/**
 * Creates a deterministic pseudorandom number generator function returning [0, 1).
 * @param {number} [seed=DEFAULT_BENCH_SEED] 32-bit unsigned integer seed
 * @returns {() => number}
 */
export function createRNG(seed = DEFAULT_BENCH_SEED) {
  let s = (Number(seed) >>> 0) || DEFAULT_BENCH_SEED;
  return function next() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
