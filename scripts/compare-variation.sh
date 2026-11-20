#!/usr/bin/env bash
# Usage : ./scripts/compare-variation.sh 05
# Comme compare.sh, mais pour brouillons/variations-NN : les cas que le sujet ne teste pas
# (chemins d'échec, bugs trouvés en revue). La sortie de référence est dans attendu.txt.
set -euo pipefail
n="$1"
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
dir="brouillons/variations-$n"
out="$(mktemp -d)"

if ! build_log="$(pnpm run --silent build --tsconfig "$dir/tsconfig.json" --input "$dir/index.ts" --output "$out" 2>&1)"; then
	echo "BUILD KO (variations-$n)"
	echo "$build_log" | tail -25
	exit 1
fi

if ! go_out="$(cd "$out" && go run . 2>&1)"; then
	echo "GO KO (variations-$n)"
	echo "$go_out" | tail -25
	exit 1
fi

if diff "$dir/attendu.txt" <(printf '%s\n' "$go_out") >/dev/null; then
	echo "OK variations-$n : sorties identiques"
else
	echo "DIFF variations-$n : < attendu (Node)   > Go"
	diff "$dir/attendu.txt" <(printf '%s\n' "$go_out") || true
	exit 1
fi
