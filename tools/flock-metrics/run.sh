#!/bin/bash
# Headless flock metrics, run inside the Playwright Docker image.
#   tools/flock-metrics/run.sh [page.html] [spec.json]
# page defaults to index.html, spec to specs/default.json. Files are staged into a temp dir first
# (Docker Desktop on macOS often can't read ~/Documents directly).
set -e
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../.." && pwd)
PAGE=${1:-index.html}; SPEC=${2:-$HERE/specs/default.json}
WORK=$(mktemp -d)
cp "$ROOT/$PAGE" "$WORK/index.html"; cp "$HERE/metrics.js" "$HERE/harness.mjs" "$WORK/"; cp "$SPEC" "$WORK/spec.json"
docker run --rm -v "$WORK":/w -w /w mcr.microsoft.com/playwright:v1.64.0-noble bash -c \
  'npm i -s playwright@1.64.0 >/dev/null 2>&1; (python3 -m http.server 8123 >/dev/null 2>&1 &); sleep 1; node harness.mjs http://localhost:8123/index.html spec.json'
rm -rf "$WORK"
