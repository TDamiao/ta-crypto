import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

let errorCount = 0;

function logError(msg) {
  console.error(`❌ [docs:check] ${msg}`);
  errorCount++;
}

function logInfo(msg) {
  console.log(`ℹ️ [docs:check] ${msg}`);
}

function logSuccess(msg) {
  console.log(`✅ [docs:check] ${msg}`);
}

/**
 * Collect all markdown files in the repository.
 */
function getMarkdownFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".git" && entry.name !== "dist") {
        files.push(...getMarkdownFiles(fullPath));
      }
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * 1. Check relative markdown links across all .md files.
 */
function checkRelativeLinks(mdFiles) {
  logInfo("Checking relative markdown links...");
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let checkedCount = 0;

  for (const file of mdFiles) {
    const content = fs.readFileSync(file, "utf8");
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      const linkTarget = match[2].trim();

      // Skip external links, mailto, and pure anchor links
      if (
        linkTarget.startsWith("http://") ||
        linkTarget.startsWith("https://") ||
        linkTarget.startsWith("mailto:") ||
        linkTarget.startsWith("#")
      ) {
        continue;
      }

      // Strip anchor portion
      const [filePath] = linkTarget.split("#");
      if (!filePath) continue;

      const fileDir = path.dirname(file);
      const resolvedPath = path.resolve(fileDir, filePath);

      checkedCount++;
      if (!fs.existsSync(resolvedPath)) {
        const relSource = path.relative(ROOT_DIR, file);
        logError(`Broken link in ${relSource}: "${linkTarget}" -> target not found at ${path.relative(ROOT_DIR, resolvedPath)}`);
      }
    }
  }

  logSuccess(`Verified ${checkedCount} relative markdown links across ${mdFiles.length} files.`);
}

/**
 * 2. Check package subpath exports in package.json.
 */
function checkPackageExports() {
  logInfo("Checking package.json exports mapping...");
  const pkgPath = path.resolve(ROOT_DIR, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

  const expectedSubpaths = [
    ".",
    "./indicators",
    "./crypto",
    "./candles",
    "./stateful"
  ];

  for (const subpath of expectedSubpaths) {
    const exp = pkg.exports?.[subpath];
    if (!exp) {
      logError(`Missing export mapping in package.json for subpath "${subpath}"`);
      continue;
    }

    if (typeof exp === "object") {
      if (exp.import) {
        const srcPath = path.resolve(ROOT_DIR, exp.import.replace(/^\.\/dist\//, "src/").replace(/\.js$/, ".ts"));
        if (!fs.existsSync(srcPath)) {
          logError(`Source file for export "${subpath}" not found at ${path.relative(ROOT_DIR, srcPath)}`);
        }
      }
      if (exp.types) {
        const srcTypePath = path.resolve(ROOT_DIR, exp.types.replace(/^\.\/dist\//, "src/").replace(/\.d\.ts$/, ".ts"));
        if (!fs.existsSync(srcTypePath)) {
          logError(`Source typing for export "${subpath}" not found at ${path.relative(ROOT_DIR, srcTypePath)}`);
        }
      }
    }
  }

  logSuccess("Package exports mapping verified against source structure.");
}

/**
 * 3. Check version consistency between package.json, release metadata, and docs.
 */
function checkVersionConsistency() {
  logInfo("Checking version consistency...");
  const pkg = JSON.parse(fs.readFileSync(path.resolve(ROOT_DIR, "package.json"), "utf8"));
  const manifest = JSON.parse(fs.readFileSync(path.resolve(ROOT_DIR, ".release-please-manifest.json"), "utf8"));

  const publishedVersion = pkg.version;
  const manifestVersion = manifest["."];

  if (publishedVersion !== manifestVersion) {
    logError(`Version mismatch between package.json (${publishedVersion}) and .release-please-manifest.json (${manifestVersion})`);
  }

  // Check README mentions current published version
  const readme = fs.readFileSync(path.resolve(ROOT_DIR, "README.md"), "utf8");
  if (!readme.includes(`v${publishedVersion}`)) {
    logError(`README.md does not mention current stable release v${publishedVersion}`);
  }

  // Check SECURITY.md mentions published minor and target
  const security = fs.readFileSync(path.resolve(ROOT_DIR, "SECURITY.md"), "utf8");
  const majorMinor = publishedVersion.split(".").slice(0, 2).join(".");
  if (!security.includes(`${majorMinor}.x`)) {
    logError(`SECURITY.md does not document supported status for ${majorMinor}.x`);
  }

  logSuccess(`Version consistency verified (current published stable: ${publishedVersion}).`);
}

/**
 * Main execution.
 */
function main() {
  console.log("🔍 Running ta-crypto documentation & link check...\n");

  const mdFiles = getMarkdownFiles(ROOT_DIR);
  checkRelativeLinks(mdFiles);
  checkPackageExports();
  checkVersionConsistency();

  console.log("");
  if (errorCount > 0) {
    console.error(`💥 Documentation check failed with ${errorCount} error(s).\n`);
    process.exit(1);
  } else {
    console.log("🎉 All documentation checks passed successfully!\n");
  }
}

main();
