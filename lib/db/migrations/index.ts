import type { Migration } from "./runner";
import { up as baseline } from "./001_baseline";
import { up as legacyColumns } from "./002_legacy_columns";
import { up as syncColumns } from "./003_sync_columns";
import { up as profile } from "./004_profile";
import { up as domainRules } from "./005_domain_rules";
import { up as syncQueue } from "./006_sync_queue";

export const migrations: Migration[] = [
  { version: 1, name: "baseline", up: baseline },
  { version: 2, name: "legacy_columns", up: legacyColumns },
  { version: 3, name: "sync_columns", up: syncColumns },
  { version: 4, name: "profile", up: profile },
  { version: 5, name: "domain_rules", up: domainRules },
  { version: 6, name: "sync_queue", up: syncQueue },
];
