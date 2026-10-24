NutriLift - Path to 9/10: Exact Implementation Plan
Oct 17, 2026 · @Prithvi
This plan takes every section of the audit from its current score to 9/10 or higher, in an order where each step makes the next one safer. Each section lists exact files, exact changes and checkable 'Done when' boxes; a section reaches 9/10 when all its boxes are ticked.
Rules for the executing agent (paste first)
1. One branch per section (fix/s1-ci, fix/s2-security, ...), one commit per numbered step, npm run verify green before each commit (that script is created in Section 1).
2. Migrations are additive and tested against a v0 fixture DB (a copy of a real current install). Never drop or rewrite user rows except where a step says so.
3. No new dependency unless the step names it. No any, no @ts-nocheck, no console.*, no toISOString().split(...) in any file you touch.
4. If a step's assumption is false (file missing, function renamed), stop and report. Do not improvise a different design.
5. Every bug fix gets a failing test first. Every step ends by running npx tsc --noEmit and npx jest --ci.
6. Times are ISO-8601 UTC strings in storage and local YYYY-MM-DD strings for 'which day'. Both come from helpers in lib/time/ (Section 4); never hand-roll.
Execution order
Order
Section
Audit section
Score now to target
Needs
1
Build, CI and the test gate
10 + 9 (gate)
2.0 to 9
nothing
2
Security and privacy
5
3.0 to 9
1
3
Data layer and migrations
1
3.0 to 9
1
4
Time, state and lifecycle
7
3.5 to 9
3
5
Domain logic
2
4.0 to 9
3, 4
6
Sync and Supabase
3
4.5 to 9
3, 5
7
AI layer and edge functions
4
4.0 to 9
2, 3
8
Architecture
6
4.0 to 9
5, 6, 7
9
UI/UX, accessibility, performance
8
4.5 to 9
8
10
Testing depth
9
3.0 to 9
5, 6
11
Docs and process
11
4.0 to 9
8
12
Vision and product safety
12
5.0 to 9
7, 9
1. Build, CI and the test gate (2.0 to 9)
Target state: a fresh clone type-checks, lints, tests and builds with one command each; CI blocks bad merges; release builds are reproducible and properly signed; no stray files.
1. Make the gate runnable. Delete lib/db/__tests__/migration-contract.test.ts (syntax error toBe(9;, imports a nonexistent ../migration-contract, asserts tables that do not exist). Section 3 replaces it with real migration tests. Then delete features/train/ (no importers, imports the missing components/ui/PressableScale). Run npx tsc --noEmit; it must report 0 errors.
2. Add scripts to package.json:
    ◦ typecheck: tsc --noEmit
    ◦ lint: eslint .
    ◦ verify: npm run typecheck && npm run lint && npm test -- --ci
3. Add ESLint with npx expo install eslint eslint-config-expo eslint-plugin-react-native. Create eslint.config.js:
const expo = require('eslint-config-expo/flat');
const strict = {
  'no-console': 'error',
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/ban-ts-comment': 'error',
  'react-native/no-inline-styles': 'error',
  'no-restricted-syntax': ['error', {
    selector: `CallExpression[callee.property.name='split'][callee.object.callee.property.name='toISOString']`,
    message: 'Use localDateString() from lib/time/localDate',
  }],
};
const ratchet = Object.fromEntries(Object.keys(strict).map((k) => [k, 'warn']));
module.exports = [
  ...expo,
  { ignores: ['android/**', 'ios/**', 'dist/**', 'drizzle/**'] },
  { rules: ratchet },
  { files: ['lib/domain/**', 'lib/time/**', 'lib/data/**', 'lib/ai/**', 'lib/sync/**'], rules: strict },
];
Existing code stays at warn (ratchet); the new folders are error from day one. Section 8 flips the global rules to strict.
4. Replace the workflow. Delete .github/workflows/build-apk.yml. Create .github/workflows/ci.yml (triggers: pull_request and push to main): checkout, actions/setup-node@v4 with node 20 and cache: npm, npm ci, npm run verify. Create .github/workflows/release.yml (trigger: tags v*; first a job that runs the same verify steps, then a build job that needs it): expo/expo-github-action@v8 with eas-version pinned to the exact version npx eas-cli --version prints on your machine (no latest), no expo-version, then eas build --platform android --profile production --non-interactive. Pushes to main no longer trigger cloud builds.
5. Fix the asset ignore rules. In .gitignore delete the whole 'Assets and Media' block (*.png *.jpg *.jpeg *.gif *.svg *.webp *.ico *.mp4 and the rest) and the docs/ line. Create assets/ with icon.png (1024x1024), splash-icon.png, adaptive-icon.png (1024x1024, key art inside the central 66%) and favicon.png; commit them. If the originals are lost, export new ones from your design source.
6. Move to Continuous Native Generation (one native source of truth). Run git rm -r --cached android and add /android and /ios to .gitignore. In app.json plugins, add the expo-camera plugin with a cameraPermission string such as 'NutriLift scans barcodes to look up foods.' Verify with npx expo prebuild --platform android --clean in a scratch copy: it must exit 0 and generate the res/xml/secure_store_* files and launcher icons from assets/. This removes the debug-keystore release signing, the missing res/xml and mipmap resources, and the 'two configs, one silently wins' trap.
7. EAS profiles (eas.json). development stays (dev client, apk). preview: distribution: internal, apk. production: android.buildType: app-bundle and autoIncrement: true. Run eas credentials -p android and let EAS generate and hold the release keystore; download a backup of it into your password manager.
8. Updates policy. In app.json replace runtimeVersion: 1.0.0 with the object { policy: fingerprint } (JSON: "runtimeVersion": { "policy": "fingerprint" }) and set updates.checkAutomatically to ON_LOAD. An OTA update can now only reach binaries whose native code matches.
9. Delete clutter: fix-ts.js, fix-ts-2.js, check-tasks.js, scripts/delete-sunday-workout.js, scripts/delete-sunday-workout.ts, lib/db/queries/delete-sunday-workout.ts, scripts/watch-build.ps1. Run grep -rn delete-sunday . first; it must return nothing outside those files. Move lib/db/seed-dummy-data.ts, scripts/add-dummy-week-data.ts and scripts/run-seed.js to tools/dev/ (outside app/ and lib/, excluded from lint).
10. Lockfile discipline. Keep --legacy-peer-deps only through a committed .npmrc containing legacy-peer-deps=true, so local and CI installs match. Add .github/dependabot.yml (weekly, npm, grouped minor and patch).
Done when:
[ ] Fresh clone: npm ci && npm run verify exits 0.
[ ] A PR with a type error or failing test cannot merge (branch protection requires the CI check).
[ ] npx expo prebuild --platform android --clean succeeds in a clean checkout.
[ ] Tagging v1.0.1 produces a signed AAB through EAS; no debug keystore is referenced.
[ ] Repo root contains only config, app/, lib/, components/, assets/, supabase/, tools/, docs.
2. Security and privacy (3.0 to 9)
Target state: no personal data in the repo or its history; no plaintext tokens; minimal Android permissions; backups off; server locked down; safe HTML; every claim in the README about security is enforced by code or CI.
1. Stop the bleeding. GitHub: Settings, General, Danger Zone, Change visibility, Private. Do this before any refactor.
2. Replace hard-coded identity with a profile. lib/constants/user-profile.ts (USER_PROFILE) is imported by 13 files: app/(tabs)/index.tsx, more.tsx, nutrition.tsx, progress.tsx, app/modals/monthly-report.tsx, lib/ai/context-builder.ts, lib/analytics/body-analytics.ts, lib/analytics/nutrition-analytics.ts, lib/db/queries/nutrition.ts, lib/db/queries/recovery.ts, lib/export/generate-progress-pdf.ts, lib/groq/agents/buildWeeklyContext.ts, plus seed-dummy-data.ts. Order of work: (a) Section 3 step 5 creates the user_profile and target_history tables; (b) create lib/data/profile.ts exporting getProfile(), saveProfile(p) and getTargetsForDate(date); (c) create lib/constants/defaults.ts with neutral DEFAULT_TARGETS (calories 2200, protein 130, carbs 250, fat 70); (d) replace every USER_PROFILE.* read with await getProfile() / getTargetsForDate(); (e) add a first-run onboarding modal app/modals/profile-setup.tsx that writes the profile; (f) delete user-profile.ts.
3. Scrub history. pip install git-filter-repo; in a fresh mirror clone run git filter-repo --path lib/constants/user-profile.ts --invert-paths, then force-push all branches and tags. Also search every tracked file and every doc for personal strings and remove or generalise them: grep -rniE "34\.9|toji|saw palmetto|ashwagandha|pelvic|APT|TFL|dorsiflexion|Prithvi" --include=* . (docs and the master plan contain such text). Treat the old data as already disclosed.
4. Add a PII tripwire. Create tools/check-no-pii.sh that greps for those patterns (keep the patterns in a gitignored local file so the script itself does not leak them) and run it in ci.yml.
5. Android hardening in app.json under android: allowBackup: false; permissions: ["android.permission.CAMERA", "android.permission.RECORD_AUDIO", "android.permission.INTERNET", "android.permission.VIBRATE"]; blockedPermissions: ["android.permission.SYSTEM_ALERT_WINDOW", "android.permission.READ_EXTERNAL_STORAGE", "android.permission.WRITE_EXTERNAL_STORAGE", "android.permission.MODIFY_AUDIO_SETTINGS"]. Rebuild and inspect the merged manifest (aapt dump permissions) to confirm.
6. Encrypt the session at rest. Replace the plaintext adapter in lib/supabase/client.ts with the Supabase 'LargeSecureStore' pattern: npx expo install expo-secure-store (present) and npm i aes-js react-native-get-random-values; the adapter stores a random 256-bit key in SecureStore under nutrilift-session-key and the AES-CTR ciphertext of the session in AsyncStorage. Import react-native-get-random-values first in index.ts. Existing plaintext sessions are read once, re-saved encrypted, then the plaintext key is removed.
7. Fail loudly when config is missing. In lib/supabase/client.ts remove the fallback to https://example-project.supabase.co and public-anon-key and the VITE_* fallbacks. If env is missing, export supabase = null and isSupabaseConfigured = false; every caller checks the flag (Section 6 centralises this).
8. Escape PDF HTML. Create lib/export/html.ts with escapeHtml(s) (replace & < > " ') and a tagged template html that escapes interpolations; convert every interpolation in lib/export/generate-progress-pdf.ts. Unit-test with <script> and & in notes.
9. Supabase dashboard checklist: Auth, Providers, Email: turn off Allow new users to sign up and create your own account manually; enable leaked-password protection; JWT expiry 3600; confirm ai-chat is deployed with verify_jwt on (default); run a two-user RLS test (create user B, try selecting user A's sync_records with B's JWT, expect 0 rows).
10. Dependencies. Add npm audit --omit=dev --audit-level=high as a non-blocking CI step; Dependabot from Section 1 handles updates. Remove groq-sdk from dependencies once Section 7 lands (only type imports remain today).
11. Optional 9 to 10: encrypt the SQLite file with SQLCipher (useSQLCipher: true in the expo-sqlite plugin, key from SecureStore, one-time export of the old DB with sqlcipher_export). Do this only if you accept the extra migration risk; with backups off and device encryption it is not required for 9.
Done when:
[ ] Repo is private and git log --all -S"34.9" finds nothing.
[ ] tools/check-no-pii.sh runs in CI and passes.
[ ] Merged manifest has no SYSTEM_ALERT_WINDOW or storage permissions and allowBackup=false.
[ ] AsyncStorage shows only ciphertext for the Supabase session key.
[ ] Sign-ups are disabled and the two-user RLS test returns 0 rows.
[ ] PDF export test with markup in notes renders it as text.
3. Data layer and migrations (3.0 to 9)
Target state: one ordered, versioned, tested migration list; every multi-write atomic; soft deletes and updated_at on every syncable table; derived data rebuilt inside the same transaction as its source; schema.ts provably equals the real schema.
1. Create the migration runner lib/db/migrations/runner.ts:
import type { SQLiteDatabase } from 'expo-sqlite';
export type Migration = { version: number; name: string; up: (db: SQLiteDatabase) => Promise<void> };
export async function migrate(db: SQLiteDatabase, migrations: Migration[]): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  const latest = migrations[migrations.length - 1].version;
  if (current > latest) throw new Error(`Database v${current} is newer than this app (v${latest}). Update the app.`);
  for (const m of migrations.filter((x) => x.version > current)) {
    await db.withTransactionAsync(async () => {
      await m.up(db);
      await db.execAsync(`PRAGMA user_version = ${m.version}`);
    });
  }
}
export async function hasColumn(db: SQLiteDatabase, table: string, column: string): Promise<boolean> {
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return cols.some((c) => c.name === column);
}
export async function addColumn(db: SQLiteDatabase, table: string, column: string, type: string): Promise<void> {
  if (!(await hasColumn(db, table, column))) await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
}
The runner throws on every error (no swallowing); a failed migration rolls back and the app shows the fatal screen (Section 4).
2. Migration v1 (baseline). Create lib/db/migrations/001_baseline.ts. Move the DDL from runMigrations() in lib/db/client.ts verbatim (every CREATE TABLE IF NOT EXISTS and CREATE INDEX IF NOT EXISTS, including the sync_* tables), and add the table that was missing:
CREATE TABLE IF NOT EXISTS custom_exercises (
  id TEXT PRIMARY KEY,
  exercise_name TEXT NOT NULL UNIQUE,
  muscle_group TEXT, equipment TEXT,
  exercise_type TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
Legacy installs are at user_version = 0 with tables present; the IF NOT EXISTS baseline is a no-op for them and creates custom_exercises where it is absent.
3. Migration v2 (legacy columns). 002_legacy_columns.ts: call addColumn for every column the old code added through ALTER (set_logs.duration_sec INTEGER, set_logs.distance_km REAL, exercise_logs.exercise_type TEXT, updated_at TEXT on daily_nutrition, workout_sessions, personal_records, body_stats, recovery_logs, and sync_tombstones.external_id TEXT) and create the unique index CREATE UNIQUE INDEX IF NOT EXISTS ux_sync_tombstones_entity ON sync_tombstones(entity_type, entity_id). Do NOT backfill updated_at with the current time here or anywhere (the old migration did; see step 4).
4. Migration v3 (sync columns, deterministic backfill). 003_sync_columns.ts: addColumn updated_at TEXT and deleted_at TEXT to food_logs, exercise_logs, set_logs; deleted_at TEXT to workout_sessions, body_stats, personal_foods. Backfill without wall-clock time:
UPDATE food_logs SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', created_at, 'unixepoch') WHERE updated_at IS NULL;
UPDATE set_logs SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', logged_at, 'unixepoch') WHERE updated_at IS NULL;
UPDATE exercise_logs SET updated_at = date || 'T00:00:00.000Z' WHERE updated_at IS NULL;
UPDATE workout_sessions SET updated_at = date || 'T00:00:00.000Z' WHERE updated_at IS NULL;
UPDATE body_stats SET updated_at = date || 'T00:00:00.000Z' WHERE updated_at IS NULL;
UPDATE daily_nutrition SET updated_at = date || 'T00:00:00.000Z' WHERE updated_at IS NULL;
UPDATE recovery_logs SET updated_at = date || 'T00:00:00.000Z' WHERE updated_at IS NULL;
UPDATE personal_records SET updated_at = achieved_date || 'T00:00:00.000Z' WHERE updated_at IS NULL;
Then add indexes: idx_<table>_updated_at on updated_at for all those tables; idx_food_logs_date_alive ON food_logs(date) WHERE deleted_at IS NULL; the same partial-index pattern for exercise_logs(session_id) and set_logs(exercise_log_id).
5. Migration v4 (profile and settings). 004_profile.ts:
CREATE TABLE IF NOT EXISTS user_profile (
  id TEXT PRIMARY KEY CHECK (id = 'me'),
  display_name TEXT, sex TEXT, birth_year INTEGER, height_cm REAL,
  goal_text TEXT, coach_notes TEXT, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS target_history (
  effective_from TEXT PRIMARY KEY,
  calories REAL NOT NULL, protein_g REAL NOT NULL, carbs_g REAL NOT NULL, fat_g REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
ALTER TABLE daily_nutrition ADD COLUMN targets_snapshot TEXT;
ALTER TABLE daily_nutrition ADD COLUMN food_count INTEGER NOT NULL DEFAULT 0;
(Guard the two ALTERs with addColumn.) getTargetsForDate(d) returns the target_history row with the greatest effective_from <= d, else DEFAULT_TARGETS.
6. Wire the runner. In lib/db/client.ts: open the DB, run PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; on the handle immediately after openDatabaseSync, and make runMigrations() just await migrate(sqlite, migrations) with migrations imported from lib/db/migrations/index.ts (the ordered array). Delete the inline DDL, addColumnIfMissing and the migrationTimestamp block.
7. Single source of truth for the schema. Delete drizzle/, the db:generate and db:migrate scripts and drizzle.config.ts (Drizzle stays as the query builder and type source). Update lib/db/schema.ts so it matches v1 to v4 exactly: add deleted_at, updated_at, food_count, targets_snapshot, user_profile, target_history, app_settings, and declare the unique index on sync_tombstones.
8. Transactions and a write mutex. Create lib/db/tx.ts:
import { sqlite } from './client';
let chain: Promise<unknown> = Promise.resolve();
export function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(fn, fn);
  chain = next.catch(() => undefined);
  return next;
}
export function inTx<T>(fn: () => Promise<T>): Promise<T> {
  return runExclusive(async () => {
    let out!: T;
    await sqlite.withTransactionAsync(async () => { out = await fn(); });
    return out;
  });
}
Rule: every function that writes goes through inTx. Wrap insertFoodLog, deleteFoodLog, updateFoodLog (plus a new insertFoodLogs(logs: NewFoodLog[]) that inserts all rows and recomputes each affected date once), insertSession, updateSession, insertExerciseLog, updateExerciseLog, deleteExerciseLog, insertSetLog, updateSetLog, deleteSetLog, upsertRecoveryLog, upsertSupplementLog, insertBodyStat, deleteBodyStat, every insert*/update*Summary in reports.ts, and saveBarcodeCache. Writes that do not use Drizzle (syncRepository) call sqlite.runAsync inside inTx too.
9. Soft delete. Replace each db.delete(...) (they exist in nutrition.ts:25, workout.ts:102,103,128 and body.ts:75) with update(...).set({ deleted_at: nowIso(), updated_at: nowIso() }). Create lib/db/alive.ts exporting alive(table) = isNull(table.deleted_at) and add it to every read in queries/nutrition.ts, workout.ts, body.ts and reports.ts. Deleting an exercise soft-deletes its sets in the same transaction. Add a purge on launch for rows whose deleted_at is older than 30 days and whose sync record is already uploaded.
10. Derived data lives inside the source transaction. recomputeDailyNutrition(date) runs inside the same inTx as the food-log write and never deletes the row: with zero live logs it writes zeros and food_count = 0. It stores targets_snapshot (JSON of the targets used) and reads targets through getTargetsForDate(date). Export rebuildAllDerived() that recomputes every date and every PR (Section 5); run it after the data fixes in Section 5 and from a hidden 'Repair data' button in Settings.
11. Time helpers in writers. Create lib/time/clock.ts with nowIso() and nowUnix() (the only functions allowed to read the wall clock for stored values) and use them in every writer.
12. Web target. Delete the Proxy mock DB branch in lib/db/client.ts. Remove the web script, build:web, vercel.json and the react-native-web and react-dom dependencies; the product is an Android app. Importing the DB on web must throw a clear error.
13. Backup you control. Add lib/data/exportAll.ts that dumps every table to one JSON file with expo-file-system and shares it with expo-sharing; add an 'Export data' row to Settings. This is the safety net until event-level sync (Section 6) is verified.
14. Migration tests (harness in Section 10): a v0 fixture DB with representative rows must migrate to the latest version with row counts preserved and no updated_at equal to the migration time.
Done when:
[ ] PRAGMA user_version equals the latest migration number after launch on both a fresh install and the v0 fixture.
[ ] custom_exercises exists and the Workout tab loads on a fresh install.
[ ] Killing the app between the insert and the recompute (simulate by throwing inside inTx) leaves food_logs and daily_nutrition consistent.
[ ] grep -rn "db.delete(" lib returns only barcode-cache pruning and clearConversationHistory.
[ ] A schema-parity test proves schema.ts columns equal PRAGMA table_info for every table.
[ ] A failed migration shows a fatal screen and leaves the previous version untouched.
4. Time, state and lifecycle (3.5 to 9)
Target state: the app always knows which local day it is, including after midnight and after foregrounding; async loads cannot race; failures are visible; one source of truth for navigation and lifecycle events.
1. Create lib/time/localDate.ts (the only place date strings are built):
const pad = (n: number) => String(n).padStart(2, '0');
export function localDateString(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(s: string, n: number): string {
  const d = parseLocalDate(s);
  d.setDate(d.getDate() + n);
  return localDateString(d);
}
export const dayOfWeek = (s: string) => parseLocalDate(s).getDay();
export const startOfWeekMonday = (s: string) => addDays(s, -((dayOfWeek(s) + 6) % 7));
export const daysBetween = (a: string, b: string) =>
  Math.round((parseLocalDate(b).getTime() - parseLocalDate(a).getTime()) / 86400000);
2. Replace every 'which day' computation. toISOString() is correct for an instant (use nowIso()), wrong for a day. Replace each x.toISOString().split('T')[0] / .slice(0, 10) with localDateString(x); date arithmetic like 'seven days ago' becomes addDays(localDateString(), -6). The 56 occurrences by file: components/ui/DateNavigator.tsx 9; lib/export/generate-progress-pdf.ts 6; app/(tabs)/progress.tsx 5; lib/db/queries/nutrition.ts 4; lib/ai/quarterly-summary-service.ts 4; lib/db/queries/reports.ts 3; 2 each in lib/groq/agents/buildWeeklyContext.ts, lib/db/queries/recovery.ts, lib/ai/monthly-summary-service.ts, app/(tabs)/workout.tsx, app/(tabs)/index.tsx; 1 each in lib/stores/today.store.ts, lib/logger.ts, lib/integrations/life-os/recordMappers.ts, lib/db/queries/workout.ts, lib/db/queries/body.ts, lib/analytics/body-analytics.ts, app/modals/voice-input.tsx, nutrition-card.tsx, monthly-report.tsx, log-food.tsx, inbody-paste.tsx, app/(tabs)/nutrition.tsx, app/(tabs)/more.tsx, and the dev seed script in tools/dev/. Finish with grep -rnE "toISOString\(\)\.(split|slice)" app lib components returning nothing.
3. Fix the weekday logic. In workout.tsx, getDefaultDayType uses dayOfWeek(dateStr). Rewrite loadCompletedDayTypes as const monday = startOfWeekMonday(selectedDate); const sunday = addDays(monday, 6); and query that range; delete the mutating setDate code (it computed next Monday on Sundays and returned an empty range).
4. Add lib/time/useToday.ts:
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { localDateString } from './localDate';
export function useToday(): string {
  const [today, setToday] = useState(localDateString());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => setToday(localDateString());
    const schedule = () => {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
      timer = setTimeout(() => { refresh(); schedule(); }, next.getTime() - now.getTime());
    };
    schedule();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') refresh(); });
    return () => { clearTimeout(timer); sub.remove(); };
  }, []);
  return today;
}
In each tab screen model the picked day as const [picked, setPicked] = useState<string | null>(null); const date = picked ?? today; so 'follow today' survives midnight but a manually chosen day stays put.
5. Retire the frozen store. grep -rn today.store app lib components. Replace usages with useToday() and delete lib/stores/today.store.ts; if something else needs shared state, initialise lazily inside the store, never at module load.
6. Guard async loads. Replace the body of loadWorkout in workout.tsx (and the equivalents on the nutrition and progress tabs):
const reqId = useRef(0);
const loadWorkout = useCallback(async () => {
  const id = ++reqId.current;
  setLoadError(null);
  try {
    const data = await getWorkoutDay(selectedDate); // one repository call
    if (id !== reqId.current) return;
    setDay(data);
  } catch (e) {
    if (id === reqId.current) setLoadError(errorMessage(e));
    logger.error('loadWorkout failed', e);
  } finally {
    if (id === reqId.current) setIsLoading(false);
  }
}, [selectedDate]);
Render loadError with a Retry button. Never call loadWorkout() after a single set mutation (Section 9 replaces that with local merges).
7. Fire-and-forget safely. Create lib/async.ts exporting fireAndLog(p: Promise<unknown>, ctx: string): void that attaches a .catch calling logger.error(ctx, e). Replace every unawaited call (createCustomExercise calls loadWorkout() and addExercise() without awaiting; there are others: grep -rn "^\s*[a-zA-Z.]*(.*);$" is too broad, so review each useEffect and handler). Register ErrorUtils.setGlobalHandler once in app/_layout.tsx to log fatal JS errors.
8. One navigation source of truth. Delete activeModal, openModal, closeModal from lib/stores/ui.store.ts and open modals only with router.push({ pathname: '/modals/log-food', params: { meal, date } }); log-food.tsx reads useLocalSearchParams() and no longer imports the UI store.
9. Fatal error screen. In app/_layout.tsx render <FatalError error={dbError} /> when migration fails and never set dbReady = true in that case. components/FatalError.tsx shows the message, app version, PRAGMA user_version, a 'Copy diagnostics' button and, if the DB opens read-only, an 'Export data' button (Section 3 step 13).
10. One lifecycle bus. Create lib/lifecycle/foreground.ts with a single AppState subscription and onForeground(cb): () => void. Consumers: useToday, the sync engine (Section 6), and Supabase token refresh:
onForeground(() => supabase?.auth.startAutoRefresh());
AppState.addEventListener('change', (s) => { if (s !== 'active') supabase?.auth.stopAutoRefresh(); });
11. Tests. In jest.config.js set process.env.TZ = 'Asia/Kolkata' via a globalSetup file. Cases: localDateString(new Date('2026-10-17T20:00:00Z')) is 2026-10-18 (01:30 IST); new Date('2026-10-17T18:29:00Z') gives 2026-10-17; startOfWeekMonday('2026-10-18') (a Sunday) is 2026-10-12; addDays across a month end and a leap day; useToday with fake timers rolls over at local midnight; the loadWorkout guard ignores a slower earlier response.
Done when:
[ ] grep -rnE "toISOString\(\)\.(split|slice)" app lib components is empty and the ESLint rule is error globally.
[ ] A 05:00 IST workout and a 00:30 IST meal are filed under the correct local day (tests above).
[ ] Leave the app open across midnight: 'today' updates without a restart.
[ ] Switching dates rapidly never shows another day's data.
[ ] A failed migration shows the fatal screen; no unhandled promise rejection appears in a 10-minute monkey test.
5. Domain logic (4 to 9)
Target state: every number the user sees is derivable from raw logs by pure, tested functions; PRs, volume and adherence can be rebuilt at any time; bad AI or barcode data can never silently become a log.
1. Create lib/domain/ with pure TypeScript (no react, expo-*, Drizzle or Supabase imports; add an ESLint no-restricted-imports rule enforcing that): e1rm.ts, prs.ts, volume.ts, progression.ts, nutrition.ts, barcode.ts. Data-layer functions fetch rows, call these, and write results inside inTx.
2. Model exercise types explicitly (migration v5, 005_exercise_types.ts). First run SELECT DISTINCT exercise_type FROM exercise_logs on a real device DB and map every value to one of: weight_reps, bodyweight_reps (added load in weight_kg, 0 allowed), reps_only, duration, distance_duration. Then fix polluted rows: duration sets stored seconds in reps, so set reps = 0 where duration_sec IS NOT NULL for duration types (the seconds already live in duration_sec). Update the validator in workout.ts: weight_reps needs weight_kg > 0 and reps >= 1; bodyweight_reps allows weight_kg >= 0; duration needs duration_sec > 0 and ignores reps. Grep every read of .reps in lib/analytics, lib/ai, lib/export and filter by type so duration data never enters strength math.
3. Derive PRs from history instead of patching them. lib/domain/e1rm.ts: e1rm(w, r) = r <= 1 ? w : w * (1 + Math.min(r, 12) / 30) (Epley, capped at 12 reps). lib/domain/prs.ts exports derivePRs(sets: SetPoint[]) where SetPoint = { setId, exerciseName, weightKg, reps, date, loggedAt, isWarmup }: sort by (date, loggedAt), skip warm-ups and reps < 1, keep a running best e1RM per exercise, flag a set as PR only when its e1RM is strictly greater than every earlier set's, and return { prSetIds, bestByExercise }. In the data layer add recomputePRsForExercise(name) inside inTx: load all alive sets for that exercise, run derivePRs, UPDATE set_logs SET is_pr = (id IN prSetIds) for those sets, and upsert (or soft-delete when the exercise has no sets) the single personal_records row. Call it after insertSetLog, updateSetLog, deleteSetLog, deleteExerciseLog and any rename. Delete checkAndUpdatePR. If personal_records lacks an e1RM column, add estimated_1rm_kg REAL in migration v5.
4. Stable PR identity. A PR record's external ID becomes nutrilift:pr:<slug(exerciseName)> with the achieved date inside the payload (Section 6 step 2). One row per exercise, updated in place.
5. Volume in one statement (replace updateSessionVolume, called inside the same transaction as the set write):
UPDATE workout_sessions SET total_volume_kg = (
  SELECT COALESCE(SUM(s.weight_kg * s.reps), 0)
  FROM set_logs s JOIN exercise_logs e ON e.id = s.exercise_log_id
  WHERE e.session_id = ?1 AND s.deleted_at IS NULL AND e.deleted_at IS NULL
    AND COALESCE(s.is_warmup, 0) = 0
    AND COALESCE(e.exercise_type, 'weight_reps') IN ('weight_reps', 'bodyweight_reps')
), updated_at = ?2 WHERE id = ?1;
6. Progression that matches the exercise. Add repRange: [8, 12] and targetSets: 3 per exercise in lib/constants/workout-templates.ts. lib/domain/progression.ts exports shouldIncreaseLoad(lastTwoSessions, repRange, targetSets): true when each of the last two distinct sessions has at least targetSets working sets, all at the same weight, all with reps >= repRange[1]. Fetch sessions grouped by session_id ordered by session date descending, limit 2 (never 'last two exercise_logs rows'). Replace checkDoubleProgression.
7. Ordering bug. Add addTemplateExercises(sessionId, names) in the data layer: inside inTx, const base = (SELECT COALESCE(MAX(order_in_session), 0) FROM exercise_logs WHERE session_id = ? AND deleted_at IS NULL), then insert each exercise with base + index + 1. addExercisesFromTemplate in the screen calls only this function.
8. Nutrition rules in lib/domain/nutrition.ts. sumFoodLogs(logs); adherenceScore(totals, targets, foodCount): number | null returning null when foodCount < 2 (no score for sparse days), else 100 * (0.6 * calorieCloseness + 0.4 * proteinCoverage) with calorieCloseness = max(0, 1 - abs(cal - target) / target) and proteinCoverage = min(protein / targetProtein, 1); document the formula in a comment and a test. recomputeDailyNutrition calls these with targets from getTargetsForDate.
9. Fix app/modals/log-food.tsx. (a) Take date from route params (default localDateString()) and pass it from the Nutrition tab's DateNavigator. (b) When AI parsing fails or returns nothing, show the manual-entry form prefilled with the typed text as the item name and empty macros; Save stays disabled until calories are entered; never create a zero-macro item. (c) Save all items with insertFoodLogs(items) (one transaction, one recompute per date). (d) Mark AI items source: 'ai' with a visible 'estimate' badge and the model's confidence.
10. Barcode normalisation in lib/domain/barcode.ts:
export const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : null;
};
Replace every parseFloat(x) || null in lib/services/barcodeScanner.ts with num(x) so a true 0 stays 0. Rename the quality label verified to consistent (macros reconcile within 20% using 4/4/9 kcal per gram); labels are complete, partial, poor. Check response.ok, add a User-Agent: NutriLift/<version> (<contact email>) header and a 6-second AbortController timeout, and cache not-found results for one hour. Open Food Facts reports sodium_100g in grams; convert to mg (* 1000) and cover it with a fixture test. Delete the Nutritionix fallback (it reads a non-public env var and would put a secret in the client if made public).
11. Use the Indian food DB or delete it. Recommended: wire lib/data/indianFoodDB.ts into log-food as instant, offline type-ahead (searchLocalFoods(query), case-insensitive contains, top 8) shown above the AI option; items from it are source: 'local'.
12. Rebuild once. After migration v5, call rebuildAllDerived() (PRs for every exercise, volume for every session, daily nutrition for every date) once, guarded by app_settings key derived_rebuilt_v5.
13. Tests (all in lib/domain/__tests__). derivePRs: 75x20 beats 80x1; deleting the PR set promotes the previous best; warm-ups never PR; two sets same day. shouldIncreaseLoad: two sessions same day do not count as two; mixed weights do not qualify. adherenceScore: null below two foods; exact targets give 100. num('0') is 0. Property test: volume is independent of set insertion order.
Done when:
[ ] All domain functions are pure and covered at 95% or more branches.
[ ] Deleting or editing any set leaves personal_records and is_pr equal to a fresh derivePRs run (property test).
[ ] Pull-ups and planks can be logged; no duration data appears in strength analytics.
[ ] Failing an AI parse cannot create a zero-calorie log; logging for a past date works.
[ ] Barcode for water or plain chicken breast shows 0 carbs without a 'missing' warning.
6. Sync and Supabase (4.5 to 9)
Target state: sync is a real backup: every event table syncs, deletes propagate, uploads survive crashes, older data can never overwrite newer data, and a wiped phone restores completely. All of it is observable in Settings.
1. Sync every event table. In lib/integrations/life-os/exportSchema.ts add record types for food_log, exercise_log and set_log following the existing naming pattern there. External IDs: nutrilift:food_log:<id>, nutrilift:exercise_log:<id>, nutrilift:set_log:<id>. Payloads carry parent IDs (session_id, exercise_log_id), updated_at, and deleted: boolean.
2. Fix the mappers (recordMappers.ts). (a) Remove every new Date() fallback for sourceUpdatedAt; a row without updated_at is rejected with reason missing_updated_at. (b) A soft-deleted row (deleted_at set) maps to the same record with deleted: true; stop using sync_tombstones for new deletes (keep the table readable for legacy rows). (c) PR external ID is nutrilift:pr:<slug(exerciseName)> (no date).
3. Validate at the door. npm i zod; add a schema per record type in lib/sync/schemas.ts. Invalid records are written to sync_queue with state = 'rejected' and last_error, never silently dropped, so the checkpoint can safely move past them and Settings can show them.
4. Queue state machine (migration v6, 006_sync_queue.ts). Add lease_until TEXT, last_error TEXT, next_attempt_at TEXT to sync_queue. States: pending, uploading (leased), uploaded, failed, rejected, dead (after 8 attempts). Claim a batch atomically:
UPDATE sync_queue SET state = 'uploading', lease_until = ?1, attempt_count = attempt_count + 1
WHERE id IN (
  SELECT id FROM sync_queue
  WHERE state = 'pending' OR (state = 'failed' AND next_attempt_at <= ?2)
  ORDER BY created_at LIMIT 100
) RETURNING *;
At the start of every run reclaim stranded rows: UPDATE sync_queue SET state = 'pending', lease_until = NULL WHERE state = 'uploading' AND lease_until < ?now. On failure set state = 'failed' and next_attempt_at = now + min(30s * 2^attempt, 6h); after 8 attempts dead. Purge uploaded rows older than 7 days on launch.
5. Per-table checkpoints instead of one cursor. Migration v6 also creates sync_checkpoint(source_table TEXT PRIMARY KEY, last_updated_at TEXT NOT NULL, last_id TEXT NOT NULL). Per table, read changes with keyset pagination: WHERE (updated_at, id) > (?1, ?2) ORDER BY updated_at, id LIMIT 200, enqueue them AND advance that table's checkpoint in the same inTx (the checkpoint tracks 'durably queued', the queue tracks 'uploaded'). This replaces the global cursor, the five SELECT * full scans, and the 'cursor jumps over invalid records' P0.
6. Single-flight engine with real triggers. Create lib/sync/syncEngine.ts with let running: Promise<SyncResult> | null = null and requestSync(reason) that returns the in-flight promise if one exists. Triggers: foreground (onForeground), 5-second-debounced after any committed write (add an onCommit callback list in inTx), network regained (npx expo install @react-native-community/netinfo), and a manual 'Sync now' button. Skip when !isSupabaseConfigured.
7. Offline-safe auth. Replace getCurrentUser() (a network call) with supabase.auth.getSession() for the sync gate. Expose useSyncStatus() returning idle | syncing | offline | signed-out | error, pending count, rejected count, last success time and last error; show them in Settings with a 'Retry rejected' action. Handle onAuthStateChange SIGNED_OUT.
8. Server hardening (supabase/migrations/<timestamp>_sync_hardening.sql). Column names below follow the existing migration; adjust to match it exactly.
alter table sync_records add constraint sync_records_type_chk
  check (record_type ~ '^[a-z_]+[.][a-z_]+$');
alter table sync_records add constraint sync_records_payload_chk
  check (pg_column_size(payload) < 65536);
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger sync_records_touch before update on sync_records
  for each row execute function touch_updated_at();
create or replace function upsert_sync_records(rows jsonb) returns integer
language plpgsql security invoker as $$
declare n integer;
begin
  insert into sync_records (user_id, external_id, record_type, payload, source_updated_at)
  select auth.uid(), r.external_id, r.record_type, r.payload, r.source_updated_at
  from jsonb_to_recordset(rows) as r(external_id text, record_type text, payload jsonb, source_updated_at timestamptz)
  on conflict (user_id, external_id) do update
    set payload = excluded.payload, record_type = excluded.record_type,
        source_updated_at = excluded.source_updated_at
    where excluded.source_updated_at >= sync_records.source_updated_at;
  get diagnostics n = row_count;
  return n;
end $$;
The client replaces its direct upsert with supabase.rpc('upsert_sync_records', { rows }) in batches of at most 200; user_id always comes from auth.uid(), never from the client. Drop the unused sync_events and sync_cursors tables, and either use profiles or drop it.
9. Clean legacy PR rows once (after the stable PR ID ships), in the SQL editor: delete rows whose PR external ID ends in a date, delete from sync_records where record_type like '%personal_record%' and external_id similar to '%[0-9]{4}-[0-9]{2}-[0-9]{2}'; (confirm the record-type string first with select distinct record_type from sync_records).
10. Prove it is a backup: restore. Create lib/sync/restore.ts: when the local DB is empty and a session exists, page through sync_records ordered by source_updated_at, external_id, map each record back to rows with inverse mappers, and insert everything in one inTx, then set app_settings.restore_completed. Add a 'Restore from cloud' action to Settings and to the first-run flow.
11. Tests. Engine with a fake transport: kill mid-upload then relaunch reclaims the lease and uploads once; duplicate delivery is idempotent; an invalid record is rejected and the checkpoint still advances; delete propagates as deleted: true; a slower older update does not overwrite a newer server row (SQL test in supabase/tests/sync_records.test.sql, run with supabase test db); round trip: seed DB, sync to fake server, wipe, restore, and assert every table equals the original.
Done when:
[ ] Round-trip restore test passes for all tables including food, exercises and sets.
[ ] Kill-mid-upload test: zero stranded rows after relaunch.
[ ] Offline sync attempt shows 'offline', never 'sign in'.
[ ] Deleting a meal, exercise or workout appears as deleted: true server-side within one sync.
[ ] Settings shows pending, rejected, last-success and last-error accurately.
7. AI layer and edge functions (4 to 9)
Target state: one typed gateway; every request and response validated; voice works end to end; costs and abuse bounded server-side; prompts built from the user's own profile; explicit consent; a coach that cannot give unsafe advice.
1. Remove the fake SDK and the dead key UI. Delete lib/groq/client.ts (the shim pretending to be groq-sdk), then delete safeGroqCall and any lib/groq/index.ts re-exports. In app/(tabs)/more.tsx remove the Groq-key state, the validation call to api.groq.com, the AsyncStorage keys and the whole key section; remove every 'add GROQ_API_KEY to .env' string from voice-input.tsx and coach.tsx. Remove the groq-sdk dependency.
2. Create the gateway lib/ai/gateway.ts:
import { supabase } from '../supabase/client';
export type AiErrorCode = 'consent' | 'unauthorized' | 'rate_limited' | 'offline' | 'bad_response' | 'server';
export class AiError extends Error {
  constructor(public code: AiErrorCode, message: string, public retryAfterSec?: number) { super(message); }
}
function mapHttp(status: number, body: { error?: string; retry_after?: number }): AiError {
  if (status === 401) return new AiError('unauthorized', 'Please sign in again');
  if (status === 429) return new AiError('rate_limited', body.error ?? 'Daily AI limit reached', body.retry_after);
  return new AiError('server', body.error ?? 'AI service error');
}
async function call<T>(fn: 'ai-chat' | 'ai-transcribe', body: object | FormData): Promise<T> {
  if (!supabase) throw new AiError('unauthorized', 'Cloud features are not configured');
  await assertConsent();
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    const res = (error as { context?: Response }).context;
    if (res) throw mapHttp(res.status, await res.json().catch(() => ({})));
    throw new AiError('offline', 'No connection');
  }
  return data as T;
}
export const chat = (req: ChatRequest) => call<ChatResponse>('ai-chat', req);
export const transcribe = (form: FormData) => call<{ text: string }>('ai-transcribe', form);
This fixes the dead 429 branch: the HTTP status is read from error.context, so users see 'Daily AI limit reached' instead of 'Edge Function returned a non-2xx status code'. Migrate every caller from groq.chat.completions.create to chat(): app/(tabs)/coach.tsx, app/modals/inbody-paste.tsx, log-food.tsx, monthly-report.tsx, voice-input.tsx, lib/ai/parsers.ts, the four lib/ai/*-summary-service.ts files and everything in lib/groq/. UI maps AiError.code to a toast (Section 9).
3. Rewrite supabase/functions/ai-chat/index.ts with these exact behaviours:
• Parse the body inside try/catch and answer 400 on invalid JSON.
• Validate with Zod using a strict allowlist: messages (1 to 30 items, role in system/user/assistant, content up to 12,000 chars), optional response_format (text or json_object), optional temperature (0 to 1.5), optional max_tokens (1 to 1,500). .strict() so unknown fields (n, tools, max_completion_tokens, reasoning_*) fail with 400.
• Build the upstream request explicitly from the validated fields; the model name comes from the GROQ_CHAT_MODEL secret, never from the client.
• Import createClient from a pinned Deno npm specifier that matches your package.json supabase-js version (no unpinned esm.sh).
• Call Groq through an AbortController with a 25-second timeout and map upstream 429/5xx to your own 429/502.
• Drop the CORS headers (native app only); keep a plain OPTIONS 204.
• Log { user_id, model, prompt_tokens, completion_tokens } to an ai_usage_log table from Groq's usage field.
• Quota check uses the atomic function below, called with the user's own JWT client, and refunds on upstream failure.
create table if not exists ai_usage (
  user_id uuid not null, day date not null, requests int not null default 0,
  primary key (user_id, day)
);
alter table ai_usage enable row level security;
create or replace function consume_ai_quota(p_limit int)
returns table(allowed boolean, remaining int)
language plpgsql security definer set search_path = public as $$
declare v int;
begin
  insert into ai_usage (user_id, day, requests)
  values (auth.uid(), (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day) do update set requests = ai_usage.requests + 1
  returning requests into v;
  return query select v <= p_limit, greatest(p_limit - v, 0);
end $$;
revoke execute on function consume_ai_quota(int) from anon;
create or replace function refund_ai_quota() returns void
language sql security definer set search_path = public as $$
  update ai_usage set requests = greatest(requests - 1, 0)
  where user_id = auth.uid() and day = (now() at time zone 'utc')::date;
$$;
Add a second per-minute bucket the same way (table keyed by date_trunc('minute', now()), limit 10) so a runaway loop cannot burn the daily budget in seconds.
4. Add supabase/functions/ai-transcribe/index.ts. Accept multipart with one audio file (max 5 MB, mime starting audio/), same JWT check and quota functions, forward to https://api.groq.com/openai/v1/audio/transcriptions with the model from the GROQ_STT_MODEL secret (a Whisper variant) and response_format=json, return { text }. Client side, rewrite lib/groq/transcribeAudio.ts as lib/ai/transcribeAudio.ts: build const form = new FormData(); form.append('audio', { uri, name: 'voice.m4a', type: 'audio/m4a' } as unknown as Blob); (the React Native pattern; remove new File), then transcribe(form). If functions.invoke does not forward FormData in your supabase-js version, use fetch to <SUPABASE_URL>/functions/v1/ai-transcribe with Authorization: Bearer <session.access_token> and the apikey header.
5. Validate outputs. Create lib/ai/schemas.ts with Zod schemas, for example FoodParseSchema: items (1 to 12) each with name (1 to 80 chars), optional quantity, calories 0 to 3000, protein_g 0 to 300, carbs_g 0 to 500, fat_g 0 to 300, confidence in high/medium/low. Add a plausibility check: if abs(calories - (4*protein + 4*carbs + 9*fat)) > 0.3 * calories + 20, set needs_review = true (UI shows a warning chip) instead of rejecting. Write parseJsonLoose(raw): strip code fences, take the substring from the first { to the last }, JSON.parse in try/catch; on failure retry once with temperature: 0 and a short repair instruction; on a second failure return a typed failure that the UI turns into manual entry (Section 5 step 9). Do the same for the InBody paste parser and each summary generator.
6. Versioned prompts built from the profile. Move all prompts to lib/ai/prompts/ as modules exporting { id, version, build(ctx) } (food-parse, coach, inbody, weekly, monthly, quarterly, yearly). Contexts come from getProfile() and aggregated stats; remove all hard-coded body-fat, injury and cuisine text (users who want it put it in profile.coach_notes). Replace the food-parse instruction 'overestimating is better than underestimating' with 'give your best central estimate and express uncertainty through the confidence field'. Persist promptId@version with every row in ai_conversations.
7. Consent gate. Store ai_consent_v1 in app_settings; assertConsent() throws AiError('consent') until it is set. Add app/modals/ai-consent.tsx that states exactly what is sent (typed text, recorded audio, aggregated log summaries, and only the profile fields the user enabled), to whom (your Supabase project, then Groq), what NutriLift stores (usage counters only), and how to turn it off. Add Settings toggles: 'Include body measurements in coach context' and 'Include injuries and coach notes'; the context builder honours them.
8. Coach safety layer. Put these rules at the top of the coach system prompt (verbatim): you are not a clinician and never diagnose; for pain, dizziness, chest symptoms or fainting tell the user to stop and see a professional; never recommend a daily intake below MIN_CALORIE_FLOOR (a constant, default 1500, user-adjustable only upward in the app); give no supplement or drug advice; never criticise body shape or weight; if the user describes restricting, purging, bingeing or guilt around food, respond with support, give no numbers, and suggest talking to a professional; tone is direct, factual and kind. Delete 'brutally honest' and 'if they're slacking, say it'. In code, route any AI-suggested target through clampTargets() (enforces the floor and a maximum weekly change of 10%) and run applyCoachGuardrails(text) on responses, which appends a safety note if a calorie figure below the floor appears.
9. Minimise context. Send aggregates only (last 7 and 28 days: averages, adherence, PRs, volume trend), capped at about 2,000 characters per section, never raw logs. Dates come from localDateString().
10. Reliability and cost. Client-side: 20-second timeout, dedupe identical in-flight requests by key, retry only server errors (max 2, jittered), debounce user-triggered generation, and cache period summaries in SQLite keyed by (period, hash(inputs)) so unchanged weeks are never regenerated.
11. Tests. Gateway error mapping for 401, 429 (with retry_after), 500 and offline; schema accept/reject fixtures including fenced JSON, trailing prose and truncated JSON; a Deno test proving the edge validator rejects n, tools and max_completion_tokens; an SQL test that fires 50 concurrent consume_ai_quota(10) calls and asserts exactly 10 allowed; prompt tests asserting the safety block is present in the coach prompt and that clampTargets enforces the floor.
Done when:
[ ] Voice logging works on a real device from recording to a saved, reviewed entry.
[ ] A client request with extra fields is rejected with 400; 50 parallel calls consume at most the limit.
[ ] The 429 path shows the real message; the Groq key UI and groq-sdk are gone.
[ ] AI calls are blocked until consent; toggles change what the context contains (test).
[ ] No prompt or constant in the repo contains personal health data.
8. Architecture (4 to 9)
Target state: clear layers with enforced import boundaries; small files; one UI kit; strict TypeScript with zero suppressions; a dependency list that matches reality.
Layout to reach:
app/           screens and routing only (each file <= 250 lines)
components/    shared UI kit (one design system, tokens in design-system/tokens.ts)
lib/domain/    pure rules (Section 5)
lib/data/      db/ (client, schema, migrations, tx), repositories/, hooks
lib/services/  sync, ai, barcode, export, lifecycle
lib/time/ lib/async.ts lib/logger.ts
tools/         dev scripts and seeds
1. Delete dead code. Remove src/ (38 source files and 36 test files that only the showcase imports), app/design-system/ (the showcase route), and design-system/nutrilift/ if it holds only the unused spec. Verify with grep -rnE "from '(\.\./)+src" app lib components showing only the showcase before deleting it. Remove the matching Jest paths. features/train/, the scripts and the seed were already removed in Section 1.
2. Move the data layer. git mv lib/db/queries lib/data/repositories and lib/db/{client.ts,schema.ts,migrations,tx.ts,alive.ts} lib/data/db/; fix imports file by file (use your IDE's move refactor, one folder at a time, npx tsc --noEmit after each). Add lib/data/index.ts exporting only repository functions and hooks. Add to ESLint no-restricted-imports so files under app/ and components/ cannot import lib/data/db/*, drizzle-orm or expo-sqlite.
3. Screen-shaped repository reads. Add getWorkoutDay(date), getNutritionDay(date), getHomeSummary(date), getProgressOverview(range); each performs its queries inside one read and returns plain serialisable objects. Mutations return the saved entity plus any recomputed summary.
4. Server-state hooks. npx expo install @tanstack/react-query; add QueryClientProvider in app/_layout.tsx; one hook per read (useWorkoutDay(date) with key ['workout', date], useNutritionDay, useHomeSummary, useProgress). Mutations use useMutation with onMutate optimistic updates and onError rollback (Section 9). This supersedes the hand-written reqId guard from Section 4 step 6 (the library provides cancellation and race safety).
5. Split app/(tabs)/workout.tsx (1,722 lines, 28 useState). Create app/(tabs)/workout/ with: index.tsx (shell, at most 200 lines), useWorkoutDay.ts, useSetLogger.ts (per-exercise weight/reps drafts in one useReducer), ExerciseCard.tsx, SetRow.tsx (React.memo), ExercisePicker.tsx (FlashList), TemplateSheet.tsx, DayTypeTabs.tsx, WorkoutSummaryBar.tsx, CustomExerciseForm.tsx. Ownership of the 28 states: dialog and sheet visibility into one uiReducer; input drafts into useSetLogger; everything fetched into the query hook; only genuinely local view state stays as useState. Do the same to app/(tabs)/more.tsx (763 lines): settings/AccountSection, SyncSection, AiSection, DataSection (export, restore, repair), ProfileSection. Rules enforced by tools/check-size.sh in CI: no file over 300 lines under app/ or lib/, no component with more than 5 useState.
6. Real type safety. List suppressions with grep -rl "@ts-nocheck" app lib components and remove them one file at a time, fixing errors as they surface (order: repositories, generate-progress-pdf.ts, weekly-summary-service.ts, then the rest). Replace the 53 anys with real types or unknown plus Zod. In tsconfig.json set strict: true, noUncheckedIndexedAccess: true, noImplicitOverride: true. Flip the ESLint ratchet from Section 1 so the global rules equal strict. Codemod console.log/warn/error to logger.debug/warn/error; make the logger write to a size-capped file in production (errors only) with a 'Share logs' action in Settings.
7. Naming and config hygiene. Keep the DB file name apex.db (renaming would orphan existing data) but put it in one documented constant DB_NAME with a comment explaining why. Keep the apex Expo slug (changing it breaks EAS and update channels).
8. Dependency diet. Run npx depcheck and remove what it proves unused (expect groq-sdk, react-native-web, react-dom, drizzle-kit, and leftovers from src/); run npx expo install --check and fix version drift; commit the lockfile.
Done when:
[ ] tools/check-size.sh, depcheck, ESLint boundaries and tsc --noEmit (strict) all pass in CI.
[ ] Zero @ts-nocheck, zero any in lib/ and app/, zero console.*.
[ ] No screen imports SQLite, Drizzle or lib/data/db.
[ ] src/, app/design-system/ and unused dependencies are gone; the app still builds and all tests pass.
9. UI/UX, accessibility and performance (4.5 to 9)
Target state: logging a set takes about five seconds and feels instant; every list is virtualised; errors never block; every control is labelled and reachable; every screen has loading, error and empty states.
1. Make the money path instant. logSet becomes a mutation: onMutate appends the set to the cached ['workout', date] data with a temporary ID; the repository write (inside inTx, which also recomputes volume and PRs) returns the saved row; onSuccess swaps the temporary ID for the real one; onError rolls back and shows a toast with Retry. Delete the loadWorkout() call after every set. Inputs: decimal pad for weight, number pad for reps, steppers with long-press repeat, values prefilled from the last set, a 'Repeat last set' button, expo-haptics on success, returnKeyType='done'. Add a dev-only timer around the handler and enforce budgets: UI updated within 100 ms of the tap, persisted within 300 ms.
2. Virtualise every list. npx expo install @shopify/flash-list. Convert: exercise picker, food search and history, workout history, personal records, weekly/monthly summary lists, barcode history. Use estimatedItemSize, stable keyExtractor, memoised row components, and remove ScrollView-inside-ScrollView nesting.
3. Replace alert popups with a toast system. Create components/ui/Toast.tsx, ToastProvider and useToast() with show({ message, kind, action?, durationMs }), a queue, and accessibilityLiveRegion='polite'. Keep Alert.alert only inside a confirmDestructive(title, message): Promise<boolean> helper. Of the 52 current calls, informational and error ones become toasts. Deletes become soft deletes (Section 3) with a five-second 'Undo' toast that calls the matching restore* repository function.
4. Accessibility in the kit, not per screen. In components/ui make Button, IconButton (type-require accessibilityLabel), ListRow, Chip and SegmentedControl set accessibilityRole, accessibilityState (selected, disabled, busy), a 48 dp minimum hit area (minHeight: 48 plus hitSlop), and testIDs following screen.element. Give MacroRing and MacroBar spoken labels such as 'Protein 112 of 150 grams'. Add tools/contrast.ts that fails CI if any token pair used for text is below 4.5:1. Use maxFontSizeMultiplier={1.3} on dense rows and no fixed heights on text containers. Gate animations behind AccessibilityInfo.isReduceMotionEnabled().
5. Kill inline styles. Flip react-native/no-inline-styles to error (Section 8) and convert the 673 occurrences: static styles into StyleSheet.create per component; dynamic values via style arrays with precomputed objects; the 6 literal hex colours into tokens.
6. Four states everywhere. Create components/ui/AsyncBoundary.tsx taking a query result and rendering skeleton, error (message plus Retry), empty (EmptyState with a primary action) or content. Every tab and modal that reads data uses it.
7. Flow fixes. DateNavigator shows a 'Today' jump chip when away from today; log-food receives meal and date; Home's primary action opens the meal matching the time of day; support the deep link nutrilift://log-food?meal=lunch.
8. Voice flow states. idle, recording, transcribing, review (editable transcript), parsed (editable items), confirm. Never auto-save. First use shows the consent modal (Section 7).
9. Settings with honest status. Sync (state, last success, pending, rejected, Sync now, Retry rejected), AI (consent, today's usage), Data (Export, Restore, Repair), Account, Profile and Targets (with target_history). No green chip without a real check behind it.
10. Performance budgets. Workout screen interactive within 400 ms of navigation on a mid-range Android; list scroll at 55 fps or better; no full-screen re-render on a keystroke (draft inputs local to the row). Verify with React DevTools Profiler and the Perf Monitor; record numbers in docs/PERF.md.
11. Sequence with the redesign. If you proceed with the visual redesign, do it after steps 1 to 6 so the new UI lands on a stable data layer and kit.
12. Tests. Component tests for Toast (queue, undo), Button (label required, role, disabled state), AsyncBoundary (four states); Maestro flows in Section 10 cover set logging, meal logging and undo.
Done when:
[ ] Tap-to-visible for a set is under 100 ms in the dev timer on a mid-range Android.
[ ] Zero ScrollView over data lists, zero inline-style lint errors, zero Alert.alert outside confirmDestructive.
[ ] TalkBack can complete 'log a set' and 'log a meal' with every control announced; contrast script passes.
[ ] Every screen shows skeleton, error and empty states (screenshot test or Maestro assertions).
[ ] Deleting a meal or set offers Undo and restores it exactly.
10. Testing depth (3 to 9)
Target state: the risky 80% (data, sync, domain, AI plumbing) is covered by real-database tests with enforced thresholds; a handful of end-to-end flows protect the core promise; CI refuses regressions.
1. Real-SQLite test harness. npm i -D better-sqlite3 @types/better-sqlite3. Create tools/test/expo-sqlite-shim.ts that exports openDatabaseSync(name) returning an in-memory better-sqlite3 database wrapped in the async API the app uses (execAsync, runAsync, getFirstAsync, getAllAsync, withTransactionAsync implemented with BEGIN/COMMIT/ROLLBACK). Create tools/test/drizzle-expo-shim.ts that re-exports drizzle from drizzle-orm/better-sqlite3. In jest.config.js map '^expo-sqlite$' and '^drizzle-orm/expo-sqlite$' to those shims via moduleNameMapper. Add makeTestDb({ upTo? }) in lib/data/__tests__/helpers/testDb.ts that runs the real migrate(); repository tests then run against the real schema.
2. Legacy fixture. Export a sanitised copy of a real install's data (no personal strings) as tools/test/fixtures/v0.sql; loadFixtureV0() builds a user_version = 0 database from it. This is the migration safety net.
3. Test inventory (write these before or with each section; names are file names).
• migrations.test.ts: fresh DB reaches the latest version; v0 fixture reaches the latest version with identical row counts; running migrate twice is a no-op; a deliberately failing migration rolls back and leaves user_version unchanged; no updated_at equals the migration run time; schema-parity.test.ts asserts each Drizzle table's columns equal PRAGMA table_info.
• transactions.test.ts: throwing inside recomputeDailyNutrition leaves no new food_logs row; two concurrent inTx calls serialise; insertFoodLogs of 5 items recomputes once.
• softDelete.test.ts: deleted rows disappear from every read in repositories/; Undo restores them exactly; the purge only removes rows older than 30 days that are already uploaded.
• prs.repo.test.ts: logging, editing and deleting sets keeps personal_records and is_pr equal to a fresh derivePRs; volume matches the SQL aggregate.
• nutrition.repo.test.ts: deleting the last log leaves a zero row (not a missing row); targets snapshot is stored; changing targets does not rewrite old days.
• Domain, time, sync, AI suites exactly as listed in Sections 4 to 7.
• contracts.test.ts: every record type's Zod schema accepts the mapper's output and rejects bad shapes; mapper then inverse mapper round-trips every table (the same property the restore test relies on).
4. Property tests with fast-check: volume is independent of set insertion order; derivePRs is monotone (adding a lower set never changes PRs); localDateString and parseLocalDate round-trip for every day of 2024 to 2028 across DST of any zone set by TZ; sync is idempotent (uploading the same batch twice yields the same server state); adherenceScore is within 0 to 100 or null.
5. Enforce coverage. In jest.config.js:
collectCoverageFrom: ['lib/**/*.{ts,tsx}', '!lib/**/__tests__/**', '!**/*.d.ts'],
coverageThreshold: {
  global: { branches: 70, lines: 80 },
  './lib/domain/': { branches: 95, lines: 95 },
  './lib/services/sync/': { branches: 90, lines: 90 },
  './lib/data/repositories/': { branches: 85, lines: 90 },
},
Add "test:cov": "jest --ci --coverage" and make npm run verify call it. Block network in unit tests (global.fetch = () => { throw new Error('network in test') } in the Jest setup) and fix the clock and TZ.
6. End-to-end with Maestro. Install the Maestro CLI, create .maestro/ and set appId to the android.package value from app.json. Flows: log-set.yaml (launch with cleared state, complete the profile setup, open Workout, add an exercise, log a set, assert the set row and the volume text are visible), log-meal-manual.yaml (open Nutrition, Log, enter a manual item, save, assert the day total), delete-undo.yaml (delete a meal, tap Undo in the toast, assert it returns), offline-sync.yaml (airplane mode on, log a set, airplane mode off, assert the Settings sync status reaches 'idle' with zero pending). Skeleton:
appId: <android.package from app.json>
---
- launchApp:
    clearState: true
- tapOn:
    id: 'tabs.workout'
- tapOn:
    id: 'workout.add-exercise'
- tapOn:
    id: 'picker.item.bench-press'
- inputText: '60'
- tapOn:
    id: 'set.log'
- assertVisible:
    id: 'set.row.0'
Add .github/workflows/e2e.yml (nightly schedule plus manual dispatch, not a PR gate) that builds the preview APK and runs Maestro on reactivecircus/android-emulator-runner.
7. Preflight script. tools/preflight.sh runs: npm run verify, coverage thresholds, npx expo-doctor, npx expo prebuild --platform android --no-install dry run in a temp dir, the PII check, and confirms the version in app.json is greater than the last git tag. CI runs it on tags before eas build.
Done when:
[ ] npm run test:cov passes the thresholds above on a clean clone.
[ ] The v0-fixture migration test and the restore round-trip test exist and pass.
[ ] The four Maestro flows pass nightly on an emulator.
[ ] Reverting any Section 3, 5 or 6 fix makes at least one test fail (spot-check three reverts).
11. Docs and process hygiene (4 to 9)
Target state: a small set of living documents that cannot contradict the code, plus a lightweight process that keeps them true.
1. Consolidate. Keep exactly: README.md, ARCHITECTURE.md, DECISIONS.md, PROMISE.md (Section 12), docs/RUNBOOK.md, docs/PERF.md. git mv everything else under docs/archive/, then delete docs/archive/ after the next release (the 340 KB of plans, audits and CSV ledgers are history, not documentation).
2. Rewrite the README to be verifiable. Sections: what it is (three lines); a feature table with columns Feature, State (Working, Beta, Planned) and Test file; quick start (npm ci, copy .env.example, npx expo start); an environment table (name, used by, secret yes/no); commands table; link to ARCHITECTURE; release process; troubleshooting. Add docs/features.json mapping each 'Working' feature to its test path and a tools/check-readme.ts script (run in CI) that fails if a listed test file does not exist or the README table and JSON disagree. Remove every claim the code does not back (no 'food lookup' unless Section 5 step 11 shipped; no secure-storage claim unless Section 2 step 6 shipped).
3. ARCHITECTURE.md (at most 60 lines). The layer diagram from Section 8; the data flow for logging a set (tap, optimistic update, inTx write, recompute PRs and volume, enqueue for sync, sync engine uploads); the invariants: SQLite is the source of truth, derived tables are rebuildable, every syncable row has updated_at and deleted_at, day keys come from localDateString, instants from nowIso, no UI imports the DB, AI only through the gateway.
4. DECISIONS.md as an ADR log (one short block per decision: Context, Decision, Consequences, Date). Write these first: 001 local-first SQLite as source of truth; 002 soft delete plus updated_at instead of tombstones; 003 Continuous Native Generation; 004 AI only through edge functions, no client keys; 005 N=1 instrument vs product (Section 12); 006 TanStack Query for server state; 007 PR definition (e1RM, capped Epley); 008 migrations via PRAGMA user_version.
5. docs/RUNBOOK.md. Deploy functions: supabase functions deploy ai-chat ai-transcribe; set secrets: supabase secrets set GROQ_API_KEY=<key> GROQ_CHAT_MODEL=<model> GROQ_STT_MODEL=<model>; apply migrations: supabase db push; rotate the Groq key; restore from cloud; roll back an OTA update; the rule for choosing OTA (JS only, matching fingerprint) versus a new binary (native change or DB migration); where logs are and how to share them.
6. Process. Replace planning documents with GitHub Issues (labels: bug, friction, later, tech-debt); add .github/pull_request_template.md with checkboxes (tests added, migration added if schema changed, docs updated, npm run verify green); enable branch protection requiring the CI check; keep a CHANGELOG.md updated per tag.
7. A repeatable honest audit. Create tools/audit.sh that runs verify, coverage, depcheck, check-size.sh, the PII check and npm audit --omit=dev, and writes the results with the date into docs/AUDIT.md. Run it weekly (schedule) and on tags. The goal is for the repo to be audited by running it, not by reading it.
8. .env.example tells the truth. Only EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY. Server secrets live in the RUNBOOK, never in client env.
9. Comment policy. Comments explain why, not what; delete generated banner comments and emoji log lines; every TODO carries an issue number (ESLint no-warning-comments with a custom pattern).
Done when:
[ ] docs/ contains only RUNBOOK, PERF (and AUDIT output); the repo root has README, ARCHITECTURE, DECISIONS, PROMISE, CHANGELOG.
[ ] tools/check-readme.ts passes in CI.
[ ] Every ADR above exists; every PR uses the template.
[ ] docs/AUDIT.md is generated by CI and shows all gates green.
12. Product vision and safety (5 to 9)
Target state: the app's promise is written down and measured; the product is explicitly either a personal instrument or a product (not both); the interface supports consistency without shame; the coach cannot cause harm.
1. Write PROMISE.md (at most ten lines): 'Log a set in five seconds. Trust every number. Never lose data.' Add a non-goals list (no social features, no meal-plan marketplace, no web app, no Play Store until the product decision below says so) and the rule: a feature that does not serve the promise is filed as an issue labelled later, not built.
2. Make the N=1 versus product decision and record it as ADR-005. Recommended for your stated goal (build once, never maintain): personal instrument with private cloud backup. Consequences: sign-ups stay disabled (Section 2), Supabase is for the owner only, RLS and quotas stay (they are cheap), the in-app profile keeps the repo generic, distribution is a private EAS internal build or GitHub release APK, and the Play Store is out of scope. If you choose product instead, the added mandatory work is: onboarding with consent logging, a privacy policy URL, in-app account and data deletion, crash reporting with PII scrubbing, a terms page, per-user targets everywhere (already done by the profile table), content safety review of the coach, and a support channel.
3. Pause mode and neutral language. Add app_settings.pause_until and a 'Pause tracking' action (illness, travel, rest). While paused: no adherence score, no streaks, no coach nudges, and days are marked skipped rather than failed. Replace streak counters with a neutral 'logged N of the last 7 days'. Missing data displays as a dash, never a zero. Add a lint-style test that scans prompt and UI copy for banned words (fail, slack, lazy, cheat, guilt).
4. Body-composition honesty. Show weight and body-fat only as 7-day rolling averages with a note that hydration shifts readings by a few percent. Add the pure function canCommentOnBodyComp(stats) (requires at least 3 measurements across at least 14 days with the same time-of-day tag) and make both the UI and the coach respect it. Hide body-fat percentage from Home by default behind the setting 'Show body fat on Home' (default off). Unit-test the gate.
5. Eating-safety path. Create lib/ai/riskPhrases.ts with a short keyword and phrase list for restriction, purging, bingeing and self-directed hatred. Before any AI call, if the user's text matches, skip the model and show a fixed, supportive message with a link to the international directory findahelpline.com and no numbers or targets, and do not log the text. Test with a list of positive and negative examples. Combine with the MIN_CALORIE_FLOOR and clampTargets() rules from Section 7.
6. Supplements and medical. The supplement log stays a plain tracker with no AI advice. Add a one-paragraph disclaimer in Settings (not medical advice; talk to a clinician about pain, medication or supplements).
7. Cut the surface area. Add lib/featureFlags.ts reading app_settings with these defaults: weekly and monthly summaries on; quarterly and yearly summaries and the 'transformation story' off (Labs); PDF export under Data. The goal is fewer things to maintain until the promise is measurably met.
8. A weekly review that changes behaviour. One screen with three numbers (sessions done versus planned, average protein versus target, weight trend) and one editable intention for next week saved as weekly_intent. AI explanation becomes an optional 'Explain this week' button instead of the default.
9. Measure the promise locally. Record (on device only) the time from tapping 'Log set' to the saved row, the number of days with at least one log in the last 28, and app-open-to-first-log time. Show them in Settings, Diagnostics. The promise is unmet if the median set-log time exceeds eight seconds.
10. Anti-avoidance rule. No new planning or audit document until npm run verify is green and at least one real workout has been logged end to end on the current build. Put this in PROMISE.md as the definition of done.
11. Dogfood protocol. After Section 9, use the app for 14 consecutive days; file every snag as an issue labelled friction; fix those before building anything new.
Done when:
[ ] PROMISE.md and ADR-005 exist and the repo contains no personal data or multi-tenant code that contradicts the decision.
[ ] Pause mode suppresses scores, streaks and coach nudges (test).
[ ] Risk-phrase tests pass; the model is never called on a matching input.
[ ] Diagnostics shows median set-log time under eight seconds over the dogfood fortnight.
[ ] Quarterly and yearly summaries are behind a flag that defaults off.
Verification matrix and expected scores
Section
Proof it reached 9
Score now
Target
1 Build and CI
Clean clone: npm ci && npm run verify; tag produces a signed AAB
2.0
9
2 Security and privacy
PII check green; manifest clean; ciphertext session; two-user RLS test
3.0
9
3 Data layer
Migration tests incl. v0 fixture; atomicity tests; schema-parity test
3.0
9
4 Time and lifecycle
TZ test suite; no UTC date calls; midnight rollover test
3.5
9
5 Domain logic
95% domain coverage; PR derivation property test
4.0
9
6 Sync
Round-trip restore; kill-mid-upload; conditional upsert SQL test
4.5
9
7 AI layer
Real voice flow; allowlist and quota tests; consent and safety tests
4.0
9
8 Architecture
Size and boundary checks; strict TS; zero suppressions
4.0
9
9 UI/UX
100 ms set-log budget; TalkBack pass; four-state screens
4.5
9
10 Testing
Coverage thresholds; four Maestro flows nightly
3.0
9
11 Docs and process
README check script; ADRs; generated AUDIT.md
4.0
9
12 Vision and safety
PROMISE, ADR-005, pause mode, risk-phrase path, measured median
5.0
9
Effort (solo, focused days): S1 0.5, S2 1, S3 3, S4 2, S5 4, S6 6, S7 4, S8 5, S9 5, S10 4, S11 1, S12 2, about 37 days; the first four sections (about 6.5 days) remove every verified P0 and are worth doing before anything else.
What 10/10 would additionally need: SQLCipher for the on-device database, crash and performance telemetry you control (Sentry with PII scrubbing), mutation testing on lib/domain, multi-device conflict resolution (today's design is single-device last-write-wins), automated perf budgets in CI, and a signed, reproducible build attestation. None of these are required for 9.