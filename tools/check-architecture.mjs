import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const ignoredDirs = new Set(["node_modules", "dist", ".svelte-kit", "cdk.out", ".git", ".data", "coverage"]);
const requiredFiles = [
  "AGENTS.md",
  "README.md",
  "docs/HARNESS_ENGINEERING.md",
  "docs/ARCHITECTURE.md",
  "docs/QUALITY.md",
  "packages/domain/src/index.ts",
  "packages/domain/src/schemas.ts",
  "packages/domain/src/validation.ts",
  "harness/src/run-evals.ts"
];
const scannedExtensions = new Set([".ts", ".svelte", ".md", ".json", ".sql", ".mjs"]);
const forbiddenTerms = [
  ["inter", "view"],
  ["re", "view"],
  ["candi", "date"],
  ["acceler", "ant"],
  ["5", "-minute"],
  ["week", "end", " proj", "ect"]
].map((parts) => parts.join(""));
const forbiddenFraming = new RegExp(`\\b(${forbiddenTerms.join("|")})\\b`, "i");

const violations = [];

for (const file of requiredFiles) {
  if (!existsSync(join(root, file))) {
    violations.push(`Missing required repository knowledge file: ${file}`);
  }
}

for (const filePath of walk(root)) {
  const relativePath = normalize(relative(root, filePath));
  const content = readFileSync(filePath, "utf8");

  if (forbiddenFraming.test(content)) {
    violations.push(`${relativePath} contains project-framing language that should not be committed.`);
  }

  if (relativePath.startsWith("packages/domain/")) {
    assertNotContains(relativePath, content, [
      "@nestjs/",
      "@aws-sdk/",
      "@sveltejs/",
      "apps/api",
      "apps/web",
      "node:fs",
      "node:path"
    ]);
  }

  if (relativePath.startsWith("apps/web/")) {
    assertNotContains(relativePath, content, ["@nestjs/", "@aws-sdk/", "apps/api", "node:fs", "node:path"]);
  }

  if (relativePath.startsWith("apps/api/")) {
    assertNotContains(relativePath, content, ["apps/web", ".svelte"]);
  }
}

if (violations.length > 0) {
  console.error("Architecture check failed:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("Architecture check passed.");

function assertNotContains(relativePath, content, forbiddenTerms) {
  for (const term of forbiddenTerms) {
    if (content.includes(term)) {
      violations.push(`${relativePath} must not reference ${term}`);
    }
  }
}

function walk(directory) {
  const files = [];

  for (const entry of readdirSync(directory)) {
    if (ignoredDirs.has(entry)) {
      continue;
    }

    const fullPath = join(directory, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    const extension = entry.includes(".") ? entry.slice(entry.lastIndexOf(".")) : "";
    if (scannedExtensions.has(extension)) {
      files.push(fullPath);
    }
  }

  return files;
}

function normalize(value) {
  return value.replace(/\\/g, "/");
}
