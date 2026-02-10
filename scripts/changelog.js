import { execSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync } from "node:fs";

function run(cmd) {
  return execSync(cmd).toString().trim();
}

function getLatestTag() {
  try {
    return run("git describe --tags --abbrev=0");
  } catch {
    return null;
  }
}

function getVersion() {
  return run("node -p \"require('./package.json').version\"");
}

const tag = getLatestTag();
const range = tag ? `${tag}..HEAD` : "";
const log = run(`git log ${range} --pretty=format:"- %s"`);
const date = new Date().toISOString().slice(0, 10);
const version = getVersion();

if (!log) {
  console.log("No commits to include in changelog.");
  process.exit(0);
}

const header = `\n## ${version} - ${date}\n\n`;
const body = `${log}\n`;
const file = "CHANGELOG.md";

if (!existsSync(file)) {
  appendFileSync(file, "# Changelog\n");
}

const current = readFileSync(file).toString();
appendFileSync(file, header + body);
console.log(`Updated ${file}`);
