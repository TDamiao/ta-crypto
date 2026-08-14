import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKFLOWS_DIR = path.resolve(__dirname, "../.github/workflows");

const SHA40_REGEX = /^[0-9a-f]{40}$/i;
const USES_REGEX = /^\s*-\s+(?:name:\s*[^\n]+\s+)?uses:\s*([^\s#]+)(?:\s*#\s*(.*))?$/;
const USES_INLINE_REGEX = /uses:\s*([^\s#]+)(?:\s*#\s*(.*))?/;

/**
 * Validates a workflow file content for pinned Action SHAs.
 * @param {string} content - YAML content of the workflow file.
 * @param {string} filePath - Path to the workflow file for reporting.
 * @returns {{ valid: boolean, errors: Array<{ file: string, line: number, message: string, action: string, ref: string }> }}
 */
export function validateWorkflowActions(content, filePath = "workflow.yml") {
  const lines = content.split("\n");
  const errors = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(USES_INLINE_REGEX);
    if (!match) continue;

    const fullActionRef = match[1].trim();
    const comment = (match[2] || "").trim();
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
        message: `Action "${actionName}@${ref}" is missing a human-readable version comment (e.g. "# v4.2.2").`
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Scans all workflow files in .github/workflows and checks for immutable SHA pinning.
 */
export function checkAllWorkflows(workflowsDir = WORKFLOWS_DIR) {
  if (!fs.existsSync(workflowsDir)) {
    return { valid: true, totalFiles: 0, errors: [] };
  }

  const files = fs.readdirSync(workflowsDir).filter(f => f.endsWith(".yml") || f.endsWith(".yaml"));
  const allErrors = [];

  for (const file of files) {
    const fullPath = path.join(workflowsDir, file);
    const content = fs.readFileSync(fullPath, "utf8");
    const res = validateWorkflowActions(content, file);
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
    console.log(`✅ [check-actions-pinned] All GitHub Actions in ${result.totalFiles} workflow(s) are pinned to immutable 40-character SHAs with version comments.`);
    process.exit(0);
  } else {
    console.error(`\n❌ [check-actions-pinned] Found ${result.errors.length} unpinned or non-compliant Action reference(s):\n`);
    for (const err of result.errors) {
      console.error(`  - ${err.file}:${err.line} -> ${err.message}`);
    }
    console.error("\nTo fix: Pin every external action to its full 40-character commit SHA with a human version comment (e.g. uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.2.2).\n");
    process.exit(1);
  }
}
