import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  SMA,
  EMA,
  RSI,
  MACD,
  BollingerBands,
  ATR,
  ADX,
  OBV,
  MFI,
  Stochastic
} from "technicalindicators";

const compat = JSON.parse(readFileSync(resolve(process.cwd(), "test/fixtures/compat-current.json"), "utf8"));
const policy = JSON.parse(readFileSync(resolve(process.cwd(), "scripts/compat-policy.json"), "utf8"));

const toleranceByIndicator = Object.fromEntries(
  Object.entries(policy.indicators).map(([key, value]) => [key, value.tolerance])
);

const burnInByIndicator = Object.fromEntries(
  Object.entries(policy.indicators).map(([key, value]) => [key, value.burnIn])
);

let failures = 0;

function padFront(values, totalLength) {
  if (!values) return new Array(totalLength).fill(null);
  if (values.length > totalLength) return values.slice(values.length - totalLength);
  return Array.from({ length: totalLength - values.length }, () => null).concat(values);
}

function compareSeries(scenarioName, indicatorName, oursSeries, theirsSeries, tol, burnIn) {
  let count = 0;
  let maxDiff = 0;
  let firstFailIndex = -1;
  let actualAtFail = null;
  let refAtFail = null;

  for (let i = burnIn; i < oursSeries.length; i++) {
    const a = oursSeries[i];
    const b = theirsSeries[i];
    if (a === null || b === null || b === undefined) continue;
    const diff = Math.abs(a - b);
    if (diff > maxDiff) maxDiff = diff;
    if (diff > tol && firstFailIndex === -1) {
      firstFailIndex = i;
      actualAtFail = a;
      refAtFail = b;
    }
    count += 1;
  }

  if (count === 0) {
    failures += 1;
    console.error(`[compat][technicalindicators][${scenarioName}] ${indicatorName}: FAIL (no overlapping points after burn-in=${burnIn})`);
    return;
  }

  if (maxDiff > tol) {
    failures += 1;
    console.error(
      `[compat][technicalindicators][${scenarioName}] ${indicatorName}: FAIL ` +
      `(maxDiff=${maxDiff}, tol=${tol}, points=${count}, firstFailIndex=${firstFailIndex}, ` +
      `actual=${actualAtFail}, ref=${refAtFail})`
    );
    return;
  }

  console.log(`[compat][technicalindicators][${scenarioName}] ${indicatorName}: OK (maxDiff=${maxDiff}, points=${count})`);
}

const scenarioKeys = compat.meta?.scenarios || ["cycle"];

for (const scenarioKey of scenarioKeys) {
  const scenarioData = compat.scenarios ? compat.scenarios[scenarioKey] : { input: compat.input, ours: compat.ours };
  const { open, high, low, close, volume } = scenarioData.input;
  const ours = scenarioData.ours;
  const len = close.length;

  console.log(`\n--- Validating scenario: ${scenarioKey} (${len} bars) ---`);

  // 1. SMA(14)
  compareSeries(
    scenarioKey,
    "SMA(14)",
    ours.sma14,
    padFront(SMA.calculate({ period: 14, values: close }), len),
    toleranceByIndicator.sma,
    burnInByIndicator.sma
  );

  // 2. EMA(14)
  compareSeries(
    scenarioKey,
    "EMA(14)",
    ours.ema14,
    padFront(EMA.calculate({ period: 14, values: close }), len),
    toleranceByIndicator.ema,
    burnInByIndicator.ema
  );

  // 3. RSI(14)
  compareSeries(
    scenarioKey,
    "RSI(14)",
    ours.rsi14,
    padFront(RSI.calculate({ period: 14, values: close }), len),
    toleranceByIndicator.rsi,
    burnInByIndicator.rsi
  );

  // 4. MACD(12, 26, 9)
  const macdRaw = MACD.calculate({
    values: close,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false
  });
  compareSeries(scenarioKey, "MACD line", ours.macd.macd, padFront(macdRaw.map(v => v.MACD), len), toleranceByIndicator.macd, burnInByIndicator.macd);
  compareSeries(scenarioKey, "MACD signal", ours.macd.signal, padFront(macdRaw.map(v => v.signal), len), toleranceByIndicator.macd, burnInByIndicator.macd);
  compareSeries(scenarioKey, "MACD histogram", ours.macd.histogram, padFront(macdRaw.map(v => v.histogram), len), toleranceByIndicator.macd, burnInByIndicator.macd);

  // 5. BBANDS(20, 2)
  const bbRaw = BollingerBands.calculate({ values: close, period: 20, stdDev: 2 });
  compareSeries(scenarioKey, "BBANDS basis", ours.bbands20_2.basis, padFront(bbRaw.map(v => v.middle), len), toleranceByIndicator.bbands, burnInByIndicator.bbands);
  compareSeries(scenarioKey, "BBANDS upper", ours.bbands20_2.upper, padFront(bbRaw.map(v => v.upper), len), toleranceByIndicator.bbands, burnInByIndicator.bbands);
  compareSeries(scenarioKey, "BBANDS lower", ours.bbands20_2.lower, padFront(bbRaw.map(v => v.lower), len), toleranceByIndicator.bbands, burnInByIndicator.bbands);

  // 6. ATR(14)
  compareSeries(
    scenarioKey,
    "ATR(14)",
    ours.atr14,
    padFront(ATR.calculate({ high, low, close, period: 14 }), len),
    toleranceByIndicator.atr,
    burnInByIndicator.atr
  );

  // 7. ADX(14)
  const adxRaw = ADX.calculate({ high, low, close, period: 14 });
  compareSeries(scenarioKey, "ADX(14)", ours.adx14.adx, padFront(adxRaw.map(v => v.adx), len), toleranceByIndicator.adx, burnInByIndicator.adx);
  compareSeries(scenarioKey, "+DI(14)", ours.adx14.plusDI, padFront(adxRaw.map(v => v.pdi), len), toleranceByIndicator.adx, burnInByIndicator.adx);
  compareSeries(scenarioKey, "-DI(14)", ours.adx14.minusDI, padFront(adxRaw.map(v => v.mdi), len), toleranceByIndicator.adx, burnInByIndicator.adx);

  // 8. OBV
  const obvRaw = OBV.calculate({ close, volume });
  compareSeries(
    scenarioKey,
    "OBV",
    ours.obv,
    padFront(obvRaw, len),
    toleranceByIndicator.obv,
    burnInByIndicator.obv
  );

  // 9. MFI(14)
  const mfiRaw = MFI.calculate({ high, low, close, volume, period: 14 });
  compareSeries(
    scenarioKey,
    "MFI(14)",
    ours.mfi14,
    padFront(mfiRaw, len),
    toleranceByIndicator.mfi,
    burnInByIndicator.mfi
  );

  // 10. Stochastic(14, 3)
  const stochRaw = Stochastic.calculate({ high, low, close, period: 14, signalPeriod: 3 });
  compareSeries(
    scenarioKey,
    "Stoch %K",
    ours.stoch14_3.k,
    padFront(stochRaw.map(v => v.k), len),
    toleranceByIndicator.stoch,
    burnInByIndicator.stoch
  );
  compareSeries(
    scenarioKey,
    "Stoch %D",
    ours.stoch14_3.d,
    padFront(stochRaw.map(v => v.d), len),
    toleranceByIndicator.stoch,
    burnInByIndicator.stoch
  );
}

if (failures > 0) {
  console.error(`\n[compat][technicalindicators] completed with ${failures} failure(s)`);
  process.exit(1);
}

console.log("\n[compat][technicalindicators] all multi-scenario comparisons passed");
