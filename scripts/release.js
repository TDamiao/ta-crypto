import { execSync } from "node:child_process";

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

function ensureClean() {
  const status = execSync("git status --porcelain").toString().trim();
  if (status.length > 0) {
    console.error("Working tree is not clean. Commit or stash changes before releasing.");
    process.exit(1);
  }
}

function getVersion() {
  return execSync("node -p \"require('./package.json').version\"").toString().trim();
}

ensureClean();
const version = getVersion();
const tag = `v${version}`;

run(`git tag ${tag}`);
run(`git push origin ${tag}`);
