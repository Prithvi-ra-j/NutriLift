#!/usr/bin/env bash
set -euo pipefail

node --experimental-strip-types tools/check-size.ts "$@"
