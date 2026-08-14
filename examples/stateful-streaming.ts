import {
  createMACD,
  createATR,
  createBBANDS,
  createRealizedVolatility,
  createVolatilityRegime,
  createVolumeDelta,
  createOrderflowImbalance,
  CandleObject
} from "../dist/index.js";

// Initialize streaming indicators
const macd = createMACD(12, 26, 9);
const atr = createATR(14);
const bbands = createBBANDS(20, 2);
const realizedVol = createRealizedVolatility(10, 365);
const regime = createVolatilityRegime(10, 365, -0.5, 0.5);
const volDelta = createVolumeDelta(5);
const ofi = createOrderflowImbalance(5);

// Stream simulated live candles
const liveCandles: CandleObject[] = [
  { open: 100, high: 102, low: 99, close: 101, volume: 50 },
  { open: 101, high: 104, low: 100, close: 103, volume: 80 },
  { open: 103, high: 106, low: 102, close: 105, volume: 120 },
  { open: 105, high: 107, low: 104, close: 104, volume: 90 },
  { open: 104, high: 105, low: 101, close: 102, volume: 110 },
  { open: 102, high: 105, low: 101, close: 104, volume: 75 }
];

console.log("Streaming updates on incoming live candles:\n");

for (let i = 0; i < liveCandles.length; i++) {
  const candle = liveCandles[i];

  const m = macd.next(candle.close);
  const a = atr.next(candle as { high: number; low: number; close: number });
  const bb = bbands.next(candle.close);
  const rv = realizedVol.next(candle.close);
  const vr = regime.next(candle.close);
  const vd = volDelta.next(candle as { open: number; close: number; volume: number });
  const of = ofi.next(candle as { open: number; close: number; volume: number });

  console.log(`[Bar ${i + 1}] Close: ${candle.close.toFixed(2)} | Vol: ${candle.volume ?? 0}`);
  console.log(`  Volume Delta (5): ${vd !== null ? vd.toFixed(2) : "warmup"}`);
  console.log(`  Orderflow Imbalance (5): ${of !== null ? (of * 100).toFixed(1) + "%" : "warmup"}`);
  console.log(`  ATR (14): ${a !== null ? a.toFixed(4) : "warmup"}`);
  console.log(`  BBANDS (20,2) Basis: ${bb.basis !== null ? bb.basis.toFixed(2) : "warmup"}`);
  console.log(`  MACD Line: ${m.macd !== null ? m.macd.toFixed(4) : "warmup"}`);
  console.log(`  Realized Vol (10): ${rv !== null ? (rv * 100).toFixed(2) + "%" : "warmup"}`);
  console.log(`  Volatility Regime: ${vr !== null ? vr : "warmup"}\n`);
}

// Reset demonstration
console.log("Resetting indicators to pristine initial state...");
macd.reset();
atr.reset();
bbands.reset();
volDelta.reset();
console.log("Indicators successfully reset.");
