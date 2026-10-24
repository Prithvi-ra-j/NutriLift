#!/usr/bin/env bash
set -eu

# Local-only denylist: create tools/pii-patterns.local with one extended-regex
# pattern per line. It is intentionally gitignored and must not contain user data
# in tracked source. CI can inject PII_PATTERNS_FILE from a protected secret/file.
# Registered Expo ownership and native application identifiers are intentional exceptions.
PATTERNS_FILE="${PII_PATTERNS_FILE:-tools/pii-patterns.local}"
if [ ! -f "$PATTERNS_FILE" ]; then
  echo "PII check cannot run: missing local denylist at $PATTERNS_FILE" >&2
  exit 2
fi

if ! grep -q '[^[:space:]]' "$PATTERNS_FILE"; then
  echo "PII check cannot run: denylist is empty." >&2
  exit 2
fi

set +e
matches=$(git grep -l -I -i -E -f "$PATTERNS_FILE" -- .)
grep_status=$?
set -e

if [ "$grep_status" -eq 0 ]; then
  printf '%s\n' "$matches"
  echo "Potential personal data found in tracked repository content." >&2
  exit 1
fi

if [ "$grep_status" -ne 1 ]; then
  echo "PII check failed while scanning tracked repository content." >&2
  exit "$grep_status"
fi

echo "PII tripwire passed."
