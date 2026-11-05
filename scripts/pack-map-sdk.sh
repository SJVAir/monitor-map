#!/usr/bin/env bash
set -euo pipefail
npm --prefix ../map-sdk run build
mkdir -p vendor
tarball=$(npm pack ../map-sdk --pack-destination vendor | tail -n 1)
echo "vendor/$tarball"
