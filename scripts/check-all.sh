#!/usr/bin/env bash
# Lance scripts/check.sh sur plusieurs cibles et affiche un tableau récapitulatif (Markdown).
#
# Usage : ./scripts/check-all.sh                       exercices 00 à 10
#         ./scripts/check-all.sh 01 02 variations/01-alias   cibles au choix (numéros ou dossiers)
#         ./scripts/check-all.sh --variations          toutes les variantes de variations/
#         ./scripts/check-all.sh --variations 01       seulement les variantes dont le nom commence par 01
# Le détail de chaque cible reste disponible dans out/<id>.* (id = XX ou nom du dossier).
# Code de sortie : 0 si toutes les cibles sont identiques, 1 sinon.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/out"

if [[ "${1:-}" == "--variations" ]]; then
	shift
	PREFIXES=("$@")
	[[ ${#PREFIXES[@]} -gt 0 ]] || PREFIXES=("")
	IDS=()
	for prefix in "${PREFIXES[@]}"; do
		for dir in "$ROOT"/variations/"$prefix"*/; do
			[[ -f "$dir/index.ts" ]] && IDS+=("variations/$(basename "$dir")")
		done
	done
	if [[ ${#IDS[@]} -eq 0 ]]; then
		echo "Aucune variante trouvée dans variations/ (préfixe : ${PREFIXES[*]:-aucun})." >&2
		exit 2
	fi
elif [[ $# -gt 0 ]]; then
	IDS=("$@")
else
	IDS=(00 01 02 03 04 05 06 07 08 09 10)
fi

icon() {
	case "$1" in
		OK) echo "✅" ;;
		FAIL) echo "❌" ;;
		*) echo "–" ;;
	esac
}

# Cause courte de l'échec, tirée des fichiers produits par check.sh.
cause() {
	local id="$1" build="$2" run="$3" diff="$4" ts="$5"
	if [[ "$build" == FAIL ]]; then
		if [[ -f "$OUT/$id.build.summary" ]]; then
			local info kind text
			info=$(sed -nE "s/^information: '(.*)',?$/\1/p" "$OUT/$id.build.summary" | head -1)
			kind=$(sed -nE "s/^kind: '(.*)',?$/\1/p" "$OUT/$id.build.summary" | head -1)
			# Un texte sur plusieurs lignes est affiché par Node sous la forme 'ligne\n' + … : on garde la première.
			text=$(sed -nE "s/^text: '(.*)',?$/\1/p; s/^text: '(.*)\\\\n' \+$/\1 …/p" "$OUT/$id.build.summary" | head -1)
			echo "${info} : \`${kind}\` \`${text}\`"
		else
			echo "voir out/$id.build.log"
		fi
	elif [[ "$run" == FAIL ]]; then
		grep -m1 -E "\.go:[0-9]+:[0-9]+:|panic:" "$OUT/$id.go.err" 2>/dev/null \
			| sed -E 's/^[^ ]*\/([^/]+\.go:)/\1/; s/\|/\\|/g' || echo "voir out/$id.go.err"
	elif [[ "$diff" == FAIL ]]; then
		echo "sorties différentes (out/$id.diff)"
	elif [[ "$ts" == FAIL ]]; then
		echo "référence TS en échec (out/$id.ts.err)"
	fi
}

ROWS=()
FAILED=0

for target in "${IDS[@]}"; do
	verdict=$(CHECK_QUIET=1 "$ROOT/scripts/check.sh" "$target" 2>&1) || FAILED=$((FAILED + 1))
	# check.sh nomme ses fichiers out/ d'après le numéro ou le nom du dossier.
	id="$(basename "${target%/}")"
	echo "$verdict" >&2

	ts=SKIP build=SKIP vet=SKIP run=SKIP diff=SKIP
	if [[ -f "$OUT/$id.status" ]]; then
		# shellcheck disable=SC1090
		eval "$(tr ' ' '\n' < "$OUT/$id.status")"
	fi

	ROWS+=("| $id | $(icon "$ts") | $(icon "$build") | $(icon "$vet") | $(icon "$run") | $(icon "$diff") | $(cause "$id" "$build" "$run" "$diff" "$ts") |")
done

echo
echo "| Cible | TS | Transpile | go vet | go run | diff | Cause du premier échec |"
echo "|---|---|---|---|---|---|---|"
printf '%s\n' "${ROWS[@]}"
echo
echo "$(( ${#IDS[@]} - FAILED ))/${#IDS[@]} cibles avec une sortie Go identique à TypeScript."

[[ "$FAILED" -eq 0 ]]
