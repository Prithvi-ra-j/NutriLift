const fs: typeof import("node:fs") = require("node:fs");
const path: typeof import("node:path") = require("node:path");

const root = path.resolve(__dirname, "..");
const failures: string[] = [];

function visit(directory: string, enforceLineLimit: boolean): void {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      visit(file, enforceLineLimit);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;

    const source: string = fs.readFileSync(file, "utf8");
    const lines = source.split(/\r?\n/).length - (source.endsWith("\n") ? 1 : 0);
    if (enforceLineLimit && lines > 300) {
      failures.push(`File exceeds 300 lines (${lines}): ${path.relative(root, file)}`);
    }
    if (entry.name.endsWith(".tsx")) {
      const stateCount = source.match(/\buseState\s*\(/g)?.length ?? 0;
      if (stateCount > 5) {
        failures.push(
          `File has more than five useState calls (${stateCount}): ${path.relative(root, file)}`,
        );
      }
    }
  }
}

for (const directory of ["app", "lib", "components"]) {
  visit(path.join(root, directory), directory !== "components");
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("Size check passed for app/ and lib/.\n");
}
