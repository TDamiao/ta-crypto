import test from "node:test";
import assert from "node:assert/strict";
import {
  parseSemver,
  compareSemver,
  validatePublishRuntime,
  MIN_NODE_VERSION,
  MIN_NPM_VERSION
} from "../scripts/check-publish-runtime.js";

test("check-publish-runtime: parseSemver parses valid semver strings with prefixes and suffixes", () => {
  assert.deepEqual(parseSemver("22.14.0"), [22, 14, 0]);
  assert.deepEqual(parseSemver("v24.2.1"), [24, 2, 1]);
  assert.deepEqual(parseSemver("11.5.1-rc.0"), [11, 5, 1]);
  assert.deepEqual(parseSemver("22.14"), [22, 14, 0]);
  assert.deepEqual(parseSemver("24"), [24, 0, 0]);
});

test("check-publish-runtime: compareSemver correctly orders versions", () => {
  assert.equal(compareSemver("22.14.0", "22.14.0"), 0);
  assert.equal(compareSemver("22.14.1", "22.14.0"), 1);
  assert.equal(compareSemver("22.13.9", "22.14.0"), -1);
  assert.equal(compareSemver("24.0.0", "22.14.0"), 1);
  assert.equal(compareSemver("18.0.0", "22.14.0"), -1);
  assert.equal(compareSemver("11.5.1", "11.5.1"), 0);
  assert.equal(compareSemver("11.5.2", "11.5.1"), 1);
  assert.equal(compareSemver("11.5.0", "11.5.1"), -1);
  assert.equal(compareSemver("10.9.0", "11.5.1"), -1);
});

test("check-publish-runtime: validatePublishRuntime accepts compliant runtime versions", () => {
  const result1 = validatePublishRuntime({
    nodeVersion: "22.14.0",
    npmVersion: "11.5.1"
  });
  assert.equal(result1.valid, true);
  assert.equal(result1.errors.length, 0);

  const result2 = validatePublishRuntime({
    nodeVersion: "24.1.0",
    npmVersion: "11.6.0"
  });
  assert.equal(result2.valid, true);
  assert.equal(result2.errors.length, 0);
});

test("check-publish-runtime: validatePublishRuntime rejects Node < 22.14.0", () => {
  const result = validatePublishRuntime({
    nodeVersion: "22.13.0",
    npmVersion: "11.5.1"
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.includes("Node.js version 22.13.0 is below required minimum")));
});

test("check-publish-runtime: validatePublishRuntime rejects Node 20 or 18", () => {
  const result = validatePublishRuntime({
    nodeVersion: "20.18.0",
    npmVersion: "11.5.1"
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.includes("Node.js version 20.18.0 is below required minimum")));
});

test("check-publish-runtime: validatePublishRuntime rejects npm CLI < 11.5.1", () => {
  const result = validatePublishRuntime({
    nodeVersion: "22.14.0",
    npmVersion: "11.5.0"
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.includes("npm CLI version 11.5.0 is below required minimum")));
});

test("check-publish-runtime: validatePublishRuntime rejects legacy npm 10.x bundled with older Node", () => {
  const result = validatePublishRuntime({
    nodeVersion: "22.14.0",
    npmVersion: "10.9.2"
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.includes("npm CLI version 10.9.2 is below required minimum")));
});

test("check-publish-runtime: validatePublishRuntime rejects both invalid Node and npm simultaneously", () => {
  const result = validatePublishRuntime({
    nodeVersion: "20.11.0",
    npmVersion: "10.2.4"
  });
  assert.equal(result.valid, false);
  assert.equal(result.errors.length, 2);
});
