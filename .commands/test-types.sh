#!/usr/bin/env bash

set -euo pipefail

echo "App :"
tsc -p tsconfig.app.json
echo "Everything is OK."

echo "Lib :"
tsc -p tsconfig.config.json
echo "Everything is OK."
