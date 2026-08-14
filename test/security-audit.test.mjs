import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { evaluateAudit, validateExceptionEntry } from "../scripts/security-audit.js";

const ROOT_DIR = path.resolve(process.cwd());

test("security-audit: clean audit passes with 0 findings", () => {
  const cleanAudit = {
    auditReportVersion: 2,
    vulnerabilities: {},
    metadata: { vulnerabilities: { total: 0 } }
  };

  const result = evaluateAudit(cleanAudit, { exceptions: [] });
  assert.equal(result.pass, true);
  assert.equal(result.summary.stats.critical, 0);
  assert.equal(result.summary.stats.high, 0);
  assert.equal(result.summary.stats.highBlocking, 0);
});

test("security-audit: critical vulnerability blocks CI immediately", () => {
  const criticalAudit = {
    auditReportVersion: 2,
    vulnerabilities: {
      "vulnerable-pkg": {
        name: "vulnerable-pkg",
        severity: "critical",
        via: [
          {
            source: 1001,
            name: "vulnerable-pkg",
            title: "Remote Code Execution",
            url: "https://github.com/advisories/GHSA-crit-1234",
            severity: "critical"
          }
        ]
      }
    }
  };

  const result = evaluateAudit(criticalAudit, { exceptions: [] });
  assert.equal(result.pass, false);
  assert.equal(result.summary.stats.critical, 1);
  assert.equal(result.findings[0].status, "BLOCKING");
});

test("security-audit: critical vulnerability cannot be excepted", () => {
  const criticalAudit = {
    auditReportVersion: 2,
    vulnerabilities: {
      "vulnerable-pkg": {
        name: "vulnerable-pkg",
        severity: "critical",
        via: [
          {
            source: 1001,
            name: "vulnerable-pkg",
            title: "Remote Code Execution",
            url: "https://github.com/advisories/GHSA-crit-1234",
            severity: "critical"
          }
        ]
      }
    }
  };

  const exceptionsData = {
    exceptions: [
      {
        advisoryId: "GHSA-crit-1234",
        package: "vulnerable-pkg",
        severity: "critical",
        scope: "dev",
        reachability: "none",
        impact: "none",
        justification: "test",
        owner: "test",
        createdAt: "2026-08-01T00:00:00Z",
        expiresAt: "2026-08-20T00:00:00Z",
        trackingIssue: "https://github.com/TDamiao/ta-crypto/issues/1"
      }
    ]
  };

  const result = evaluateAudit(criticalAudit, exceptionsData, { now: "2026-08-10T00:00:00Z" });
  assert.equal(result.pass, false);
  assert.ok(result.malformedExceptions.length > 0);
  assert.match(result.malformedExceptions[0].errors[0], /Exceptions are only permitted for "high" severity findings/);
});

test("security-audit: exception with non-high severity (low, moderate, invalid) fails validation", () => {
  const severities = ["low", "moderate", "unknown", "invalid-severity"];

  for (const sev of severities) {
    const exc = {
      advisoryId: "GHSA-test-1234",
      package: "vulnerable-pkg",
      severity: sev,
      scope: "dev",
      reachability: "none",
      impact: "none",
      justification: "test",
      owner: "test",
      createdAt: "2026-08-01T00:00:00Z",
      expiresAt: "2026-08-20T00:00:00Z",
      trackingIssue: "https://github.com/TDamiao/ta-crypto/issues/1"
    };

    const res = validateExceptionEntry(exc, new Date("2026-08-05T00:00:00Z"));
    assert.equal(res.valid, false);
    assert.match(res.errors[0], /Exceptions are only permitted for "high" severity findings/);

    // Also assert that when fed into evaluateAudit with a HIGH finding, it blocks
    const highAudit = {
      auditReportVersion: 2,
      vulnerabilities: {
        "vulnerable-pkg": {
          name: "vulnerable-pkg",
          severity: "high",
          via: [
            {
              source: 1002,
              name: "vulnerable-pkg",
              title: "Denial of Service",
              url: "https://github.com/advisories/GHSA-test-1234",
              severity: "high"
            }
          ]
        }
      }
    };

    const result = evaluateAudit(highAudit, { exceptions: [exc] }, { now: "2026-08-05T00:00:00Z" });
    assert.equal(result.pass, false, `Expected severity '${sev}' exception to fail evaluation`);
    assert.equal(result.summary.stats.highBlocking, 1);
  }
});

test("security-audit: unexcepted high vulnerability blocks CI", () => {
  const highAudit = {
    auditReportVersion: 2,
    vulnerabilities: {
      "vulnerable-pkg": {
        name: "vulnerable-pkg",
        severity: "high",
        via: [
          {
            source: 1002,
            name: "vulnerable-pkg",
            title: "Denial of Service",
            url: "https://github.com/advisories/GHSA-high-1234",
            severity: "high"
          }
        ]
      }
    }
  };

  const result = evaluateAudit(highAudit, { exceptions: [] });
  assert.equal(result.pass, false);
  assert.equal(result.summary.stats.high, 1);
  assert.equal(result.summary.stats.highBlocking, 1);
  assert.equal(result.summary.stats.highExcepted, 0);
});

test("security-audit: valid unexpired exception allows high vulnerability to pass", () => {
  const highAudit = {
    auditReportVersion: 2,
    vulnerabilities: {
      "vulnerable-pkg": {
        name: "vulnerable-pkg",
        severity: "high",
        via: [
          {
            source: 1002,
            name: "vulnerable-pkg",
            title: "Denial of Service",
            url: "https://github.com/advisories/GHSA-high-1234",
            severity: "high"
          }
        ]
      }
    }
  };

  const exceptionsData = {
    exceptions: [
      {
        advisoryId: "GHSA-high-1234",
        package: "vulnerable-pkg",
        severity: "high",
        scope: "dev",
        reachability: "build-time only",
        impact: "DoS during local build",
        justification: "Waiting for upstream patch",
        owner: "TDamiao",
        createdAt: "2026-08-01T00:00:00Z",
        expiresAt: "2026-08-25T00:00:00Z",
        trackingIssue: "https://github.com/TDamiao/ta-crypto/issues/99"
      }
    ]
  };

  const result = evaluateAudit(highAudit, exceptionsData, { now: "2026-08-10T00:00:00Z" });
  assert.equal(result.pass, true);
  assert.equal(result.summary.stats.high, 1);
  assert.equal(result.summary.stats.highBlocking, 0);
  assert.equal(result.summary.stats.highExcepted, 1);
  assert.equal(result.findings[0].status, "EXCEPTED");
});

test("security-audit: expired exception restores blocking behavior", () => {
  const highAudit = {
    auditReportVersion: 2,
    vulnerabilities: {
      "vulnerable-pkg": {
        name: "vulnerable-pkg",
        severity: "high",
        via: [
          {
            source: 1002,
            name: "vulnerable-pkg",
            title: "Denial of Service",
            url: "https://github.com/advisories/GHSA-high-1234",
            severity: "high"
          }
        ]
      }
    }
  };

  const exceptionsData = {
    exceptions: [
      {
        advisoryId: "GHSA-high-1234",
        package: "vulnerable-pkg",
        severity: "high",
        scope: "dev",
        reachability: "build-time only",
        impact: "DoS during local build",
        justification: "Waiting for upstream patch",
        owner: "TDamiao",
        createdAt: "2026-07-01T00:00:00Z",
        expiresAt: "2026-07-25T00:00:00Z",
        trackingIssue: "https://github.com/TDamiao/ta-crypto/issues/99"
      }
    ]
  };

  // Evaluated on Aug 14 (after expiration on Jul 25)
  const result = evaluateAudit(highAudit, exceptionsData, { now: "2026-08-14T00:00:00Z" });
  assert.equal(result.pass, false);
  assert.equal(result.summary.stats.highBlocking, 1);
  assert.ok(result.malformedExceptions.length > 0);
  assert.match(result.malformedExceptions[0].errors[0], /expired on/);
});

test("security-audit: exception duration > 30 days is rejected", () => {
  const exc = {
    advisoryId: "GHSA-high-1234",
    package: "vulnerable-pkg",
    severity: "high",
    scope: "dev",
    reachability: "none",
    impact: "none",
    justification: "test",
    owner: "test",
    createdAt: "2026-08-01T00:00:00Z",
    expiresAt: "2026-09-15T00:00:00Z", // 45 days
    trackingIssue: "https://github.com/TDamiao/ta-crypto/issues/1"
  };

  const res = validateExceptionEntry(exc, new Date("2026-08-05T00:00:00Z"));
  assert.equal(res.valid, false);
  assert.match(res.errors[0], /exceeds maximum allowed duration of 30 days/);
});

test("security-audit: moderate and low findings do not block CI", () => {
  const moderateLowAudit = {
    auditReportVersion: 2,
    vulnerabilities: {
      "mod-pkg": {
        name: "mod-pkg",
        severity: "moderate",
        via: [
          {
            source: 1003,
            name: "mod-pkg",
            title: "ReDoS",
            url: "https://github.com/advisories/GHSA-mod-1234",
            severity: "moderate"
          }
        ]
      },
      "low-pkg": {
        name: "low-pkg",
        severity: "low",
        via: [
          {
            source: 1004,
            name: "low-pkg",
            title: "Timing Attack",
            url: "https://github.com/advisories/GHSA-low-1234",
            severity: "low"
          }
        ]
      }
    }
  };

  const result = evaluateAudit(moderateLowAudit, { exceptions: [] });
  assert.equal(result.pass, true);
  assert.equal(result.summary.stats.critical, 0);
  assert.equal(result.summary.stats.high, 0);
  assert.equal(result.summary.stats.moderate, 1);
  assert.equal(result.summary.stats.low, 1);
  assert.equal(result.findings[0].status, "LOGGED");
  assert.equal(result.findings[1].status, "TRACKED");
});

test("security-audit: repo exceptions file contains no malformed entries", () => {
  const fileContent = JSON.parse(fs.readFileSync(path.resolve(ROOT_DIR, "security/audit-exceptions.json"), "utf8"));
  assert.ok(Array.isArray(fileContent.exceptions));
  for (const exc of fileContent.exceptions) {
    const res = validateExceptionEntry(exc);
    assert.equal(res.valid, true, `Invalid repo exception entry: ${res.errors.join(", ")}`);
  }
});
