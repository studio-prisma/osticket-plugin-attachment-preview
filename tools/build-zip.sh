#!/usr/bin/env bash
# Builds the install package: dist/attachment-preview-<version>.zip
#
#   npm ci && ./tools/build-zip.sh          # version read from plugin.php
#   ./tools/build-zip.sh 2.0.0              # explicit version (must match plugin.php)
#
# The archive holds exactly the production files plus the pinned DOMPurify build,
# nested in an `attachment-preview/` folder that unzips straight into
# `include/plugins/`.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MANIFEST_VERSION="$(grep -oE "'version'[[:space:]]*=>[[:space:]]*'[^']+'" plugin.php | head -1 | sed -E "s/.*'([^']+)'\$/\1/")"
VERSION="${1:-$MANIFEST_VERSION}"

if [ "$VERSION" != "$MANIFEST_VERSION" ]; then
  echo "Version mismatch: requested '$VERSION', plugin.php declares '$MANIFEST_VERSION'." >&2
  exit 1
fi

./tools/vendor.sh

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

PKG="$STAGE/attachment-preview"
mkdir -p "$PKG/vendor"
cp plugin.php config.php class.AttachmentPreviewPlugin.php script.js stylesheet.css LICENSE "$PKG/"
cp vendor/purify.min.js vendor/DOMPurify-LICENSE vendor/DOMPurify-LICENSE-MPL "$PKG/vendor/"

# Nothing from development may ship: no VCS data, no tests, no node_modules.
if find "$PKG" \( -name '.git' -o -name 'node_modules' -o -name 'tests' -o -name '*.phar' \) | grep -q .; then
  echo "Refusing to build: development files in the package." >&2
  exit 1
fi

mkdir -p dist
rm -f "dist/attachment-preview-${VERSION}.zip"
# Reproducible archive: every file gets the commit date, entries are sorted,
# no extra fields. Building the same commit twice yields the same bytes, so a
# rebuilt release keeps its checksum and its provenance attestation.
EPOCH="$(git log -1 --format=%ct 2>/dev/null || true)"
if [ -z "$EPOCH" ]; then
  EPOCH="$(date +%s)"
  echo "Note: not a git checkout, using the current time for file dates." >&2
fi
find "$STAGE" -exec touch -d "@$EPOCH" {} +
( cd "$STAGE" && find attachment-preview -type f | LC_ALL=C sort | TZ=UTC zip -X -q "attachment-preview-${VERSION}.zip" -@ )
mv "$STAGE/attachment-preview-${VERSION}.zip" "dist/"

echo "Built dist/attachment-preview-${VERSION}.zip"
unzip -l "dist/attachment-preview-${VERSION}.zip"
