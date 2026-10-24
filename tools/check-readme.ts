const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const readmePath = path.join(root, "README.md");
const registryPath = path.join(root, "docs", "features.json");
const readme = fs.readFileSync(readmePath, "utf8");
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));

function fail(message: string): never {
  console.error(`README check failed: ${message}`);
  process.exit(1);
}

if (!Array.isArray(registry.features)) {
  fail("docs/features.json must contain a features array.");
}

const startMarker = "<!-- features:start -->";
const endMarker = "<!-- features:end -->";
const start = readme.indexOf(startMarker);
const end = readme.indexOf(endMarker);
if (start < 0 || end <= start) {
  fail("README.md is missing the feature-table markers.");
}

const table = readme.slice(start + startMarker.length, end);
const rows = table
  .split(/\r?\n/)
  .filter((line: string) => line.trim().startsWith("|"))
  .map((line: string) =>
    line
      .split("|")
      .slice(1, -1)
      .map((cell: string) => cell.trim().replace(/^`|`$/g, "")),
  )
  .filter((cells: string[]) => cells.length === 3 && cells[0] !== "---");

const expectedHeader = ["Feature", "State", "Test file"];
if (JSON.stringify(rows[0]) !== JSON.stringify(expectedHeader)) {
  fail("README feature table header must be Feature | State | Test file.");
}

const readmeFeatures = rows.slice(1);
const registryFeatures = registry.features.map(
  (feature: { name: string; state: string; testFile: string }) => [
    feature.name,
    feature.state,
    feature.testFile,
  ],
);
if (JSON.stringify(readmeFeatures) !== JSON.stringify(registryFeatures)) {
  fail("README feature table and docs/features.json do not match.");
}

for (const feature of registry.features) {
  if (!["Working", "Beta", "Planned"].includes(feature.state)) {
    fail(`Invalid state for feature "${feature.name}".`);
  }
  if (typeof feature.testFile !== "string" || feature.testFile.length === 0) {
    fail(`Feature "${feature.name}" must name its test file.`);
  }
  if (!fs.existsSync(path.join(root, feature.testFile))) {
    fail(`Test file does not exist for "${feature.name}": ${feature.testFile}`);
  }
}

console.log("README feature table matches docs/features.json.");
