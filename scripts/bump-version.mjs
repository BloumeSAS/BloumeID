import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const level = args.find((a) => ["patch", "minor", "major"].includes(a));
const includeSdk = args.includes("--all") || args.includes("--sdk");

if (!level) {
  console.error("Usage: node scripts/bump-version.mjs <patch|minor|major> [--all|--sdk]");
  process.exit(1);
}

function bumpSemver(version, kind) {
  const [maj = 1, min = 0, pat = 0] = version.split(".").map(Number);
  if (kind === "major") return `${maj + 1}.0.0`;
  if (kind === "minor") return `${maj}.${min + 1}.0`;
  return `${maj}.${min}.${pat + 1}`;
}

function replaceInFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, "utf8");
  for (const [pattern, replacement] of replacements) {
    content = content.replace(pattern, replacement);
  }
  fs.writeFileSync(filePath, content, "utf8");
}

const rootPkgPath = path.resolve(process.cwd(), "package.json");
const webPkgPath = path.resolve(process.cwd(), "apps/web/package.json");
const rootReadmePath = path.resolve(process.cwd(), "README.md");

const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf8"));
const nextAppVersion = bumpSemver(rootPkg.version, level);

for (const file of [rootPkgPath, webPkgPath]) {
  const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
  pkg.version = nextAppVersion;
  fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + "\n", "utf8");
}

replaceInFile(rootReadmePath, [
  [/# BloumeID v\d+\.\d+\.\d+/g, `# BloumeID v${nextAppVersion}`],
  [/badge\/version-v\d+\.\d+\.\d+/g, `badge/version-v${nextAppVersion}`],
  [/\*\*BloumeID v\d+\.\d+\.\d+\*\*/g, `**BloumeID v${nextAppVersion}**`],
]);

console.log(`Bumped BloumeID app version: ${rootPkg.version} -> ${nextAppVersion} (${level})`);

if (includeSdk) {
  const sdkPkgPath = path.resolve(process.cwd(), "packages/bloumeid/package.json");
  const sdkIndexPath = path.resolve(process.cwd(), "packages/bloumeid/src/index.ts");
  const sdkReadmePath = path.resolve(process.cwd(), "packages/bloumeid/README.md");

  if (!fs.existsSync(sdkPkgPath)) {
    console.error("SDK package.json not found at packages/bloumeid/package.json");
    process.exit(1);
  }

  const sdkPkg = JSON.parse(fs.readFileSync(sdkPkgPath, "utf8"));
  const prevSdkVersion = sdkPkg.version;
  const nextSdkVersion = bumpSemver(prevSdkVersion, level);
  sdkPkg.version = nextSdkVersion;
  fs.writeFileSync(sdkPkgPath, JSON.stringify(sdkPkg, null, 2) + "\n", "utf8");

  replaceInFile(sdkIndexPath, [
    [/export const SDK_VERSION = "\d+\.\d+\.\d+";/g, `export const SDK_VERSION = "${nextSdkVersion}";`],
  ]);

  replaceInFile(sdkReadmePath, [
    [/@bloume\/id v\d+\.\d+\.\d+/g, `@bloume/id v${nextSdkVersion}`],
    [/badge\/version-v\d+\.\d+\.\d+/g, `badge/version-v${nextSdkVersion}`],
  ]);

  replaceInFile(rootReadmePath, [
    [/badge\/SDK_%40bloume%2Fid-v\d+\.\d+\.\d+/g, `badge/SDK_%40bloume%2Fid-v${nextSdkVersion}`],
  ]);

  console.log(`Bumped @bloume/id SDK version: ${prevSdkVersion} -> ${nextSdkVersion} (${level})`);
  console.log("Rebuilding @bloume/id SDK...");
  execSync("pnpm --filter @bloume/id build", { stdio: "inherit" });
}
