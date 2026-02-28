import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Read package.json to get version information.
 *
 * @returns Package version string
 */
export function getPackageVersion(): string {
  try {
    // Read package.json from project root (two levels up from dist/cli/*.js)
    const packageJsonPath = join(__dirname, "../../package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8")) as {
      version: string;
    };
    return packageJson.version;
  } catch (_error) {
    // Fallback if package.json cannot be read
    return "unknown";
  }
}
