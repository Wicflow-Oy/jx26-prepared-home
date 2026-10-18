#!/usr/bin/env bash
# Builds the upload artifact on the dev PC (the box never runs npm install).
# Usage (Git Bash, repo root):  bash deploy/pack.sh
# Output: release/artifact/{server.mjs, web/ (landing at /, app at /app), samples/, cache/}, committed so the production box never runs npm.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ART="$ROOT/release/artifact"
# Separate lines so set -e stops here if a running server still locks the old artifact (Windows).
rm -rf "$ART"
mkdir -p "$ART/samples" "$ART/cache/assessments"

echo "1/4 bundling the server (engine and npm deps included)"
( cd "$ROOT/server" && npm run bundle )
test -f "$ART/server.mjs"

echo "2/4 exporting the web app to /app (same-origin /api) and adding the landing page at /"
# No EXPO_PUBLIC_API_BASE_URL here: production web builds default to same-origin /api,
# and Git Bash would rewrite a "/api" value into a Windows path.
( cd "$ROOT/app" && npx expo export --platform web --output-dir dist )
mkdir -p "$ART/web"
cp -r "$ROOT/app/dist" "$ART/web/app"
( cd "$ROOT/landing" && cp index.html tech.html styles.css main.js tour.css tour.js tour-captions.js robots.txt favicon.svg if-logo.svg qr.svg manifest.webmanifest "$ART/web/" && cp -r fonts "$ART/web/" )

echo "3/4 copying the licensed sample photos (with attribution)"
cp "$ROOT/server/eval/photos/"*.jpg "$ROOT/server/eval/photos/README.md" "$ART/samples/"

echo "4/4 copying recorded assessments (cache), if any"
if compgen -G "$ROOT/server/cache/assessments/*.json" > /dev/null; then
  cp "$ROOT/server/cache/assessments/"*.json "$ART/cache/assessments/"
fi

du -sh "$ART" "$ART"/* 2>/dev/null || true
echo "Artifact ready. Commit release/artifact, push, and the operator deploys per DEPLOY.md."
