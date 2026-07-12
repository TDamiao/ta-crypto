import assert from "node:assert/strict";
import test from "node:test";
import {
  RollingMax,
  RollingMean,
  RollingMin,
  RollingStdDev,
  RollingSum,
  rollingMax,
  rollingMean,
  rollingMin,
  rollingStdDev,
  rollingSum
} from "../dist/core/rolling.js";

const values = [4, 2, 8, 6, 10];

test("rolling batch helpers preserve warmup and window alignment", () => {
  assert.deepEqual(rollingSum(values, 3), [null, null, 14, 16, 24]);
  assert.deepEqual(rollingMean(values, 3), [null, null, 14 / 3, 16 / 3, 8]);
  assert.deepEqual(rollingMin(values, 3), [null, null, 2, 2, 6]);
  assert.deepEqual(rollingMax(values, 3), [null, null, 8, 8, 10]);

  const expectedStd = Math.sqrt(56 / 9);
  const actualStd = rollingStdDev(values, 3);
  assert.equal(actualStd[0], null);
  assert.equal(actualStd[1], null);
  assert.ok(Math.abs(actualStd[2] - expectedStd) < 1e-12);
});

test("stateful rolling primitives reset deterministically", () => {
  const factories = [
    () => new RollingSum(3),
    () => new RollingMean(3),
    () => new RollingStdDev(3),
    () => new RollingMin(3),
    () => new RollingMax(3)
  ];

  for (const factory of factories) {
    const rolling = factory();
    const first = values.map(value => rolling.next(value));
    rolling.reset();
    const second = values.map(value => rolling.next(value));
    assert.deepEqual(second, first);
  }
});

test("rolling primitives reject invalid configuration and values", () => {
  assert.throws(() => new RollingMean(0), /positive integer/);
  assert.throws(() => new RollingMean(2.5), /positive integer/);
  assert.throws(() => new RollingMean(Number.NaN), /positive integer/);

  const rolling = new RollingMean(2);
  assert.throws(() => rolling.next(Number.POSITIVE_INFINITY), /finite number/);
});

test("rolling extrema handle duplicate values and expired heads", () => {
  const duplicateValues = [3, 3, 2, 3, 1, 1, 4];
  assert.deepEqual(rollingMin(duplicateValues, 2), [null, 3, 2, 2, 1, 1, 1]);
  assert.deepEqual(rollingMax(duplicateValues, 2), [null, 3, 3, 3, 3, 1, 4]);
});
