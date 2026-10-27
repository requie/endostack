#!/bin/sh
# Install tstack into the coding agents on this machine.
# Usage: ./install.sh [--scope project|user] [--agents auto|<list>] [--link] [--dry-run] [--uninstall]
# Full option list: ./install.sh --help
set -eu
HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if ! command -v node >/dev/null 2>&1; then
  echo "tstack install needs Node.js 22 or newer on PATH (https://nodejs.org)." >&2
  exit 2
fi
exec node "$HERE/scripts/install.mjs" "$@"
