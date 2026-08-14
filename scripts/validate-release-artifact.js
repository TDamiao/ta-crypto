import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

/**
 * Validates the exact release artifact (tarball, SBOM, version alignment, and npm uniqueness).
 * @param {object} options
 * @returns {{ valid: boolean, errors: string[], details: object }}
 */
export function validateReleaseArtifact(options = {}) {
  const errors = [];
  const details = {};

  const pkgPath = path.resolve(ROOT_DIR, "package.json");
  if (!fs.existsSync(pkgPath)) {
    errors.push("package.json not found in repository root.");
    return { valid: false, errors, details };
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const version = pkg.version;
  const packageName = pkg.name;
  details.packageName = packageName;
  details.version = version;

  // 1. Tag alignment check
  const expectedTag = options.expectedTag || process.env.RELEASE_TAG;
  if (expectedTag) {
    const requiredTag = `v${version}`;
    if (expectedTag !== requiredTag) {
      errors.push(`Tag mismatch: expected tag is "${expectedTag}", but package.json version ${version} requires tag "${requiredTag}".`);
    } else {
      details.tagAligned = true;
    }
  }

  // 2. Tarball existence and integrity
  const tarballPath = options.tarballPath
    ? path.resolve(process.cwd(), options.tarballPath)
    : path.resolve(ROOT_DIR, `${packageName}-${version}.tgz`);

  if (!fs.existsSync(tarballPath)) {
    errors.push(`Release tarball "${path.basename(tarballPath)}" not found on disk at ${tarballPath}. Run "npm pack" first.`);
  } else {
    details.tarball = tarballPath;
    const buf = fs.readFileSync(tarballPath);
    const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
    const sha512 = crypto.createHash("sha512").update(buf).digest("hex");
    details.tarballSha256 = sha256;
    details.tarballSha512 = sha512;

    // 3. SPDX SBOM check
    const spdxPath = options.spdxPath || path.resolve(ROOT_DIR, `${packageName}-${version}.sbom.spdx.json`);
    if (!fs.existsSync(spdxPath)) {
      errors.push(`SPDX SBOM file "${path.basename(spdxPath)}" not found. Run "node ./scripts/generate-sbom.js" first.`);
    } else {
      try {
        const spdx = JSON.parse(fs.readFileSync(spdxPath, "utf8"));
        if (spdx.spdxVersion !== "SPDX-2.3") {
          errors.push(`Invalid SPDX version in ${spdxPath}: expected "SPDX-2.3", got "${spdx.spdxVersion}".`);
        }
        const rootPkg = spdx.packages?.find(p => p.SPDXID === "SPDXRef-Package-Root");
        if (!rootPkg) {
          errors.push(`SPDX SBOM missing SPDXRef-Package-Root package entry.`);
        } else {
          if (rootPkg.name !== packageName || rootPkg.versionInfo !== version) {
            errors.push(`SPDX SBOM package name/version mismatch: expected ${packageName}@${version}, got ${rootPkg.name}@${rootPkg.versionInfo}.`);
          }
          const sbomSha256 = rootPkg.checksums?.find(c => c.algorithm === "SHA256")?.checksumValue;
          if (sbomSha256 !== sha256) {
            errors.push(`SPDX SBOM checksum mismatch: tarball SHA256 is ${sha256}, but SBOM lists ${sbomSha256}.`);
          } else {
            details.spdxValid = true;
          }
        }
      } catch (err) {
        errors.push(`Failed to parse SPDX SBOM at ${spdxPath}: ${err.message}`);
      }
    }

    // 4. CycloneDX SBOM check
    const cdxPath = options.cdxPath || path.resolve(ROOT_DIR, `${packageName}-${version}.sbom.cdx.json`);
    if (!fs.existsSync(cdxPath)) {
      errors.push(`CycloneDX SBOM file "${path.basename(cdxPath)}" not found.`);
    } else {
      try {
        const cdx = JSON.parse(fs.readFileSync(cdxPath, "utf8"));
        if (cdx.bomFormat !== "CycloneDX") {
          errors.push(`Invalid CycloneDX format in ${cdxPath}: expected "CycloneDX", got "${cdx.bomFormat}".`);
        }
        const comp = cdx.metadata?.component;
        if (!comp) {
          errors.push(`CycloneDX SBOM missing metadata.component entry.`);
        } else {
          if (comp.name !== packageName || comp.version !== version) {
            errors.push(`CycloneDX SBOM package name/version mismatch: expected ${packageName}@${version}, got ${comp.name}@${comp.version}.`);
          }
          const cdxSha256 = comp.hashes?.find(h => h.alg === "SHA-256")?.content;
          if (cdxSha256 !== sha256) {
            errors.push(`CycloneDX SBOM checksum mismatch: tarball SHA256 is ${sha256}, but SBOM lists ${cdxSha256}.`);
          } else {
            details.cdxValid = true;
          }
        }
      } catch (err) {
        errors.push(`Failed to parse CycloneDX SBOM at ${cdxPath}: ${err.message}`);
      }
    }
  }

  // 5. Check duplicate publication on npm (if requested)
  if (options.checkNpm) {
    try {
      const output = execSync(`npm view "${packageName}@${version}" version`, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }).trim();
      if (output === version) {
        errors.push(`Package "${packageName}@${version}" already exists on npm registry. Duplicate publication is forbidden.`);
        details.npmDuplicate = true;
      }
    } catch (_) {
      // Non-zero exit code means version does not exist on npm (which is expected for a new release)
      details.npmDuplicate = false;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    details
  };
}

// CLI entry point
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const tagArg = args.find(a => a.startsWith("--tag="));
  const expectedTag = tagArg ? tagArg.split("=")[1] : process.env.RELEASE_TAG;
  const checkNpm = args.includes("--check-npm");

  const result = validateReleaseArtifact({ expectedTag, checkNpm });

  if (result.valid) {
    console.log(`✅ [validate-release-artifact] Release artifact and metadata validation passed for ${result.details.packageName}@${result.details.version}:`);
    console.log(`  - Tarball:    ${path.basename(result.details.tarball)}`);
    console.log(`  - SHA-256:    ${result.details.tarballSha256}`);
    console.log(`  - SPDX SBOM:  VALID`);
    console.log(`  - CDX SBOM:   VALID`);
    if (result.details.tagAligned) console.log(`  - Tag:        ${expectedTag} (ALIGNED)`);
    process.exit(0);
  } else {
    console.error(`\n❌ [validate-release-artifact] Release artifact validation FAILED (${result.errors.length} error(s)):\n`);
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    console.error("\nPublication MUST NOT proceed until all validation checks pass.\n");
    process.exit(1);
  }
}
