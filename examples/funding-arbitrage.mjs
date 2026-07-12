import { fundingRateAPR, fundingRateCumulative } from "../dist/index.js";

const funding = [0.0001, 0.0002, -0.00005, 0.00015, 0.00008, -0.00002];
const periodsPerYear = 1095;

const cumulative = fundingRateCumulative(funding);
const apr = fundingRateAPR(funding, periodsPerYear);

console.log("Funding series:", funding);
console.log("Cumulative funding:", cumulative);
console.log("Annualized funding APR (%):", apr);
console.log("Expected: cumulative is running sum; APR scales each point by periodsPerYear * 100.");
