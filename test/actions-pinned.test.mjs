import test from "node:test";
import assert from "node:assert/strict";
import { validateWorkflowActions, checkAllWorkflows } from "../scripts/check-actions-pinned.js";

test("check-actions-pinned: accepts full 40-char SHA with version comment", () => {
  const validYaml = `
name: Test
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.2.2
      - name: Setup Node
        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
        with:
          node-version: 20
      - uses: ./actions/local-action
`;
  const result = validateWorkflowActions(validYaml, "valid.yml");
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test("check-actions-pinned: rejects mutable major tag (@v4, @main, @latest)", () => {
  const mutableYaml = `
name: Test
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@main # branch
      - uses: some-org/some-action@latest
`;
  const result = validateWorkflowActions(mutableYaml, "mutable.yml");
  assert.equal(result.valid, false);
  assert.equal(result.errors.length, 3);
  assert.match(result.errors[0].message, /uses mutable or non-SHA ref "v4"/);
  assert.match(result.errors[1].message, /uses mutable or non-SHA ref "main"/);
  assert.match(result.errors[2].message, /uses mutable or non-SHA ref "latest"/);
});

test("check-actions-pinned: rejects short 7-char SHA", () => {
  const shortShaYaml = `
name: Test
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11d5960 # v4
`;
  const result = validateWorkflowActions(shortShaYaml, "short.yml");
  assert.equal(result.valid, false);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0].message, /uses mutable or non-SHA ref "11d5960"/);
});

test("check-actions-pinned: rejects missing version comment on pinned SHA", () => {
  const noCommentYaml = `
name: Test
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262
`;
  const result = validateWorkflowActions(noCommentYaml, "no-comment.yml");
  assert.equal(result.valid, false);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0].message, /missing a human-readable version comment/);
});

test("check-actions-pinned: checkAllWorkflows scans actual repo workflows", () => {
  const result = checkAllWorkflows();
  assert.equal(typeof result.totalFiles, "number");
  assert.ok(result.totalFiles >= 2, "Should find at least ci.yml and release-please.yml");
});
