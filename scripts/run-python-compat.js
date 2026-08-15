import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const PROBE_CODE = "import sys, json; print(json.dumps({'version': list(sys.version_info[:3]), 'version_str': sys.version.split()[0], 'executable': sys.executable, 'valid': sys.version_info >= (3, 12)}))";

export const MIN_PYTHON_VERSION = [3, 12, 0];

/**
 * Returns platform-specific Python candidate command arrays.
 * On Windows, includes py launcher options ('py -3.12', 'py -3', etc.).
 * @param {string} [platform]
 * @returns {Array<string[]>}
 */
export function getPlatformCandidates(platform = process.platform) {
  if (platform === "win32") {
    return [
      ["py", "-3.12"],
      ["py", "-3"],
      ["python3.12"],
      ["python3"],
      ["python"],
      ["py"]
    ];
  }
  return [
    ["python3.12"],
    ["python3"],
    ["python"]
  ];
}

/**
 * Probes a candidate Python command array to verify it is Python and checks if version >= 3.12.
 * @param {string[]} commandArray
 * @param {Function} [execFn]
 * @returns {{ found: boolean, command?: string[], version?: number[], versionStr?: string, executable?: string, valid?: boolean, error?: string }}
 */
export function probePythonCandidate(commandArray, execFn = spawnSync) {
  try {
    const cmd = commandArray[0];
    const args = [...commandArray.slice(1), "-c", PROBE_CODE];
    const res = execFn(cmd, args, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    if (res.status !== 0 || !res.stdout) {
      return { found: false, error: res.stderr || "Non-zero exit status on probe" };
    }
    const data = JSON.parse(res.stdout.trim());
    return {
      found: true,
      command: commandArray,
      version: data.version,
      versionStr: data.version_str,
      executable: data.executable,
      valid: Boolean(data.valid)
    };
  } catch (err) {
    return { found: false, error: err.message };
  }
}

/**
 * Iterates through candidates and returns the first verified Python >= 3.12 executable.
 * @param {Array<string[]>} [candidates]
 * @param {Function} [execFn]
 * @returns {{ ok: boolean, command?: string[], details?: object, reason?: string, message?: string, probed: object[] }}
 */
export function resolvePythonExecutable(candidates = getPlatformCandidates(), execFn = spawnSync) {
  const probed = [];
  for (const cand of candidates) {
    const result = probePythonCandidate(cand, execFn);
    if (result.found) {
      if (result.valid) {
        return {
          ok: true,
          command: cand,
          details: result,
          probed
        };
      }
      probed.push(result);
    }
  }

  // Found Python, but none met >= 3.12 requirement
  if (probed.length > 0) {
    const best = probed[0];
    return {
      ok: false,
      reason: "INCOMPATIBLE_VERSION",
      message: `Found Python ${best.versionStr} at "${best.executable}", but Python 3.12+ is required for Python reference parity validation.\nInstall Python 3.12+ or configure a compatible Python environment: pip install -r scripts/requirements-compat.txt`,
      probed
    };
  }

  return {
    ok: false,
    reason: "NOT_FOUND",
    message: `No Python executable was found in PATH.\nPython 3.12+ is required for Python reference parity validation.\nPlease install Python 3.12+ and dependencies: pip install -r scripts/requirements-compat.txt`,
    probed: []
  };
}

/**
 * Executes a target Python script using the verified candidate and propagates exit code.
 * @param {string[]} commandArray
 * @param {string} scriptPath
 * @param {string[]} [scriptArgs]
 * @param {Function} [execFn]
 * @returns {number} Exit code
 */
export function runPythonScript(commandArray, scriptPath, scriptArgs = [], execFn = spawnSync) {
  const cmd = commandArray[0];
  const args = [...commandArray.slice(1), scriptPath, ...scriptArgs];
  const child = execFn(cmd, args, { stdio: "inherit" });
  return child.status ?? 1;
}

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const resolved = resolvePythonExecutable();
  if (!resolved.ok) {
    console.error(`\n❌ [compat][python] ${resolved.message}\n`);
    process.exit(1);
  }

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const pyScript = path.resolve(__dirname, "compare-python-refs.py");
  const exitCode = runPythonScript(resolved.command, pyScript, process.argv.slice(2));
  process.exit(exitCode);
}
