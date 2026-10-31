#!/usr/bin/env bash
# Copies the pinned DOMPurify build from node_modules into vendor/.
# vendor/ is not committed; the release package and local test runs build it.
#
#   npm ci && ./tools/vendor.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SRC="node_modules/dompurify"
if [ ! -f "$SRC/dist/purify.min.js" ]; then
  echo "DOMPurify not installed. Run 'npm ci' first." >&2
  exit 1
fi

# The copy must be the version package.json pins, nothing that drifted in.
PINNED="$(node -p "require('./package.json').dependencies.dompurify")"
INSTALLED="$(node -p "require('./$SRC/package.json').version")"
if [ "$PINNED" != "$INSTALLED" ]; then
  echo "DOMPurify mismatch: package.json pins $PINNED, node_modules has $INSTALLED." >&2
  exit 1
fi
if ! head -c 200 "$SRC/dist/purify.min.js" | grep -q "DOMPurify $PINNED "; then
  echo "purify.min.js banner does not name version $PINNED." >&2
  exit 1
fi

mkdir -p vendor
cp "$SRC/dist/purify.min.js" vendor/purify.min.js
cp "$SRC/LICENSE" vendor/DOMPurify-LICENSE
cp "$SRC/LICENSE-MPL" vendor/DOMPurify-LICENSE-MPL
echo "vendor/purify.min.js: DOMPurify $PINNED"
