import { rsi } from "ta-crypto";

const close = [
  100, 101, 102, 100, 98, 97, 99, 101, 103, 104, 103, 102, 101, 99, 98, 97, 99, 102, 104, 105
];

const rsi14 = rsi(close, 14);

const signals = rsi14.map((value, index) => {
  if (value === null) return { index, close: close[index], rsi: null, signal: "warmup" };
  if (value < 30) return { index, close: close[index], rsi: value, signal: "buy" };
  if (value > 70) return { index, close: close[index], rsi: value, signal: "sell" };
  return { index, close: close[index], rsi: value, signal: "hold" };
});

console.table(signals);
