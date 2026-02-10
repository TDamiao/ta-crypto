import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SMA, EMA, RSI, MACD, BollingerBands, ATR, ADX } from "technicalindicators";

const compat = JSON.parse(readFileSync(resolve(process.cwd(), "test/fixtures/compat-current.json"), "utf8"));
const { close, high, low } = compat.input;
const ours = compat.ours;
const len = close.length;

const toleranceByIndicator = {
  sma: 1e-10,
  ema: 1e-10,
  rsi: 5e-2,
  macd: 2e-2,
  bbands: 1e-10,
  atr: 1.5e-1,
  adx: 1.5
};

const burnInByIndicator = {
  sma: 14,
  ema: 14,
  rsi: 28,
  macd: 80,
  bbands: 20,
  atr: 56,
  adx: 90
};

let failures = 0;

function padFront(values, totalLength) {
  if (values.length > totalLength) return values.slice(values.length - totalLength);
  return Array.from({ length: totalLength - values.length }, () => null).concat(values);
}

function compareSeries(name, oursSeries, theirsSeries, tol, burnIn) {
  let count = 0;
  let maxDiff = 0;

  for (let i = burnIn; i < oursSeries.length; i++) {
    const a = oursSeries[i];
    const b = theirsSeries[i];
    if (a === null || b === null || b === undefined) continue;
    const diff = Math.abs(a - b);
    if (diff > maxDiff) maxDiff = diff;
    count += 1;
  }

  if (count === 0) {
    failures += 1;
    console.error(`[compat][technicalindicators] ${name}: no overlapping points after burn-in=${burnIn}`);
    return;
  }

  if (maxDiff > tol) {
    failures += 1;
    console.error(`[compat][technicalindicators] ${name}: FAIL (maxDiff=${maxDiff}, tol=${tol}, points=${count})`);
    return;
  }

  console.log(`[compat][technicalindicators] ${name}: OK (maxDiff=${maxDiff}, points=${count})`);
}

compareSeries(
  "SMA(14)",
  ours.sma14,
  padFront(SMA.calculate({ period: 14, values: close }), len),
  toleranceByIndicator.sma,
  burnInByIndicator.sma
);

compareSeries(
  "EMA(14)",
  ours.ema14,
  padFront(EMA.calculate({ period: 14, values: close }), len),
  toleranceByIndicator.ema,
  burnInByIndicator.ema
);

compareSeries(
  "RSI(14)",
  ours.rsi14,
  padFront(RSI.calculate({ period: 14, values: close }), len),
  toleranceByIndicator.rsi,
  burnInByIndicator.rsi
);

const macdRaw = MACD.calculate({
  values: close,
  fastPeriod: 12,
  slowPeriod: 26,
  signalPeriod: 9,
  SimpleMAOscillator: false,
  SimpleMASignal: false
});
compareSeries("MACD line", ours.macd.macd, padFront(macdRaw.map(v => v.MACD), len), toleranceByIndicator.macd, burnInByIndicator.macd);
compareSeries("MACD signal", ours.macd.signal, padFront(macdRaw.map(v => v.signal), len), toleranceByIndicator.macd, burnInByIndicator.macd);
compareSeries("MACD histogram", ours.macd.histogram, padFront(macdRaw.map(v => v.histogram), len), toleranceByIndicator.macd, burnInByIndicator.macd);

const bbRaw = BollingerBands.calculate({ values: close, period: 20, stdDev: 2 });
compareSeries("BBANDS basis", ours.bbands20_2.basis, padFront(bbRaw.map(v => v.middle), len), toleranceByIndicator.bbands, burnInByIndicator.bbands);
compareSeries("BBANDS upper", ours.bbands20_2.upper, padFront(bbRaw.map(v => v.upper), len), toleranceByIndicator.bbands, burnInByIndicator.bbands);
compareSeries("BBANDS lower", ours.bbands20_2.lower, padFront(bbRaw.map(v => v.lower), len), toleranceByIndicator.bbands, burnInByIndicator.bbands);

compareSeries(
  "ATR(14)",
  ours.atr14,
  padFront(ATR.calculate({ high, low, close, period: 14 }), len),
  toleranceByIndicator.atr,
  burnInByIndicator.atr
);

const adxRaw = ADX.calculate({ high, low, close, period: 14 });
compareSeries("ADX(14)", ours.adx14.adx, padFront(adxRaw.map(v => v.adx), len), toleranceByIndicator.adx, burnInByIndicator.adx);
compareSeries("+DI(14)", ours.adx14.plusDI, padFront(adxRaw.map(v => v.pdi), len), toleranceByIndicator.adx, burnInByIndicator.adx);
compareSeries("-DI(14)", ours.adx14.minusDI, padFront(adxRaw.map(v => v.mdi), len), toleranceByIndicator.adx, burnInByIndicator.adx);

if (failures > 0) {
  console.error(`[compat][technicalindicators] completed with ${failures} failure(s)`);
  process.exit(1);
}

console.log("[compat][technicalindicators] all comparisons passed");
