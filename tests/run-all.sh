#!/usr/bin/env bash
# Runs every test suite. Needs php (8.0+) and node (20+), and `npm ci` once.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f vendor/purify.min.js ] || ./tools/vendor.sh

php tests/unit.php
php tests/failmode.php
php tests/integration.php
node tests/js/run.js
