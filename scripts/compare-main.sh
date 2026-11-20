#!/usr/bin/env bash
# Contrôle de la règle de merge (PLAN §0.2) : compare une branche (ou un patch) à main.
#
# Usage : ./scripts/compare-main.sh <branche|commit>          ex. ./scripts/compare-main.sh sprint2/hotfix-i1
#         ./scripts/compare-main.sh --patch <fichier.patch>   évalue un patch appliqué sur main (avant même la PR)
#   COMPARE_BASE=<ref> change la référence (défaut : origin/main).
#
# Les deux côtés sont extraits dans des copies jetables (git worktree, dossier temporaire) ;
# le dépôt de travail n'est pas modifié. Pour que la comparaison soit équitable, les DEUX côtés
# utilisent les scripts/ et variations/ du dossier de travail courant.
# Pour chaque côté : ./scripts/check-all.sh (00 à 10) et ./scripts/check-all.sh --variations.
#
# Sortie : un rapport Markdown (à coller en commentaire de PR) dans out/compare-<nom>.md, aussi affiché.
# Code de sortie : 0 si aucune régression et aucun marqueur de bouchon, 1 sinon, 2 si usage invalide.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE="${COMPARE_BASE:-origin/main}"
PATCH=""

usage() {
	echo "Usage : $0 <branche|commit> | --patch <fichier.patch>" >&2
	exit 2
}

[[ $# -ge 1 ]] || usage
if [[ "$1" == "--patch" ]]; then
	[[ $# -eq 2 && -f "$2" ]] || usage
	PATCH="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"
	NAME="patch-$(basename "$2" .patch)"
	HEAD_REF="$BASE"
else
	[[ $# -eq 1 ]] || usage
	NAME="$(echo "$1" | tr '/' '-')"
	git -C "$ROOT" fetch -q origin 2> /dev/null || true
	if git -C "$ROOT" rev-parse -q --verify "origin/$1^{commit}" > /dev/null; then
		HEAD_REF="origin/$1"
	elif git -C "$ROOT" rev-parse -q --verify "$1^{commit}" > /dev/null; then
		HEAD_REF="$1"
	else
		echo "💥 Référence introuvable : $1 (ni origin/$1 ni $1)" >&2
		exit 2
	fi
fi

git -C "$ROOT" rev-parse -q --verify "$BASE^{commit}" > /dev/null || { echo "💥 Base introuvable : $BASE" >&2; exit 2; }

if [[ -n "$PATCH" ]]; then
	HEAD_LABEL="$BASE + $(basename "$PATCH")"
else
	HEAD_LABEL="$HEAD_REF"
fi

WORK="$(mktemp -d "${TMPDIR:-/tmp}/compare-main.XXXXXX")"
cleanup() {
	git -C "$ROOT" worktree remove --force "$WORK/base" > /dev/null 2>&1 || true
	git -C "$ROOT" worktree remove --force "$WORK/head" > /dev/null 2>&1 || true
	rm -rf "$WORK"
}
trap cleanup EXIT

# Prépare une copie : extraction, patch éventuel, harnais commun, dépendances.
prepare() {
	local dir="$1" ref="$2" patch="${3:-}"
	git -C "$ROOT" worktree add -q --detach "$dir" "$ref"
	if [[ -n "$patch" ]]; then
		git -C "$dir" apply --whitespace=nowarn "$patch" || { echo "💥 Le patch ne s'applique pas sur $ref" >&2; exit 2; }
	fi
	rm -rf "$dir/scripts" "$dir/variations"
	cp -R "$ROOT/scripts" "$dir/scripts"
	[[ -d "$ROOT/variations" ]] && cp -R "$ROOT/variations" "$dir/variations"
	rm -rf "$dir/variations"/*/dist
	(cd "$dir" && pnpm install --frozen-lockfile --prefer-offline > "$dir/.pnpm-install.log" 2>&1) \
		|| { cat "$dir/.pnpm-install.log" >&2; echo "💥 pnpm install a échoué ($ref)" >&2; exit 2; }
}

# Lance la validation complète d'une copie (les codes de sortie non nuls sont attendus).
run_checks() {
	local dir="$1"
	(cd "$dir" && ./scripts/check-all.sh > /dev/null 2>&1) || true
	if compgen -G "$dir/variations/*/index.ts" > /dev/null; then
		(cd "$dir" && ./scripts/check-all.sh --variations > /dev/null 2>&1) || true
	fi
}

# Verdict court d'une cible à partir de out/<id>.status.
verdict() {
	local file="$1/out/$2.status"
	[[ -f "$file" ]] || { echo "absent"; return; }
	local ts=SKIP build=SKIP vet=SKIP run=SKIP diff=SKIP
	eval "$(tr ' ' '\n' < "$file")"
	if [[ "$diff" == OK ]]; then echo "✅"
	elif [[ "$diff" == FAIL ]]; then echo "❌ diff"
	elif [[ "$build" == FAIL ]]; then echo "💥 transpile"
	elif [[ "$vet" == FAIL || "$run" == FAIL ]]; then echo "💥 go"
	elif [[ "$ts" == FAIL ]]; then echo "💥 TS"
	else echo "?"
	fi
}

echo "Préparation de $BASE et de $HEAD_LABEL dans $WORK…" >&2
prepare "$WORK/base" "$BASE"
prepare "$WORK/head" "$HEAD_REF" "$PATCH"
echo "Validation de $BASE…" >&2
run_checks "$WORK/base"
echo "Validation de $HEAD_LABEL…" >&2
run_checks "$WORK/head"

TARGETS=(00 01 02 03 04 05 06 07 08 09 10)
for dir in "$ROOT"/variations/*/; do
	[[ -f "$dir/index.ts" ]] && TARGETS+=("$(basename "$dir")")
done

REGRESSIONS=0
IMPROVEMENTS=0
PASS_BASE=0
PASS_HEAD=0
ROWS=()
for id in "${TARGETS[@]}"; do
	b="$(verdict "$WORK/base" "$id")"
	h="$(verdict "$WORK/head" "$id")"
	[[ "$b" == "✅" ]] && PASS_BASE=$((PASS_BASE + 1))
	[[ "$h" == "✅" ]] && PASS_HEAD=$((PASS_HEAD + 1))
	trend=""
	if [[ "$b" == "✅" && "$h" != "✅" ]]; then trend="🔴 **régression**"; REGRESSIONS=$((REGRESSIONS + 1))
	elif [[ "$b" != "✅" && "$h" == "✅" ]]; then trend="🟢 corrigé"; IMPROVEMENTS=$((IMPROVEMENTS + 1))
	elif [[ "$b" != "$h" ]]; then trend="↔ autre échec"
	fi
	ROWS+=("| $id | $b | $h | $trend |")
done

# Marqueurs de code provisoire introduits par la branche (src/ uniquement).
if [[ -n "$PATCH" ]]; then
	ADDED="$(grep -E '^\+[^+]' "$PATCH" || true)"
else
	ADDED="$(git -C "$ROOT" diff "$BASE...$HEAD_REF" -- src | grep -E '^\+[^+]' || true)"
fi
MARKERS="$(printf '%s\n' "$ADDED" | grep -inE 'TEMPORAIRE|TEMPORARY|bouchon|stub|FIXME|TODO|not wired|pas encore branch' || true)"

REPORT="$ROOT/out/compare-$NAME.md"
mkdir -p "$ROOT/out"
{
	echo "## Contrôle de merge : \`$HEAD_LABEL\` contre \`$BASE\`"
	echo
	echo "- Base : \`$(git -C "$WORK/base" rev-parse --short HEAD)\` · Branche : \`$(git -C "$WORK/head" rev-parse --short HEAD)\`${PATCH:+ + patch}"
	echo "- Harnais commun : \`scripts/\` et \`variations/\` de \`$(git -C "$ROOT" rev-parse --abbrev-ref HEAD)\` ($(git -C "$ROOT" rev-parse --short HEAD))"
	echo "- Cibles identiques à TypeScript : **$PASS_BASE → $PASS_HEAD** / ${#TARGETS[@]} · corrigées : $IMPROVEMENTS · **régressions : $REGRESSIONS**"
	echo
	echo "| Cible | Base | Branche | Évolution |"
	echo "|---|---|---|---|"
	printf '%s\n' "${ROWS[@]}"
	echo
	if [[ -n "$MARKERS" ]]; then
		echo "### ⚠️ Marqueurs de code provisoire ajoutés dans src/"
		echo
		echo '```'
		printf '%s\n' "$MARKERS" | cut -c1-160
		echo '```'
		echo
	fi
	echo "### Points à vérifier à la main"
	echo
	echo "- [ ] Chaque point de contact du sprint (§8) est **branché** dans cette PR et couvert par une cible ci-dessus."
	echo "- [ ] \`pnpm test:types\` et \`pnpm test:lint\` au vert."
	echo
	if [[ "$REGRESSIONS" -eq 0 && -z "$MARKERS" ]]; then
		echo "**Verdict : ✅ mergeable** (aucune régression, aucun marqueur provisoire)."
	else
		echo "**Verdict : ⛔ à bloquer** (régression ou code provisoire, voir ci-dessus)."
	fi
} > "$REPORT"

cat "$REPORT"
echo >&2
echo "Rapport : ${REPORT#"$ROOT"/}" >&2

[[ "$REGRESSIONS" -eq 0 && -z "$MARKERS" ]]
