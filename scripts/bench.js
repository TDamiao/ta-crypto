import { performance } from "node:perf_hooks";
import { sma, ema, rsi, macd, bbands, atr, adx } from "../dist/index.js";

function makeSeries(length, start = 100) {
  const out = new Array(length);
  let v = start;
  for (let i = 0; i < length; i++) {
    v += (Math.random() - 0.5) * 2;
    out[i] = v;
  }
  return out;
}

function run(name, fn, runs = 50) {
  const t0 = performance.now();
  for (let i = 0; i < runs; i++) fn();
  const t1 = performance.now();
  const ms = (t1 - t0) / runs;
  console.log(`${name.padEnd(12)} ${ms.toFixed(3)} ms/run`);
}

const n = 10_000;
const close = makeSeries(n);
const high = close.map(v => v + Math.random() * 1.5);
const low = close.map(v => v - Math.random() * 1.5);
const volume = close.map(() => 10 + Math.random() * 90);

console.log(`Benchmark on ${n} candles`);
run("sma(14)", () => sma(close, 14));
run("ema(14)", () => ema(close, 14));
run("rsi(14)", () => rsi(close, 14));
run("macd", () => macd(close));
run("bbands", () => bbands(close, 20, 2));
run("atr(14)", () => atr(high, low, close, 14));
run("adx(14)", () => adx(high, low, close, 14));
run("vwap", () => {
  let cumPV = 0;
  let cumV = 0;
  for (let i = 0; i < n; i++) {
    cumPV += ((high[i] + low[i] + close[i]) / 3) * volume[i];
    cumV += volume[i];
  }
  return cumPV / cumV;
});
