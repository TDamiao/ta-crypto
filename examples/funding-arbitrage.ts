import { fundingRateAPR, fundingRateCumulative } from "ta-crypto";

// Example: 8h funding rates from an exchange (decimal form).
const funding = [0.0001, 0.0002, -0.00005, 0.00015, 0.00008, -0.00002];
const periodsPerYear = 1095; // 3 funding periods/day

const cumulative = fundingRateCumulative(funding);
const apr = fundingRateAPR(funding, periodsPerYear);

console.log("Funding series:", funding);
console.log("Cumulative funding:", cumulative);
console.log("Annualized funding APR (%):", apr);
