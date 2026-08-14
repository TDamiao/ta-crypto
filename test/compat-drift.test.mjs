import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("compat policy and exported vectors are synchronized without drift", () => {
  const policyPath = resolve(process.cwd(), "scripts/compat-policy.json");
  const compatPath = resolve(process.cwd(), "test/fixtures/compat-current.json");

  const policy = JSON.parse(readFileSync(policyPath, "utf8"));
  const compat = JSON.parse(readFileSync(compatPath, "utf8"));

  // Check policy schema
  assert.ok(policy.version, "policy must define version");
  assert.ok(policy.indicators, "policy must define indicators");
  assert.ok(policy.rules, "policy must define rules");
  assert.ok(Array.isArray(policy.goldenOnlyIndicators), "policy must list goldenOnlyIndicators");

  // Check embedded policy in compat-current matches file exactly
  assert.deepEqual(
    compat.meta.compatPolicy,
    policy,
    "compat-current.json meta.compatPolicy does not match scripts/compat-policy.json"
  );

  // Check scenarios exist
  const expectedScenarios = ["cycle", "trend", "chop", "volatile"];
  assert.deepEqual(
    compat.meta.scenarios.sort(),
    expectedScenarios.sort(),
    "compat-current.json must contain all 4 deterministic market scenarios"
  );

  for (const scenario of expectedScenarios) {
    assert.ok(compat.scenarios[scenario], `scenario ${scenario} missing in compat-current.json`);
    const scData = compat.scenarios[scenario];
    assert.equal(scData.input.close.length, 320, `scenario ${scenario} close series length mismatch`);
    assert.equal(scData.input.high.length, 320, `scenario ${scenario} high series length mismatch`);
    assert.equal(scData.input.low.length, 320, `scenario ${scenario} low series length mismatch`);
    assert.equal(scData.input.volume.length, 320, `scenario ${scenario} volume series length mismatch`);

    // Check all policy indicators are present in ours
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
