import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKFLOWS_DIR = path.resolve(__dirname, "../.github/workflows");
const LOCK_FILE = path.resolve(__dirname, "pinned-actions-lock.json");

const SHA40_REGEX = /^[0-9a-f]{40}$/i;
const USES_INLINE_REGEX = /uses:\s*([^\s#]+)(?:\s*#\s*(.*))?/;

/**
 * Loads the canonical verified SHA-to-version lockfile.
 * @returns {Record<string, Record<string, string>>}
 */
export function loadActionLock(lockPath = LOCK_FILE) {
  if (fs.existsSync(lockPath)) {
    try {
      return JSON.parse(fs.readFileSync(lockPath, "utf8"));
    } catch (err) {
      console.warn(`[check-actions-pinned] Warning: Failed to parse lockfile at ${lockPath}: ${err.message}`);
    }
  }
  return {};
}

/**
 * Validates a workflow file content for pinned Action SHAs and comment version consistency.
 * @param {string} content - YAML content of the workflow file.
 * @param {string} filePath - Path to the workflow file for reporting.
 * @param {Record<string, Record<string, string>>} [lockData]
 * @returns {{ valid: boolean, errors: Array<{ file: string, line: number, message: string, action: string, ref: string }> }}
 */
export function validateWorkflowActions(content, filePath = "workflow.yml", lockData = {}) {
  const lines = content.split("\n");
  const errors = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(USES_INLINE_REGEX);
    if (!match) continue;

    const fullActionRef = match[1].trim();
    const rawComment = (match[2] || "").trim();
    const comment = rawComment.replace(/^[#\s]+/, "");
    const lineNumber = i + 1;

    // Ignore local actions (e.g. ./actions/custom)
    if (fullActionRef.startsWith("./") || fullActionRef.startsWith("../")) {
      continue;
    }

    // Ignore docker images if prefixed with docker://
    if (fullActionRef.startsWith("docker://")) {
      continue;
    }

    const atIndex = fullActionRef.indexOf("@");
    if (atIndex === -1) {
      errors.push({
        file: filePath,
        line: lineNumber,
        action: fullActionRef,
        ref: "",
        message: `Action "${fullActionRef}" has no pinned version/ref at all. Expected full 40-character commit SHA.`
      });
      continue;
    }

    const actionName = fullActionRef.slice(0, atIndex);
    const ref = fullActionRef.slice(atIndex + 1);

    if (!SHA40_REGEX.test(ref)) {
      errors.push({
        file: filePath,
        line: lineNumber,
        action: actionName,
        ref,
        message: `Action "${actionName}" uses mutable or non-SHA ref "${ref}". Expected full 40-character commit SHA.`
      });
      continue;
    }

    if (!comment) {
      errors.push({
        file: filePath,
        line: lineNumber,
        action: actionName,
        ref,
        message: `Action "${actionName}@${ref}" is missing a human-readable version comment (e.g. "# v4.4.0").`
      });
      continue;
    }

    // Check lockfile mapping if available
    const actionLocks = lockData[actionName];
    if (actionLocks) {
      const expectedVersion = actionLocks[ref];
      if (expectedVersion) {
        // Normalise 'v4.4.0' vs '4.4.0'
        const normComment = comment.replace(/^v/i, "");
        const normExpected = expectedVersion.replace(/^v/i, "");
        if (normComment !== normExpected) {
          errors.push({
            file: filePath,
            line: lineNumber,
            action: actionName,
            ref,
            message: `Version comment mismatch for ${actionName}@${ref}: declared "# ${comment}", but verified lockfile specifies "${expectedVersion}".`
          });
        }
      } else {
        // SHA is not yet registered in lockfile
        errors.push({
          file: filePath,
          line: lineNumber,
          action: actionName,
          ref,
          message: `Unverified commit SHA "${ref}" for action "${actionName}". Add verified entry to scripts/pinned-actions-lock.json.`
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Scans all workflow files in .github/workflows and checks for immutable SHA pinning and version comment consistency.
 */
export function checkAllWorkflows(workflowsDir = WORKFLOWS_DIR, lockPath = LOCK_FILE) {
  if (!fs.existsSync(workflowsDir)) {
    return { valid: true, totalFiles: 0, errors: [] };
  }

  const lockData = loadActionLock(lockPath);
  const files = fs.readdirSync(workflowsDir).filter(f => f.endsWith(".yml") || f.endsWith(".yaml"));
  const allErrors = [];

  for (const file of files) {
    const fullPath = path.join(workflowsDir, file);
    const content = fs.readFileSync(fullPath, "utf8");
    const res = validateWorkflowActions(content, file, lockData);
    if (!res.valid) {
      allErrors.push(...res.errors);
    }
  }

  return {
    valid: allErrors.length === 0,
    totalFiles: files.length,
    errors: allErrors
  };
}

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = checkAllWorkflows();

  if (result.valid) {
    console.log(`✅ [check-actions-pinned] All GitHub Actions in ${result.totalFiles} workflow(s) are pinned to immutable 40-character SHAs and match verified version metadata.`);
    process.exit(0);
  } else {
    console.error(`\n❌ [check-actions-pinned] Found ${result.errors.length} unpinned or non-compliant Action reference(s):\n`);
    for (const err of result.errors) {
      console.error(`  - ${err.file}:${err.line} -> ${err.message}`);
    }
    console.error("\nTo fix: Pin every external action to its full 40-character commit SHA with matching verified version comment in scripts/pinned-actions-lock.json.\n");
    process.exit(1);
  }
}
