import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { validateDocumentationVersion } from "../scripts/doc-invariants.js";
import { validateReleaseArtifact } from "../scripts/validate-release-artifact.js";

const PKG = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf8"));
const TARBALL_NAME = `${PKG.name}-${PKG.version}.tgz`;
const TARBALL_PATH = path.resolve(process.cwd(), TARBALL_NAME);
const SPDX_PATH = path.resolve(process.cwd(), `${PKG.name}-${PKG.version}.sbom.spdx.json`);
const CDX_PATH = path.resolve(process.cwd(), `${PKG.name}-${PKG.version}.sbom.cdx.json`);

test("doc-invariants: rejects post-release incident scenario (stale v0.3.4 masked by incidental v0.4 mention)", () => {
  const incidentReadme = `
# ta-crypto

Technical analysis indicators and crypto-market utilities for Node.js. The current stable release is \`v0.3.4\`.

## Choose an API
| Task | Use | Reference |
| --- | --- | --- |
| Calculate indicators | \`sma\`, \`rsi\` | [Indicators](docs/indicators.md) |

Known behavior in v0.4 includes positive price domain enforcement.
`;

  const result = validateDocumentationVersion(incidentReadme, "0.4.0");
  assert.equal(result.valid, false, "Incident README with stale v0.3.4 declaration must fail");
  assert.ok(
    result.errors.some(e => e.includes("README declares obsolete stable version \"v0.3.4\"")),
    "Error message must explicitly cite obsolete stable version v0.3.4"
  );
});

test("doc-invariants: accepts release line wording matching candidate package version (v0.4 for 0.4.1)", () => {
  const validReadme = `
# ta-crypto

Technical analysis indicators and crypto-market utilities for Node.js. The current stable release line is \`v0.4\`.

## Install
\`\`\`bash
npm install ta-crypto
\`\`\`
`;

  const result = validateDocumentationVersion(validReadme, "0.4.1");
  assert.equal(result.valid, true, "Release line v0.4 must be valid for package 0.4.1");
  assert.equal(result.errors.length, 0);
  assert.equal(result.declaredLine, "0.4");
});

test("doc-invariants: accepts exact patch version matching candidate package version (v0.4.0 for 0.4.0)", () => {
  const validReadme = `
# ta-crypto

Technical analysis indicators and crypto-market utilities for Node.js. The current stable release is \`v0.4.0\`.
`;

  const result = validateDocumentationVersion(validReadme, "0.4.0");
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
  assert.equal(result.declaredVersion, "0.4.0");
});

test("doc-invariants: rejects outdated release line when bumping to new minor (v0.4 line in 0.5.0)", () => {
  const outdatedReadme = `
# ta-crypto

Technical analysis indicators and crypto-market utilities for Node.js. The current stable release line is \`v0.4\`.
`;

  const result = validateDocumentationVersion(outdatedReadme, "0.5.0");
  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(e => e.includes("README declares obsolete stable release line \"v0.4\"")),
    "Must reject v0.4 release line when package is 0.5.0"
  );
});

test("doc-invariants: handles empty or non-string README content deterministically", () => {
  const resultNull = validateDocumentationVersion(null, "0.4.0");
  assert.equal(resultNull.valid, false);
  assert.ok(resultNull.errors[0].includes("empty or invalid"));

  const resultEmpty = validateDocumentationVersion("", "0.4.0");
  assert.equal(resultEmpty.valid, false);
  assert.ok(resultEmpty.errors[0].includes("empty or invalid"));
});

test("doc-invariants: rejects contradictory multiple stable declarations in README", () => {
  const contradictoryReadme = `
# ta-crypto
The current stable release line is \`v0.4\`.
Also, current release is \`v0.3.4\`.
`;
  const result = validateDocumentationVersion(contradictoryReadme, "0.4.0");
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.includes("README declares obsolete stable version \"v0.3.4\"")));
});

test("doc-invariants: rejects README without any version or release line declaration", () => {
  const unversionedReadme = `
# ta-crypto

Technical analysis indicators for Node.js.
`;

  const result = validateDocumentationVersion(unversionedReadme, "0.4.0");
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.includes("does not contain version")));
});

test("validateReleaseArtifact: validates internal package/README.md inside packed tarball", () => {
  // Ensure fresh pack exists
  execSync("npm pack", { stdio: "ignore" });
  execSync("node ./scripts/generate-sbom.js", { stdio: "ignore" });

  const result = validateReleaseArtifact({
    expectedTag: `v${PKG.version}`,
    tarballPath: TARBALL_PATH,
    spdxPath: SPDX_PATH,
    cdxPath: CDX_PATH
  });

  assert.equal(result.valid, true, "Real packed release artifact must pass all validations");
  assert.equal(result.details.tarballDocsValid, true, "tarballDocsValid must be true");
  assert.equal(result.details.tarballPkgValid, true, "tarballPkgValid must be true");
});

test("validateReleaseArtifact: fails if tarball contains stale README version declaration", () => {
  const scratchDir = path.resolve(process.cwd(), "test", "fixtures", "stale-tarball-test");
  fs.mkdirSync(scratchDir, { recursive: true });

  const tempPkgDir = path.join(scratchDir, "package");
  fs.mkdirSync(tempPkgDir, { recursive: true });

  // Create fake package with stale README
  fs.writeFileSync(
    path.join(tempPkgDir, "package.json"),
    JSON.stringify({ name: "ta-crypto", version: PKG.version }, null, 2),
    "utf8"
  );
  fs.writeFileSync(
    path.join(tempPkgDir, "README.md"),
    "# ta-crypto\n\nThe current stable release is `v0.1.0`.\n",
    "utf8"
  );

  const fakeTarballPath = path.join(scratchDir, `ta-crypto-${PKG.version}.tgz`);
  execSync(`tar -czf "${fakeTarballPath}" -C "${scratchDir}" package`, { stdio: "ignore" });

  try {
    const result = validateReleaseArtifact({
      expectedTag: `v${PKG.version}`,
      tarballPath: fakeTarballPath,
      spdxPath: SPDX_PATH,
      cdxPath: CDX_PATH
    });

    assert.equal(result.valid, false);
    assert.ok(
      result.errors.some(e => e.includes("Tarball package/README.md version invariant violation")),
      "Must fail with tarball README version invariant violation"
    );
  } finally {
    fs.rmSync(scratchDir, { recursive: true, force: true });
  }
});
