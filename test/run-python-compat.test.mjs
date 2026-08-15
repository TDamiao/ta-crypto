import test from "node:test";
import assert from "node:assert/strict";
import {
  getPlatformCandidates,
  probePythonCandidate,
  resolvePythonExecutable,
  runPythonScript
} from "../scripts/run-python-compat.js";

test("run-python-compat: getPlatformCandidates returns platform-tailored commands", () => {
  const winCandidates = getPlatformCandidates("win32");
  assert.ok(Array.isArray(winCandidates));
  assert.deepEqual(winCandidates[0], ["py", "-3.12"]);
  assert.deepEqual(winCandidates[1], ["py", "-3"]);
  assert.ok(winCandidates.some(c => c[0] === "python"));

  const posixCandidates = getPlatformCandidates("darwin");
  assert.ok(Array.isArray(posixCandidates));
  assert.deepEqual(posixCandidates[0], ["python3.12"]);
  assert.deepEqual(posixCandidates[1], ["python3"]);
  assert.deepEqual(posixCandidates[2], ["python"]);
});

test("run-python-compat: probePythonCandidate parses valid Python 3.12+ probe output", () => {
  const mockExec = (cmd, args) => ({
    status: 0,
    stdout: JSON.stringify({
      version: [3, 12, 4],
      version_str: "3.12.4",
      executable: "/usr/local/bin/python3.12",
      valid: true
    }),
    stderr: ""
  });

  const result = probePythonCandidate(["python3.12"], mockExec);
  assert.equal(result.found, true);
  assert.equal(result.valid, true);
  assert.deepEqual(result.version, [3, 12, 4]);
  assert.equal(result.versionStr, "3.12.4");
  assert.equal(result.executable, "/usr/local/bin/python3.12");
});

test("run-python-compat: probePythonCandidate identifies incompatible Python < 3.12", () => {
  const mockExec = (cmd, args) => ({
    status: 0,
    stdout: JSON.stringify({
      version: [3, 10, 8],
      version_str: "3.10.8",
      executable: "/usr/bin/python3",
      valid: false
    }),
    stderr: ""
  });

  const result = probePythonCandidate(["python3"], mockExec);
  assert.equal(result.found, true);
  assert.equal(result.valid, false);
  assert.deepEqual(result.version, [3, 10, 8]);
  assert.equal(result.versionStr, "3.10.8");
});

test("run-python-compat: probePythonCandidate handles command not found gracefully", () => {
  const mockExec = (cmd, args) => ({
    status: 127,
    stdout: "",
    stderr: "command not found"
  });

  const result = probePythonCandidate(["python3.12"], mockExec);
  assert.equal(result.found, false);
});

test("run-python-compat: resolvePythonExecutable selects first compatible candidate", () => {
  const mockExec = (cmd, args) => {
    if (cmd === "python3.12") {
      return { status: 127, stdout: "", stderr: "not found" };
    }
    if (cmd === "python3") {
      return {
        status: 0,
        stdout: JSON.stringify({
          version: [3, 12, 1],
          version_str: "3.12.1",
          executable: "/opt/homebrew/bin/python3",
          valid: true
        }),
        stderr: ""
      };
    }
    return { status: 127, stdout: "", stderr: "" };
  };

  const result = resolvePythonExecutable([["python3.12"], ["python3"], ["python"]], mockExec);
  assert.equal(result.ok, true);
  assert.deepEqual(result.command, ["python3"]);
  assert.equal(result.details.versionStr, "3.12.1");
});

test("run-python-compat: resolvePythonExecutable reports actionable error for incompatible version", () => {
  const mockExec = (cmd, args) => {
    return {
      status: 0,
      stdout: JSON.stringify({
        version: [3, 11, 5],
        version_str: "3.11.5",
        executable: "/usr/bin/python3",
        valid: false
      }),
      stderr: ""
    };
  };

  const result = resolvePythonExecutable([["python3"]], mockExec);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "INCOMPATIBLE_VERSION");
  assert.match(result.message, /Found Python 3.11.5 at "\/usr\/bin\/python3"/);
  assert.match(result.message, /Python 3.12\+ is required/);
});

test("run-python-compat: resolvePythonExecutable reports actionable error when no Python found", () => {
  const mockExec = () => ({ status: 127, stdout: "", stderr: "not found" });

  const result = resolvePythonExecutable([["python3.12"], ["python3"], ["python"]], mockExec);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "NOT_FOUND");
  assert.match(result.message, /No Python executable was found in PATH/);
  assert.match(result.message, /Python 3.12\+ is required/);
});

test("run-python-compat: runPythonScript propagates zero exit code correctly", () => {
  const mockExec = (cmd, args, opts) => {
    assert.equal(cmd, "python3.12");
    assert.deepEqual(args, ["/path/to/script.py", "--flag"]);
    assert.equal(opts.stdio, "inherit");
    return { status: 0 };
  };

  const exitCode = runPythonScript(["python3.12"], "/path/to/script.py", ["--flag"], mockExec);
  assert.equal(exitCode, 0);
});

test("run-python-compat: runPythonScript propagates non-zero exit code correctly", () => {
  const mockExec = (cmd, args, opts) => {
    return { status: 42 };
  };

  const exitCode = runPythonScript(["python3.12"], "/path/to/script.py", [], mockExec);
  assert.equal(exitCode, 42);
});

test("run-python-compat: runPythonScript defaults to exit code 1 if child.status is null", () => {
  const mockExec = (cmd, args, opts) => {
    return { status: null, signal: "SIGTERM" };
  };

  const exitCode = runPythonScript(["python3.12"], "/path/to/script.py", [], mockExec);
  assert.equal(exitCode, 1);
});
