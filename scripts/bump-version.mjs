import fs from "node:fs";
import path from "node:path";

const level = process.argv[2];
if (!["patch", "minor", "major"].includes(level)) {
  console.error("Usage: node scripts/bump-version.mjs <patch|minor|major>");
  process.exit(1);
}

const files = [
  path.resolve(process.cwd(), "package.json"),
  path.resolve(process.cwd(), "apps/web/package.json"),
];

function bumpSemver(version, kind) {
  const [maj = 1, min = 0, pat = 0] = version.split(".").map(Number);
  if (kind === "major") return `${maj + 1}.0.0`;
  if (kind === "minor") return `${maj}.${min + 1}.0`;
  return `${maj}.${min}.${pat + 1}`;
}

const rootPkg = JSON.parse(fs.readFileSync(files[0], "utf8"));
const nextVersion = bumpSemver(rootPkg.version, level);

for (const file of files) {
  const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
  pkg.version = nextVersion;
  fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + "\n", "utf8");
}

console.log(`Bumped version: ${rootPkg.version} -> ${nextVersion} (${level})`);
