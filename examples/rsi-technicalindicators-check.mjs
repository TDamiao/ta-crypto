import { RSI } from "technicalindicators";
import { rsi } from "../dist/index.js";

const close = Array.from({ length: 240 }, (_, i) => 100 + i * 0.04 + Math.sin(i / 9) * 1.2 + Math.cos(i / 17) * 0.7);
const ours = rsi(close, 14);

const padFront = (values, totalLength) =>
  Array.from({ length: totalLength - values.length }, () => null).concat(values);

const ref = padFront(RSI.calculate({ period: 14, values: close }), close.length);

let maxDiff = 0;
for (let i = 28; i < ours.length; i++) {
  if (ours[i] === null || ref[i] === null) continue;
  const diff = Math.abs(ours[i] - ref[i]);
  if (diff > maxDiff) maxDiff = diff;
}

const tolerance = 5e-2;
const ok = maxDiff <= tolerance;

console.log(`RSI(14) maxDiff vs technicalindicators: ${maxDiff}`);
console.log(`Tolerance: ${tolerance}`);
console.log(`Result: ${ok ? "PASS" : "FAIL"}`);

if (!ok) process.exit(1);
