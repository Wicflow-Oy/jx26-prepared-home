#!/usr/bin/env bash
# Builds the upload artifact on the dev PC (the box never runs npm install).
# Usage (Git Bash, repo root):  bash deploy/pack.sh
# Output: deploy/artifact/{server.mjs, web/, samples/, cache/}
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ART="$ROOT/deploy/artifact"
rm -rf "$ART" && mkdir -p "$ART/samples" "$ART/cache/assessments"

echo "1/4 bundling the server (engine and npm deps included)"
( cd "$ROOT/server" && npm run bundle )
test -f "$ART/server.mjs"

echo "2/4 exporting the web app (same-origin /api)"
( cd "$ROOT/app" && EXPO_PUBLIC_API_BASE_URL=/api npx expo export --platform web --output-dir dist )
cp -r "$ROOT/app/dist" "$ART/web"

echo "3/4 copying the licensed sample photos (with attribution)"
cp "$ROOT/server/eval/photos/"*.jpg "$ROOT/server/eval/photos/README.md" "$ART/samples/"

echo "4/4 copying recorded assessments (cache), if any"
if compgen -G "$ROOT/server/cache/assessments/*.json" > /dev/null; then
  cp "$ROOT/server/cache/assessments/"*.json "$ART/cache/assessments/"
fi

du -sh "$ART" "$ART"/* 2>/dev/null || true
echo "Artifact ready. Upload with the command in deploy/README.md."
