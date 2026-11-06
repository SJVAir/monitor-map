#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
SDK=${MAP_SDK_DIR:-$(cd "$(git rev-parse --git-common-dir)/../.." && pwd)/map-sdk}
npm --prefix "$SDK" run build
mkdir -p vendor
tarball=$(npm pack "$SDK" --pack-destination vendor | tail -n 1)
echo "vendor/$tarball"
