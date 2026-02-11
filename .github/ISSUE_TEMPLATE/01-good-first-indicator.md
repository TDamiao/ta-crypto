---
name: Good first issue - indicator
about: Add a small indicator or streaming parity task with guided acceptance criteria.
title: "Add streaming version of EMA"
labels: ["good first issue", "help wanted"]
assignees: ""
---

## Goal

Example: stateful `EMA.next(value)` with deterministic warmup semantics.

## Reference

Example: TA-Lib EMA behavior and warmup conventions.

## Acceptance criteria

Example: streaming EMA matches batch EMA within defined tolerance.

## Test plan

- [ ] Unit tests for normal and edge cases.
- [ ] Parity test against batch implementation.
- [ ] Compatibility validation against TA-Lib vectors.

## Notes

Add any constraints (timeframe, precision, expected null windows, etc.).
