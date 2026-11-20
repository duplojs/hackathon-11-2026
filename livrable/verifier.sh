#!/usr/bin/env bash
# Usage : ./livrable/verifier.sh            (depuis la racine du dépôt, après pnpm install)
#         ./livrable/verifier.sh 05         (un seul dossier de problématique)
#
# Lance chaque exemple Go écrit à la main (dossier contenant un main.go) et compare
# sa sortie à celle de sa référence TypeScript (index.ts dans le même dossier).
set -uo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
filter="${1:-}"
failed=0

while IFS= read -r main; do
	dir="$(dirname "$main")"
	name="${dir#livrable/}"
	[[ -n "$filter" && "$name" != "$filter"* ]] && continue

	if ! go_out="$(cd livrable && go run "./$name" 2>&1)"; then
		echo "GO KO      $name"
		echo "$go_out" | tail -10
		failed=1
		continue
	fi

	ts_out="$(pnpm exec tsx --tsconfig livrable/tsconfig.json "$dir/index.ts" 2>&1)"
	if diff <(printf '%s\n' "$ts_out") <(printf '%s\n' "$go_out") > /dev/null; then
		echo "IDENTIQUE  $name  ($(printf '%s\n' "$go_out" | wc -l) lignes)"
	else
		echo "DIFF       $name  (< TypeScript   > Go)"
		diff <(printf '%s\n' "$ts_out") <(printf '%s\n' "$go_out")
		failed=1
	fi
done < <(find livrable -name main.go -not -path "*/duplo/*" | sort)

exit "$failed"
