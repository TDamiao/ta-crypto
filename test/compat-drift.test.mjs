import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildCompatPayload } from "../scripts/compat-payload.js";

test("compat policy and in-memory generated vectors are valid and complete", () => {
  const policyPath = resolve(process.cwd(), "scripts/compat-policy.json");
  const policy = JSON.parse(readFileSync(policyPath, "utf8"));

  // Check policy schema
  assert.ok(policy.version, "policy must define version");
  assert.ok(policy.indicators, "policy must define indicators");
  assert.ok(policy.rules, "policy must define rules");
  assert.ok(Array.isArray(policy.goldenOnlyIndicators), "policy must list goldenOnlyIndicators");

  // Construct payload in memory from code (does NOT require disk file)
  const compat = buildCompatPayload(policy);

  assert.deepEqual(
    compat.meta.compatPolicy,
    policy,
    "compat payload meta.compatPolicy does not match scripts/compat-policy.json"
  );

  const expectedScenarios = ["cycle", "trend", "chop", "volatile"];
  assert.deepEqual(
    compat.meta.scenarios.sort(),
    expectedScenarios.sort(),
    "compat payload must contain all 4 deterministic market scenarios"
  );

  for (const scenario of expectedScenarios) {
    assert.ok(compat.scenarios[scenario], `scenario ${scenario} missing in compat payload`);
    const scData = compat.scenarios[scenario];
    assert.equal(scData.input.close.length, 320, `scenario ${scenario} close length mismatch`);
    assert.equal(scData.input.high.length, 320, `scenario ${scenario} high length mismatch`);
    assert.equal(scData.input.low.length, 320, `scenario ${scenario} low length mismatch`);
    assert.equal(scData.input.volume.length, 320, `scenario ${scenario} volume length mismatch`);

    const ours = scData.ours;
    assert.ok(Array.isArray(ours.sma14), `sma14 missing in scenario ${scenario}`);
    assert.ok(Array.isArray(ours.ema14), `ema14 missing in scenario ${scenario}`);
    assert.ok(Array.isArray(ours.rsi14), `rsi14 missing in scenario ${scenario}`);
    assert.ok(ours.macd && Array.isArray(ours.macd.macd), `macd missing in scenario ${scenario}`);
    assert.ok(ours.bbands20_2 && Array.isArray(ours.bbands20_2.basis), `bbands missing in scenario ${scenario}`);
    assert.ok(Array.isArray(ours.atr14), `atr14 missing in scenario ${scenario}`);
    assert.ok(Array.isArray(ours.natr14), `natr14 missing in scenario ${scenario}`);
    assert.ok(ours.adx14 && Array.isArray(ours.adx14.adx), `adx14 missing in scenario ${scenario}`);
    assert.ok(Array.isArray(ours.obv), `obv missing in scenario ${scenario}`);
    assert.ok(Array.isArray(ours.mfi14), `mfi14 missing in scenario ${scenario}`);
    assert.ok(ours.stoch14_3 && Array.isArray(ours.stoch14_3.k), `stoch14_3 missing in scenario ${scenario}`);
  }
});

test("compat-current.json on disk matches in-memory generated payload when present", () => {
  const compatPath = resolve(process.cwd(), "test/fixtures/compat-current.json");
  if (!existsSync(compatPath)) {
    // Clean clone condition: file is optional before npm run generate:compat
    return;
  }

  const diskPayload = JSON.parse(readFileSync(compatPath, "utf8"));
  const memPayload = buildCompatPayload();

  // Compare structural keys and data (excluding generatedAt timestamp)
  assert.deepEqual(diskPayload.meta.scenarios, memPayload.meta.scenarios);
  assert.deepEqual(diskPayload.meta.compatPolicy, memPayload.meta.compatPolicy);
  assert.deepEqual(diskPayload.input, memPayload.input);
  assert.deepEqual(diskPayload.ours, memPayload.ours);
  assert.deepEqual(diskPayload.scenarios, memPayload.scenarios);
});

test("OBV trajectory rebase and delta comparison detects real increment divergence", () => {
  // ta-crypto style: obv starts at 0
  const taCryptoOBV = [0, 100, 250, 150, 300];
  // TA-Lib style: obv starts at volume[0] (e.g. 500), but identical increments
  const talibEquivalentOBV = [500, 600, 750, 650, 800];

  // When rebased at index 0 (or burnIn):
  const rebasedOurs = taCryptoOBV.map(v => v - taCryptoOBV[0]);
  const rebasedTalib = talibEquivalentOBV.map(v => v - talibEquivalentOBV[0]);
  assert.deepEqual(rebasedOurs, rebasedTalib, "rebased OBV trajectories must be identical");

  // Adversarial: a series with a real divergent increment at index 3 (+50 instead of -100)
  const divergentOBV = [500, 600, 750, 800, 950];
  const rebasedDivergent = divergentOBV.map(v => v - divergentOBV[0]);
  const maxDiff = Math.max(...rebasedOurs.map((v, i) => Math.abs(v - rebasedDivergent[i])));
  assert.ok(maxDiff > 0, "divergent trajectory must produce non-zero difference");
  assert.equal(maxDiff, 150, "divergence magnitude must match the erroneous delta");
});
