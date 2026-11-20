#!/usr/bin/env bash
# Usage : ./scripts/compare.sh 01
# Lance la version TypeScript (référence), transpile, lance le Go, et compare les deux sorties.
set -euo pipefail
n="$1"
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

ts_out="$(pnpm exec tsx --tsconfig "projects/$n/tsconfig.json" "projects/$n/index.ts" 2>&1)"

if ! build_log="$(pnpm run --silent "build:$n" 2>&1)"; then
	echo "BUILD KO ($n)"
	echo "$build_log" | tail -25
	exit 1
fi

if ! go_out="$(cd "projects/$n/dist" && go run . 2>&1)"; then
	echo "GO KO ($n)"
	echo "$go_out" | tail -25
	exit 1
fi

if diff <(printf '%s\n' "$ts_out") <(printf '%s\n' "$go_out") >/dev/null; then
	echo "OK $n : sorties identiques"
else
	echo "DIFF $n : < TypeScript   > Go"
	diff <(printf '%s\n' "$ts_out") <(printf '%s\n' "$go_out") || true
	exit 1
fi
