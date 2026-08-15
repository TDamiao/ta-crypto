import test from "node:test";
import assert from "node:assert/strict";
import { validateWorkflowActions } from "../scripts/check-actions-pinned.js";

const TEST_LOCK = {
  "actions/checkout": {
    "11d5960a326750d5838078e36cf38b85af677262": "v4.4.0",
    "3d3c42e5aac5ba805825da76410c181273ba90b1": "v7.0.1"
  },
  "actions/setup-node": {
    "49933ea5288caeca8642d1e84afbd3f7d6820020": "v4.4.0"
  }
};

test("check-actions-pinned: passes when all actions are pinned to 40-char SHA with matching comment", () => {
  const content = `
name: Test
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
`;
  const result = validateWorkflowActions(content, "test.yml", TEST_LOCK);
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test("check-actions-pinned: rejects mutable branch/tag reference", () => {
  const content = `
name: Test
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4.4.0 # v4.4.0
`;
  const result = validateWorkflowActions(content, "test.yml", TEST_LOCK);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.message.includes("uses mutable or non-SHA ref")));
});

test("check-actions-pinned: rejects missing version comment", () => {
  const content = `
name: Test
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262
`;
  const result = validateWorkflowActions(content, "test.yml", TEST_LOCK);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.message.includes("missing a human-readable version comment")));
});

test("check-actions-pinned: rejects stale comment mismatch (Dependabot PR #49 scenario)", () => {
  // Scenario: SHA is v4.4.0, but comment was left as stale # v4.2.2
  const content = `
name: Test
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.2.2
`;
  const result = validateWorkflowActions(content, "test.yml", TEST_LOCK);
  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(e => e.message.includes("Version comment mismatch")),
    "Must detect version comment mismatch"
  );
});

test("check-actions-pinned: rejects unverified SHA not in canonical lock registry", () => {
  const content = `
name: Test
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@0000000000000000000000000000000000000000 # v9.9.9
`;
  const result = validateWorkflowActions(content, "test.yml", TEST_LOCK);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.message.includes("Unverified commit SHA")));
});
