import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

interface PackageExportTarget {
  readonly types: string;
  readonly import: string;
  readonly default: string;
}

interface PackageMetadata {
  readonly exports: {
    readonly ".": PackageExportTarget;
    readonly "./sdk": PackageExportTarget;
    readonly "./container": PackageExportTarget;
  };
  readonly scripts: {
    readonly build: string;
  };
}

function readPackageMetadata(): PackageMetadata {
  const packageJsonPath = join(process.cwd(), "package.json");
  return JSON.parse(readFileSync(packageJsonPath, "utf-8")) as PackageMetadata;
}

describe("package metadata", () => {
  test("publishes the documented SDK and container subpath exports", () => {
    const packageMetadata = readPackageMetadata();

    expect(packageMetadata.exports["."]).toEqual({
      types: "./dist/main.d.ts",
      import: "./dist/main.js",
      default: "./dist/main.js",
    });
    expect(packageMetadata.exports["./sdk"]).toEqual({
      types: "./dist/sdk/index.d.ts",
      import: "./dist/sdk/index.js",
      default: "./dist/sdk/index.js",
    });
    expect(packageMetadata.exports["./container"]).toEqual({
      types: "./dist/container.d.ts",
      import: "./dist/container.js",
      default: "./dist/container.js",
    });
  });

  test("builds runtime entrypoints for the documented public imports", () => {
    const packageMetadata = readPackageMetadata();
    const buildScript = packageMetadata.scripts.build;

    expect(buildScript).toContain("src/main.ts");
    expect(buildScript).toContain("src/sdk/index.ts");
    expect(buildScript).toContain("src/container.ts");
  });
});
