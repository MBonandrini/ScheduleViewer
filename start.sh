#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
if ! command -v node >/dev/null 2>&1; then
  echo 'Install Node.js 20 or newer (including npm), then run: bash start.sh'
  exit 1
fi
node -e 'if(Number(process.versions.node.split(".")[0])<20){console.error("Node.js 20+ is required");process.exit(1)}'
exec node tools/serve.mjs "$@"
