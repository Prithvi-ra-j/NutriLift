#!/usr/bin/env bash
set -eu

# Local-only denylist: create tools/pii-patterns.local with one extended-regex
# pattern per line. It is intentionally gitignored and must not contain user data
# in tracked source. CI can inject PII_PATTERNS_FILE from a protected secret/file.
PATTERNS_FILE="${PII_PATTERNS_FILE:-tools/pii-patterns.local}"
if [ ! -f "$PATTERNS_FILE" ]; then
  echo "PII check cannot run: missing local denylist at $PATTERNS_FILE" >&2
  exit 2
fi

if git grep -n -I -i -E -f "$PATTERNS_FILE" -- ':!tools/pii-patterns.local'; then
  echo "Potential personal data found in tracked repository content." >&2
  exit 1
fi

echo "PII tripwire passed."
