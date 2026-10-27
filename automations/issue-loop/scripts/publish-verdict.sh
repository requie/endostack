#!/bin/sh
# Thin wrapper so workflows can call the script by its documented .sh name.
# All logic and validation live in publish-verdict.mjs beside this file.
set -eu
exec node "$(dirname "$0")/publish-verdict.mjs" "$@"
