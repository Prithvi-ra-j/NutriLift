const fs = require("node:fs");
const path = require("node:path");

const forbiddenPermissions = [
  "android.permission.SYSTEM_ALERT_WINDOW",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.WRITE_EXTERNAL_STORAGE",
  "android.permission.MODIFY_AUDIO_SETTINGS",
];
const requiredPermissions = [
  "android.permission.CAMERA",
  "android.permission.RECORD_AUDIO",
  "android.permission.INTERNET",
  "android.permission.VIBRATE",
];

function findReleaseManifests(directory) {
  if (!fs.existsSync(directory)) return [];
  const matches = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      matches.push(...findReleaseManifests(entryPath));
    } else if (
      entry.name === "AndroidManifest.xml" &&
      /(?:merged_manifest|merged_manifests)/i.test(entryPath) &&
      /[\\/]release[\\/]/i.test(entryPath)
    ) {
      matches.push(entryPath);
    }
  }
  return matches;
}

function checkManifest(manifestPath) {
  const xml = fs.readFileSync(manifestPath, "utf8");
  const application = xml.match(/<application\b[^>]*>/s)?.[0];
  const backupValue = application?.match(/\bandroid:allowBackup="(true|false)"/)?.[1];
  const backupRules = application?.match(/\bandroid:(?:fullBackupContent|dataExtractionRules)="([^"]+)"/g) ?? [];
  const permissions = [...xml.matchAll(/<uses-permission(?:-[\w-]+)?\b[^>]*android:name="([^"]+)"/g)]
    .map((match) => match[1]);
  const errors = [];

  if (backupValue !== "false") {
    errors.push(`expected android:allowBackup="false", found "${backupValue ?? "missing"}"`);
  }
  if (backupRules.length > 0) {
    errors.push(`unexpected Android backup rules remain enabled: ${backupRules.join(", ")}`);
  }
  for (const permission of forbiddenPermissions) {
    if (permissions.includes(permission)) errors.push(`forbidden permission is present: ${permission}`);
  }
  for (const permission of requiredPermissions) {
    if (!permissions.includes(permission)) errors.push(`required permission is missing: ${permission}`);
  }

  return errors;
}

const manifests = process.argv[2]
  ? [path.resolve(process.argv[2])]
  : findReleaseManifests(path.resolve("android/app/build/intermediates"));

if (manifests.length === 0) {
  console.error("Android manifest check failed: no merged release manifest was found.");
  process.exit(1);
}

let failed = false;
for (const manifestPath of manifests) {
  const errors = checkManifest(manifestPath);
  if (errors.length > 0) {
    failed = true;
    console.error(`${manifestPath}:`);
    for (const error of errors) console.error(`  - ${error}`);
  } else {
    console.log(`Android manifest security checks passed: ${manifestPath}`);
  }
}

if (failed) process.exit(1);
