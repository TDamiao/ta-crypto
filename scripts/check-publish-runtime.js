import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const MIN_NODE_VERSION = "22.14.0";
export const MIN_NPM_VERSION = "11.5.1";

/**
 * Parses a semantic version string into [major, minor, patch].
 * @param {string} versionStr - e.g. "v22.14.0", "11.5.1", "24.0.0-rc.1"
 * @returns {[number, number, number]}
 */
export function parseSemver(versionStr) {
  if (!versionStr || typeof versionStr !== "string") {
    throw new Error(`Invalid version string: ${versionStr}`);
  }
  const clean = versionStr.trim().replace(/^v/i, "");
  const base = clean.split("-")[0].split("+")[0];
  const parts = base.split(".").map((p) => {
    const num = Number.parseInt(p, 10);
    return Number.isNaN(num) ? 0 : num;
  });

  while (parts.length < 3) {
    parts.push(0);
  }

  return [parts[0], parts[1], parts[2]];
}

/**
 * Compares two semantic version strings.
 * @param {string} v1
 * @param {string} v2
 * @returns {number} 1 if v1 > v2, -1 if v1 < v2, 0 if v1 === v2
 */
export function compareSemver(v1, v2) {
  const [maj1, min1, pat1] = parseSemver(v1);
  const [maj2, min2, pat2] = parseSemver(v2);

  if (maj1 !== maj2) return maj1 > maj2 ? 1 : -1;
  if (min1 !== min2) return min1 > min2 ? 1 : -1;
  if (pat1 !== pat2) return pat1 > pat2 ? 1 : -1;
  return 0;
}

/**
 * Validates whether current or provided Node and npm versions satisfy npm Trusted Publishing requirements.
 * @param {object} [options]
 * @param {string} [options.nodeVersion]
 * @param {string} [options.npmVersion]
 * @param {string} [options.minNode]
 * @param {string} [options.minNpm]
 * @returns {{ valid: boolean, errors: string[], details: { nodeVersion: string, npmVersion: string, minNode: string, minNpm: string } }}
 */
export function validatePublishRuntime(options = {}) {
  const minNode = options.minNode || MIN_NODE_VERSION;
  const minNpm = options.minNpm || MIN_NPM_VERSION;

  let nodeVersion = options.nodeVersion;
  if (!nodeVersion) {
    nodeVersion = process.version;
  }

  let npmVersion = options.npmVersion;
  if (!npmVersion) {
    try {
      npmVersion = execSync("npm --version", { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
    } catch (err) {
      return {
        valid: false,
        errors: [`Failed to determine npm CLI version: ${err.message}`],
        details: { nodeVersion, npmVersion: "unknown", minNode, minNpm }
      };
    }
  }

  const errors = [];

  try {
    if (compareSemver(nodeVersion, minNode) < 0) {
      errors.push(
        `Node.js version ${nodeVersion} is below required minimum ${minNode} for npm Trusted Publishing.`
      );
    }
  } catch (err) {
    errors.push(`Failed to parse Node.js version "${nodeVersion}": ${err.message}`);
  }

  try {
    if (compareSemver(npmVersion, minNpm) < 0) {
      errors.push(
        `npm CLI version ${npmVersion} is below required minimum ${minNpm} for npm Trusted Publishing.`
      );
    }
  } catch (err) {
    errors.push(`Failed to parse npm CLI version "${npmVersion}": ${err.message}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    details: {
      nodeVersion,
      npmVersion,
      minNode,
      minNpm
    }
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  let explicitNode;
  let explicitNpm;

  for (const arg of args) {
    if (arg.startsWith("--node=")) explicitNode = arg.slice(7);
    if (arg.startsWith("--npm=")) explicitNpm = arg.slice(6);
  }

  console.log("🔍 Checking npm Trusted Publishing runtime environment...");
  const result = validatePublishRuntime({
    nodeVersion: explicitNode,
    npmVersion: explicitNpm
  });

  console.log(`  - Node.js:  ${result.details.nodeVersion} (required >= ${result.details.minNode})`);
  console.log(`  - npm CLI:  ${result.details.npmVersion} (required >= ${result.details.minNpm})`);

  if (!result.valid) {
    console.error("\n❌ [check-publish-runtime] FAILED: Runtime does not meet npm Trusted Publishing requirements:");
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log("\n✅ [check-publish-runtime] PASSED: Runtime environment satisfies npm Trusted Publishing requirements.\n");
}
