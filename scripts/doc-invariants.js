/**
 * Enforces the Published Documentation Version Invariant across repository files
 * and packed release artifacts (tarball package/README.md).
 *
 * @param {string} readmeContent - Raw text of the README file.
 * @param {string} pkgVersion - Full semver version from package.json (e.g. "0.4.0", "0.4.1").
 * @returns {{ valid: boolean, errors: string[], declaredVersion: string | null, declaredLine: string | null }}
 */
export function validateDocumentationVersion(readmeContent, pkgVersion) {
  const errors = [];
  if (!readmeContent || typeof readmeContent !== "string") {
    return {
      valid: false,
      errors: ["README content is empty or invalid."],
      declaredVersion: null,
      declaredLine: null
    };
  }

  const pkgParts = pkgVersion.split(".");
  const pkgMajorMinor = pkgParts.slice(0, 2).join("."); // e.g. "0.4"

  // Regex to extract explicit stable release declarations
  // e.g.:
  // - "The current stable release is `v0.3.4`." -> "0.3.4"
  // - "The current stable release line is `v0.4`." -> "0.4"
  // - "current release line is v0.4" -> "0.4"
  const declarationRegex = /(?:current stable release(?: line)? is|current release(?: line)? is|stable release is|stable release line is)\s+[`'"]?v?([0-9]+(?:\.[0-9]+)*(?:\.x)?)`?/gi;

  const matches = [];
  let match;
  while ((match = declarationRegex.exec(readmeContent)) !== null) {
    matches.push(match[1]);
  }

  let declaredVersion = null;
  let declaredLine = null;

  if (matches.length > 0) {
    for (const declared of matches) {
      const clean = declared.replace(/\.x$/i, "");
      const cleanParts = clean.split(".");
      const cleanMajorMinor = cleanParts.slice(0, 2).join(".");

      if (cleanParts.length >= 3) {
        // Declared full semver (e.g. "0.3.4" or "0.4.0")
        declaredVersion = clean;
        declaredLine = cleanMajorMinor;

        if (cleanMajorMinor !== pkgMajorMinor) {
          errors.push(
            `README declares obsolete stable version "v${declared}", but package version is "${pkgVersion}" (expected release line "v${pkgMajorMinor}").`
          );
        }
      } else {
        // Declared release line (e.g. "0.4" or "0.3")
        declaredLine = cleanMajorMinor;

        if (cleanMajorMinor !== pkgMajorMinor) {
          errors.push(
            `README declares obsolete stable release line "v${declared}", but package version is "${pkgVersion}" (expected release line "v${pkgMajorMinor}").`
          );
        }
      }
    }
  } else {
    // No explicit declaration pattern found: verify general release line presence
    if (!readmeContent.includes(`v${pkgVersion}`) && !readmeContent.includes(`v${pkgMajorMinor}`)) {
      errors.push(
        `README does not contain version "v${pkgVersion}" or release line "v${pkgMajorMinor}".`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    declaredVersion,
    declaredLine
  };
}
