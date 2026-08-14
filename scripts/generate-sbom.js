import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

/**
 * Computes SHA-256 and SHA-512 hashes for a given file buffer or path.
 * @param {Buffer} buffer 
 * @returns {{ sha256: string, sha512: string }}
 */
export function computeHashes(buffer) {
  return {
    sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
    sha512: crypto.createHash("sha512").update(buffer).digest("hex")
  };
}

/**
 * Generates both SPDX 2.3 JSON and CycloneDX 1.5 JSON SBOMs for an exact npm tarball.
 * @param {string} tarballPath - Absolute or relative path to the .tgz artifact.
 * @param {object} options
 * @returns {{ spdx: object, cyclonedx: object, tarballHashes: { sha256: string, sha512: string } }}
 */
export function generateSBOMForTarball(tarballPath, options = {}) {
  const resolvedTarball = path.resolve(process.cwd(), tarballPath);
  if (!fs.existsSync(resolvedTarball)) {
    throw new Error(`Tarball not found at ${resolvedTarball}`);
  }

  const pkgJsonPath = path.resolve(ROOT_DIR, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
  const tarballBuffer = fs.readFileSync(resolvedTarball);
  const tarballHashes = computeHashes(tarballBuffer);
  const tarballName = path.basename(resolvedTarball);

  // Inspect files inside tarball using tar tf / npm pack manifest
  let fileList = [];
  try {
    const tarOutput = execSync(`tar -tf "${resolvedTarball}"`, { encoding: "utf8" });
    fileList = tarOutput.trim().split("\n").filter(Boolean);
  } catch (_) {
    // Fallback if system tar is not standard
    fileList = pkg.files ?? ["dist", "docs", "README.md", "LICENSE", "package.json"];
  }

  const timestamp = options.timestamp || new Date().toISOString();
  const spdxDocNamespace = `https://github.com/TDamiao/ta-crypto/releases/tag/v${pkg.version}/sbom-${tarballHashes.sha256.slice(0, 16)}`;

  // 1. Canonical SPDX 2.3 JSON
  const spdx = {
    spdxVersion: "SPDX-2.3",
    dataLicense: "CC0-1.0",
    SPDXID: "SPDXRef-DOCUMENT",
    name: `${pkg.name}-${pkg.version}`,
    documentNamespace: spdxDocNamespace,
    creationInfo: {
      creators: [
        "Organization: ta-crypto",
        "Tool: ta-crypto-sbom-generator-1.0.0"
      ],
      created: timestamp
    },
    packages: [
      {
        name: pkg.name,
        SPDXID: "SPDXRef-Package-Root",
        versionInfo: pkg.version,
        packageFileName: tarballName,
        downloadLocation: `git+https://github.com/TDamiao/ta-crypto.git@v${pkg.version}`,
        filesAnalyzed: true,
        licenseConcluded: pkg.license || "MIT",
        licenseDeclared: pkg.license || "MIT",
        copyrightText: "Copyright (c) 2026 ta-crypto contributors",
        description: pkg.description || "Technical analysis for crypto markets in Node.js",
        homepage: pkg.homepage || "https://github.com/TDamiao/ta-crypto#readme",
        checksums: [
          { algorithm: "SHA256", checksumValue: tarballHashes.sha256 },
          { algorithm: "SHA512", checksumValue: tarballHashes.sha512 }
        ],
        externalRefs: [
          {
            referenceCategory: "PACKAGE-MANAGER",
            referenceType: "purl",
            referenceLocator: `pkg:npm/${pkg.name}@${pkg.version}`
          }
        ]
      }
    ],
    files: fileList.map((f, idx) => ({
      fileName: f,
      SPDXID: `SPDXRef-File-${idx}`,
      checksums: []
    })),
    relationships: [
      {
        spdxElementId: "SPDXRef-DOCUMENT",
        relationshipType: "DESCRIBES",
        relatedSpdxElement: "SPDXRef-Package-Root"
      }
    ]
  };

  // 2. Canonical CycloneDX 1.5 JSON
  const cyclonedx = {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    serialNumber: `urn:uuid:${crypto.randomUUID()}`,
    version: 1,
    metadata: {
      timestamp,
      tools: [
        {
          vendor: "ta-crypto",
          name: "ta-crypto-sbom-generator",
          version: "1.0.0"
        }
      ],
      component: {
        type: "library",
        "bom-ref": `pkg:npm/${pkg.name}@${pkg.version}`,
        name: pkg.name,
        version: pkg.version,
        description: pkg.description || "Technical analysis for crypto markets in Node.js",
        licenses: [
          {
            license: {
              id: pkg.license || "MIT"
            }
          }
        ],
        purl: `pkg:npm/${pkg.name}@${pkg.version}`,
        hashes: [
          { alg: "SHA-256", content: tarballHashes.sha256 },
          { alg: "SHA-512", content: tarballHashes.sha512 }
        ],
        externalReferences: [
          {
            type: "vcs",
            url: "git+https://github.com/TDamiao/ta-crypto.git"
          },
          {
            type: "website",
            url: "https://github.com/TDamiao/ta-crypto#readme"
          },
          {
            type: "issue-tracker",
            url: "https://github.com/TDamiao/ta-crypto/issues"
          }
        ]
      }
    },
    components: []
  };

  return {
    spdx,
    cyclonedx,
    tarballHashes
  };
}

// CLI entry point
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  let tarballPath = args.find(a => !a.startsWith("--"));

  if (!tarballPath) {
    // Look for existing .tgz in root
    const pkg = JSON.parse(fs.readFileSync(path.resolve(ROOT_DIR, "package.json"), "utf8"));
    const defaultTarball = path.resolve(ROOT_DIR, `${pkg.name}-${pkg.version}.tgz`);
    if (fs.existsSync(defaultTarball)) {
      tarballPath = defaultTarball;
    } else {
      console.log(`[generate-sbom] No tarball specified. Packing package via npm pack...`);
      const packedFile = execSync("npm pack", { cwd: ROOT_DIR, encoding: "utf8" }).trim().split("\n").pop().trim();
      tarballPath = path.resolve(ROOT_DIR, packedFile);
    }
  }

  const { spdx, cyclonedx, tarballHashes } = generateSBOMForTarball(tarballPath);
  const pkg = JSON.parse(fs.readFileSync(path.resolve(ROOT_DIR, "package.json"), "utf8"));

  const outDir = path.dirname(path.resolve(process.cwd(), tarballPath));
  const spdxOut = path.resolve(outDir, `${pkg.name}-${pkg.version}.sbom.spdx.json`);
  const cdxOut = path.resolve(outDir, `${pkg.name}-${pkg.version}.sbom.cdx.json`);

  fs.writeFileSync(spdxOut, JSON.stringify(spdx, null, 2) + "\n", "utf8");
  fs.writeFileSync(cdxOut, JSON.stringify(cyclonedx, null, 2) + "\n", "utf8");

  console.log(`✅ [generate-sbom] Generated SBOMs for ${path.basename(tarballPath)}:`);
  console.log(`  - SPDX 2.3 JSON:   ${spdxOut}`);
  console.log(`  - CycloneDX 1.5:   ${cdxOut}`);
  console.log(`  - SHA-256 hash:    ${tarballHashes.sha256}`);
}
