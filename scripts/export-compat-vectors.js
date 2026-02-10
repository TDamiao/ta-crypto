import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { sma, ema, rsi, macd, bbands, atr, adx } from "../dist/index.js";

function buildInput(length = 320) {
  const open = [];
  const high = [];
  const low = [];
  const close = [];
  const volume = [];

  for (let i = 0; i < length; i++) {
    const c = 100 + i * 0.05 + 2 * Math.sin(i / 7) + 1.2 * Math.cos(i / 13);
    const o = c - 0.35 * Math.cos(i / 5);
    const h = Math.max(o, c) + 0.55 + 0.2 * Math.sin(i / 3);
    const l = Math.min(o, c) - 0.55 - 0.2 * Math.cos(i / 4);
    const v = 1000 + (i % 20) * 25 + 50 * Math.sin(i / 5);

    open.push(o);
    high.push(h);
    low.push(l);
    close.push(c);
    volume.push(v);
  }

  return { open, high, low, close, volume };
}

const input = buildInput();
const ours = {
  sma14: sma(input.close, 14),
  ema14: ema(input.close, 14),
  rsi14: rsi(input.close, 14),
  macd: macd(input.close, 12, 26, 9),
  bbands20_2: bbands(input.close, 20, 2),
  atr14: atr(input.high, input.low, input.close, 14),
  adx14: adx(input.high, input.low, input.close, 14)
};

const payload = {
  meta: {
    length: input.close.length,
    generatedAt: new Date().toISOString()
  },
  input,
  ours
};

const out = resolve(process.cwd(), "test/fixtures/compat-current.json");
writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${out}`);
