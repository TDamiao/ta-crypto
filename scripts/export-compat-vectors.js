import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  sma,
  ema,
  rsi,
  macd,
  bbands,
  atr,
  natr,
  adx,
  obv,
  mfi,
  stoch
} from "../dist/index.js";

function buildScenarioCycle(length = 320) {
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

function buildScenarioTrend(length = 320) {
  const open = [];
  const high = [];
  const low = [];
  const close = [];
  const volume = [];

  let price = 50;
  for (let i = 0; i < length; i++) {
    const drift = 0.2 + 0.1 * Math.sin(i * 0.05);
    const noise = 0.1 * Math.cos(i * 0.3);
    price = price * (1 + (drift + noise) * 0.01);
    const o = price - 0.2;
    const h = price + 0.6;
    const l = price - 0.5;
    const c = price;
    const v = 500 + i * 10 + 20 * Math.sin(i);

    open.push(o);
    high.push(h);
    low.push(l);
    close.push(c);
    volume.push(v);
  }

  return { open, high, low, close, volume };
}

function buildScenarioChop(length = 320) {
  const open = [];
  const high = [];
  const low = [];
  const close = [];
  const volume = [];

  for (let i = 0; i < length; i++) {
    const c = 100 + 3 * Math.sin(i * 0.8) + 1.5 * Math.cos(i * 1.7);
    const o = 100 + 3 * Math.sin((i - 0.5) * 0.8);
    const h = Math.max(o, c) + 0.8;
    const l = Math.min(o, c) - 0.8;
    const v = 800 + 200 * Math.abs(Math.sin(i * 0.5));

    open.push(o);
    high.push(h);
    low.push(l);
    close.push(c);
    volume.push(v);
  }

  return { open, high, low, close, volume };
}

function buildScenarioVolatile(length = 320) {
  const open = [];
  const high = [];
  const low = [];
  const close = [];
  const volume = [];

  let price = 100;
  for (let i = 0; i < length; i++) {
    const jump = (i % 17 === 0 ? 5 : 0) * (i % 2 === 0 ? 1 : -1);
    const wave = 4 * Math.sin(i * 0.25);
    price = Math.max(10, price + wave * 0.2 + jump * 0.3);
    const o = price - (i % 5 === 0 ? 2 : -1.5);
    const h = Math.max(o, price) + 2.5;
    const l = Math.min(o, price) - 2.5;
    const c = price;
    const v = (i % 17 === 0 ? 5000 : 1200) + 300 * Math.sin(i * 0.1);

    open.push(o);
    high.push(h);
    low.push(l);
    close.push(c);
    volume.push(v);
  }

  return { open, high, low, close, volume };
}

function computeIndicators(inp) {
  return {
    sma14: sma(inp.close, 14),
    ema14: ema(inp.close, 14),
    rsi14: rsi(inp.close, 14),
    macd: macd(inp.close, 12, 26, 9),
    bbands20_2: bbands(inp.close, 20, 2),
    atr14: atr(inp.high, inp.low, inp.close, 14),
    natr14: natr(inp.high, inp.low, inp.close, 14),
    adx14: adx(inp.high, inp.low, inp.close, 14),
    obv: obv(inp.close, inp.volume),
    mfi14: mfi(inp.high, inp.low, inp.close, inp.volume, 14),
    stoch14_3: stoch(inp.high, inp.low, inp.close, 14, 3)
  };
}

const scenarios = {
  cycle: buildScenarioCycle(320),
  trend: buildScenarioTrend(320),
  chop: buildScenarioChop(320),
  volatile: buildScenarioVolatile(320)
};

const results = {};
for (const [name, data] of Object.entries(scenarios)) {
  results[name] = {
    input: data,
    ours: computeIndicators(data)
  };
}

// Backward compatibility: export default "input" and "ours" pointing to cycle scenario
const payload = {
  meta: {
    scenarios: Object.keys(scenarios),
    length: scenarios.cycle.close.length,
    generatedAt: new Date().toISOString(),
    compatPolicy: JSON.parse(readFileSync(resolve(process.cwd(), "scripts/compat-policy.json"), "utf8"))
  },
  input: scenarios.cycle,
  ours: results.cycle.ours,
  scenarios: results
};

const out = resolve(process.cwd(), "test/fixtures/compat-current.json");
writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${out} with ${Object.keys(scenarios).length} deterministic market scenarios`);
