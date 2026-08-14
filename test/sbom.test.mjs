import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { generateSBOMForTarball, computeHashes } from "../scripts/generate-sbom.js";
import { validateReleaseArtifact } from "../scripts/validate-release-artifact.js";

const TEST_DIR = path.resolve(process.cwd(), "test");
const PKG = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf8"));
const TARBALL_NAME = `${PKG.name}-${PKG.version}.tgz`;
const TARBALL_PATH = path.resolve(process.cwd(), TARBALL_NAME);
const SPDX_PATH = path.resolve(process.cwd(), `${PKG.name}-${PKG.version}.sbom.spdx.json`);
const CDX_PATH = path.resolve(process.cwd(), `${PKG.name}-${PKG.version}.sbom.cdx.json`);

test("SBOM: generates canonical SPDX 2.3 and CycloneDX 1.5 JSON from exact packed tarball", () => {
  // Ensure tarball exists
  if (!fs.existsSync(TARBALL_PATH)) {
    execSync("npm pack", { stdio: "ignore" });
  }

  const { spdx, cyclonedx, tarballHashes } = generateSBOMForTarball(TARBALL_PATH);

  // Assert SPDX 2.3 schema integrity
  assert.equal(spdx.spdxVersion, "SPDX-2.3");
  assert.equal(spdx.dataLicense, "CC0-1.0");
  assert.equal(spdx.SPDXID, "SPDXRef-DOCUMENT");
  assert.equal(spdx.packages[0].name, "ta-crypto");
  assert.equal(spdx.packages[0].versionInfo, PKG.version);
  assert.equal(spdx.packages[0].licenseConcluded, "MIT");
  assert.ok(spdx.packages[0].checksums.some(c => c.algorithm === "SHA256" && c.checksumValue === tarballHashes.sha256));
  assert.ok(spdx.files.length > 0, "SPDX files list must not be empty");

  // Assert CycloneDX 1.5 schema integrity
  assert.equal(cyclonedx.bomFormat, "CycloneDX");
  assert.equal(cyclonedx.specVersion, "1.5");
  assert.equal(cyclonedx.metadata.component.name, "ta-crypto");
  assert.equal(cyclonedx.metadata.component.version, PKG.version);
  assert.ok(cyclonedx.metadata.component.hashes.some(h => h.alg === "SHA-256" && h.content === tarballHashes.sha256));

  // Write out for validation tests
  fs.writeFileSync(SPDX_PATH, JSON.stringify(spdx, null, 2), "utf8");
  fs.writeFileSync(CDX_PATH, JSON.stringify(cyclonedx, null, 2), "utf8");
});

test("validateReleaseArtifact: succeeds when tarball, SBOMs, and tag match", () => {
  const result = validateReleaseArtifact({
    expectedTag: `v${PKG.version}`,
    tarballPath: TARBALL_PATH,
    spdxPath: SPDX_PATH,
    cdxPath: CDX_PATH
  });

  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
  assert.equal(result.details.tagAligned, true);
  assert.equal(result.details.spdxValid, true);
  assert.equal(result.details.cdxValid, true);
});

test("validateReleaseArtifact: detects tag mismatch", () => {
  const result = validateReleaseArtifact({
    expectedTag: "v9.9.9",
    tarballPath: TARBALL_PATH,
    spdxPath: SPDX_PATH,
    cdxPath: CDX_PATH
  });

  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.includes("Tag mismatch")));
});

test("validateReleaseArtifact: detects tampered tarball or checksum mismatch in SBOM", () => {
  const fakeSpdxPath = path.resolve(TEST_DIR, "fake.sbom.spdx.json");
  const validSpdx = JSON.parse(fs.readFileSync(SPDX_PATH, "utf8"));
  validSpdx.packages[0].checksums[0].checksumValue = "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
  fs.writeFileSync(fakeSpdxPath, JSON.stringify(validSpdx, null, 2), "utf8");

  try {
    const result = validateReleaseArtifact({
      expectedTag: `v${PKG.version}`,
      tarballPath: TARBALL_PATH,
      spdxPath: fakeSpdxPath,
      cdxPath: CDX_PATH
    });

    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes("SPDX SBOM checksum mismatch")));
  } finally {
    if (fs.existsSync(fakeSpdxPath)) fs.unlinkSync(fakeSpdxPath);
  }
});
