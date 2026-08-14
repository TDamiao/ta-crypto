import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const EXCEPTIONS_FILE = path.resolve(ROOT_DIR, "security/audit-exceptions.json");
const REPORT_FILE = path.resolve(ROOT_DIR, "security-audit-report.json");

const MAX_EXCEPTION_DURATION_DAYS = 30;

/**
 * Validates an individual exception entry against the schema and expiration constraints.
 * @param {object} exc - The exception object.
 * @param {Date} now - The current date reference.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateExceptionEntry(exc, now = new Date()) {
  const errors = [];
  const requiredFields = [
    "advisoryId",
    "package",
    "severity",
    "scope",
    "reachability",
    "impact",
    "justification",
    "owner",
    "createdAt",
    "expiresAt",
    "trackingIssue"
  ];

  for (const field of requiredFields) {
    if (!exc[field] || typeof exc[field] !== "string" || exc[field].trim() === "") {
      errors.push(`Exception is missing or has empty required field: "${field}"`);
    }
  }

  if (exc.severity && exc.severity.toLowerCase() === "critical") {
    errors.push(`Critical severity findings cannot be excepted under repository policy.`);
  }

  if (exc.createdAt && exc.expiresAt) {
    const createdDate = new Date(exc.createdAt);
    const expiresDate = new Date(exc.expiresAt);

    if (isNaN(createdDate.getTime())) {
      errors.push(`Invalid createdAt timestamp: "${exc.createdAt}"`);
    }
    if (isNaN(expiresDate.getTime())) {
      errors.push(`Invalid expiresAt timestamp: "${exc.expiresAt}"`);
    }

    if (!isNaN(createdDate.getTime()) && !isNaN(expiresDate.getTime())) {
      const durationMs = expiresDate.getTime() - createdDate.getTime();
      const maxMs = MAX_EXCEPTION_DURATION_DAYS * 24 * 60 * 60 * 1000;

      if (durationMs <= 0) {
        errors.push(`expiresAt ("${exc.expiresAt}") must be strictly after createdAt ("${exc.createdAt}")`);
      } else if (durationMs > maxMs) {
        errors.push(`Exception duration (${Math.round(durationMs / (24 * 3600 * 1000))} days) exceeds maximum allowed duration of ${MAX_EXCEPTION_DURATION_DAYS} days.`);
      }

      if (now.getTime() > expiresDate.getTime()) {
        errors.push(`Exception for "${exc.package}" (${exc.advisoryId}) expired on "${exc.expiresAt}". Blocking behavior restored.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Evaluates an npm audit JSON report against repository security policy and active exceptions.
 * @param {object} auditData - Parsed npm audit JSON output.
 * @param {object} exceptionsData - Parsed audit-exceptions.json content.
 * @param {object} options - Evaluation options.
 * @returns {{ pass: boolean, summary: object, findings: object[], exceptionResults: object[] }}
 */
export function evaluateAudit(auditData, exceptionsData = { exceptions: [] }, options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const exceptions = Array.isArray(exceptionsData?.exceptions) ? exceptionsData.exceptions : [];

  // Validate all configured exceptions first
  const exceptionResults = exceptions.map(exc => ({
    exception: exc,
    ...validateExceptionEntry(exc, now)
  }));

  const malformedExceptions = exceptionResults.filter(r => !r.valid);

  const findings = [];
  const stats = {
    total: 0,
    critical: 0,
    high: 0,
    highExcepted: 0,
    highBlocking: 0,
    moderate: 0,
    low: 0,
    info: 0
  };

  const vulnerabilities = auditData?.vulnerabilities || {};

  for (const [pkgName, vuln] of Object.entries(vulnerabilities)) {
    const severity = (vuln.severity || "unknown").toLowerCase();
    const isDirect = vuln.isDirect ?? false;
    const effects = vuln.effects || [];
    const nodes = vuln.nodes || [];

    // Extract all advisories / via entries
    const viaEntries = Array.isArray(vuln.via) ? vuln.via : [];
    for (const via of viaEntries) {
      if (typeof via === "object" && via !== null) {
        const advisoryId = via.url ? via.url.split("/").pop() : (via.source ? `source-${via.source}` : "UNKNOWN");
        const advSeverity = (via.severity || severity).toLowerCase();
        stats.total++;

        const finding = {
          package: pkgName,
          title: via.title || vuln.name || pkgName,
          advisoryId,
          url: via.url || "",
          severity: advSeverity,
          isDirect,
          range: via.range || vuln.range || "*",
          nodes,
          effects,
          status: "REVIEW",
          exceptionApplied: null
        };

        if (advSeverity === "critical") {
          stats.critical++;
          finding.status = "BLOCKING";
        } else if (advSeverity === "high") {
          stats.high++;
          // Check if an unexpired, valid exception matches this finding
          const matchedExcResult = exceptionResults.find(r =>
            r.valid &&
            r.exception.package === pkgName &&
            (r.exception.advisoryId === advisoryId || r.exception.advisoryId === via.url)
          );

          if (matchedExcResult) {
            stats.highExcepted++;
            finding.status = "EXCEPTED";
            finding.exceptionApplied = matchedExcResult.exception;
          } else {
            stats.highBlocking++;
            finding.status = "BLOCKING";
          }
        } else if (advSeverity === "moderate") {
          stats.moderate++;
          finding.status = "LOGGED";
        } else if (advSeverity === "low") {
          stats.low++;
          finding.status = "TRACKED";
        } else {
          stats.info++;
          finding.status = "INFO";
        }

        findings.push(finding);
      }
    }
  }

  const isBlocked = stats.critical > 0 || stats.highBlocking > 0 || malformedExceptions.length > 0;

  return {
    pass: !isBlocked,
    summary: {
      passed: !isBlocked,
      evaluatedAt: now.toISOString(),
      stats,
      malformedExceptionsCount: malformedExceptions.length
    },
    findings,
    exceptionResults,
    malformedExceptions
  };
}

// CLI Execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let auditJson = null;
  const args = process.argv.slice(2);
  const auditFileArg = args.find(a => a.startsWith("--audit-json="));

  if (auditFileArg) {
    const filePath = path.resolve(process.cwd(), auditFileArg.split("=")[1]);
    auditJson = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } else {
    try {
      // Execute npm audit --json
      const raw = execSync("npm audit --json", { cwd: ROOT_DIR, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
      auditJson = JSON.parse(raw);
    } catch (err) {
      if (err.stdout) {
        try {
          auditJson = JSON.parse(err.stdout);
        } catch (_) {
          console.error("❌ Failed to parse npm audit stdout JSON:", err.stdout);
          process.exit(1);
        }
      } else {
        console.error("❌ Failed to execute npm audit:", err.message);
        process.exit(1);
      }
    }
  }

  let exceptionsData = { exceptions: [] };
  if (fs.existsSync(EXCEPTIONS_FILE)) {
    try {
      exceptionsData = JSON.parse(fs.readFileSync(EXCEPTIONS_FILE, "utf8"));
    } catch (err) {
      console.error(`❌ Failed to parse exceptions file at ${EXCEPTIONS_FILE}:`, err.message);
      process.exit(1);
    }
  }

  const evaluation = evaluateAudit(auditJson, exceptionsData);

  // Generate machine-readable report
  const reportPayload = {
    timestamp: new Date().toISOString(),
    toolchain: {
      node: process.version,
      platform: process.platform
    },
    policy: {
      critical: "BLOCKS CI/release (no normal exception)",
      high: "BLOCKS CI/release unless valid, unexpired exception exists (max 30 days)",
      moderate: "LOGGED and evaluated",
      low: "TRACKED via periodic review"
    },
    result: evaluation.summary,
    findings: evaluation.findings,
    exceptions: exceptionsData.exceptions
  };

  try {
    fs.writeFileSync(REPORT_FILE, JSON.stringify(reportPayload, null, 2) + "\n", "utf8");
  } catch (_) {
    // Non-fatal if report file write fails
  }

  console.log("\n=======================================================");
  console.log("🛡️  ta-crypto Dependency Security Audit Gate");
  console.log("=======================================================");
  console.log(`Evaluated at: ${evaluation.summary.evaluatedAt}`);
  console.log(`Findings summary:`);
  console.log(`  - Critical:       ${evaluation.summary.stats.critical} (BLOCKING)`);
  console.log(`  - High Blocking:  ${evaluation.summary.stats.highBlocking} (BLOCKING)`);
  console.log(`  - High Excepted:  ${evaluation.summary.stats.highExcepted}`);
  console.log(`  - Moderate:       ${evaluation.summary.stats.moderate}`);
  console.log(`  - Low:            ${evaluation.summary.stats.low}`);
  console.log(`  - Total Findings: ${evaluation.summary.stats.total}`);

  if (evaluation.malformedExceptions.length > 0) {
    console.error("\n❌ Found malformed or expired audit exceptions:");
    for (const mal of evaluation.malformedExceptions) {
      console.error(`  - ${mal.exception.package || "Unknown package"} (${mal.exception.advisoryId || "No ID"}):`);
      for (const err of mal.errors) {
        console.error(`      * ${err}`);
      }
    }
  }

  if (evaluation.findings.length > 0) {
    console.log("\nVulnerabilities detail:");
    for (const f of evaluation.findings) {
      const icon = f.status === "BLOCKING" ? "❌" : (f.status === "EXCEPTED" ? "⚠️ [EXCEPTED]" : "ℹ️");
      console.log(`  ${icon} [${f.severity.toUpperCase()}] ${f.package} (${f.advisoryId}) - ${f.title}`);
      if (f.exceptionApplied) {
        console.log(`      Exception Owner: ${f.exceptionApplied.owner} | Expires: ${f.exceptionApplied.expiresAt}`);
        console.log(`      Justification: ${f.exceptionApplied.justification}`);
      }
    }
  }

  if (evaluation.pass) {
    console.log("\n✅ [security:audit] PASSED: No unhandled high or critical vulnerabilities found.\n");
    process.exit(0);
  } else {
    console.error("\n❌ [security:audit] FAILED: High or critical vulnerabilities violate repository policy.");
    console.error("Publication and CI builds MUST be blocked until resolved or formally excepted.\n");
    process.exit(1);
  }
}
