import { execSync } from "node:child_process";

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

function getVersion() {
  const pkg = JSON.parse(execSync("node -p \"require('./package.json').version\"").toString());
  return pkg;
}

const version = getVersion();
const tag = `v${version}`;

run(`git tag ${tag}`);
run(`git push origin ${tag}`);

