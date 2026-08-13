import { logReturn, percentReturn, sumPeriodicReturns } from "../dist/index.js";

const prices: number[] = [100, 110, 121];

const periodic = percentReturn(prices);
const compound = percentReturn(prices, { cumulative: true });
const arithmeticSum = sumPeriodicReturns(prices);
const logReturns = logReturn(prices, true);

console.log("Prices:", prices);
console.log("Periodic returns (10%, 10%):", periodic);
console.log("Compounded cumulative return (21%):", compound);
console.log("Arithmetic sum of returns (20%):", arithmeticSum);
console.log("Cumulative log return:", logReturns);
console.log("Expected: for [100, 110, 121], periodic is 10%/10%, compounded cumulative is 21%, arithmetic sum is 20%.");
