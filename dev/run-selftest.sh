#!/bin/sh
# Assemble dom-stub + the real app.js + the assertions, and run them on
# JavaScriptCore. No npm, no node, no dependencies.
set -e
cd "$(dirname "$0")/.."

OUT=$(mktemp -t tower-selftest).js
trap 'rm -f "$OUT"' EXIT

# Every id in index.html, as a JS array literal, so the stub only ever hands
# app.js nodes that genuinely exist in the markup.
IDS=$(grep -o 'id="[^"]*"' index.html | sed 's/^id="//; s/"$//' | awk 'NR>1{printf ","} {printf "\"%s\"", $0}')

{
  cat dev/dom-stub.js
  echo "globalThis.__IDS = [$IDS];"
  # Drop app.js's own bootstrap: the self-test calls init() itself.
  sed 's|^document.addEventListener("DOMContentLoaded", init);|/* bootstrap handled by the self-test */|' app.js
  cat dev/selftest.js
} > "$OUT"

osascript -l JavaScript "$OUT"
