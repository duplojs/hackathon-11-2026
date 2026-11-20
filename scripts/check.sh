#!/usr/bin/env bash
# Vérifie un exercice ou une variante : référence TS → transpilation → go vet → go run → diff.
#
# Usage : ./scripts/check.sh <XX>                  exercice officiel   (ex. ./scripts/check.sh 01)
#         ./scripts/check.sh <dossier>             variante ou projet  (ex. ./scripts/check.sh variations/01-alias)
#   Le dossier doit contenir index.ts et tsconfig.json ; il peut être relatif à la racine du dépôt ou au dossier courant.
#   CHECK_QUIET=1   n'affiche que le verdict final (utilisé par check-all.sh)
#   CHECK_TIMEOUT=N délai max en secondes pour l'exécution TS et Go (défaut 30)
#
# Fichiers produits dans out/ (ID = XX pour un exercice, nom du dossier pour une variante, ex. 01-alias) :
#   ID.ts.txt / ID.ts.err   sortie standard / erreur de la référence TypeScript
#   ID.build.log            sortie de la transpilation (+ ID.build.summary : cause extraite)
#   ID.vet.log              sortie de go vet
#   ID.go.txt / ID.go.err   sortie standard / erreur de go run
#   ID.diff                 diff entre ID.ts.txt et ID.go.txt
#   ID.status               statut de chaque étape (lu par check-all.sh)
#
# Code de sortie : 0 si les sorties TS et Go sont identiques, 1 sinon, 2 si usage invalide.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TIMEOUT="${CHECK_TIMEOUT:-30}"
QUIET="${CHECK_QUIET:-0}"

usage() {
	echo "Usage : $0 <XX | dossier>   (ex. $0 01, $0 variations/01-alias)" >&2
	exit 2
}

[[ $# -eq 1 ]] || usage
TARGET="${1%/}"

if [[ "$TARGET" =~ ^[0-9]{2}$ ]]; then
	ID="$TARGET"
	LABEL="Exercice $ID"
	PROJECT="$ROOT/projects/$ID"
elif [[ -d "$ROOT/$TARGET" ]]; then
	PROJECT="$(cd "$ROOT/$TARGET" && pwd)"
elif [[ -d "$TARGET" ]]; then
	PROJECT="$(cd "$TARGET" && pwd)"
else
	echo "💥 ÉCHEC [$TARGET] : ni numéro d'exercice (XX) ni dossier existant" >&2
	exit 2
fi

if [[ -z "${ID:-}" ]]; then
	case "$PROJECT" in
		"$ROOT"/*) ;;
		*) echo "💥 ÉCHEC [$TARGET] : le dossier doit être dans le dépôt ($ROOT)" >&2; exit 2 ;;
	esac
	ID="$(basename "$PROJECT")"
	if [[ "$PROJECT" == "$ROOT/projects/$ID" && "$ID" =~ ^[0-9]{2}$ ]]; then
		LABEL="Exercice $ID"
	else
		LABEL="Variante $ID"
	fi
fi

# Chemin relatif à la racine : le CLI et tsx sont lancés depuis la racine du dépôt.
REL="${PROJECT#"$ROOT"/}"
DIST="$PROJECT/dist"
OUT="$ROOT/out"

for required in index.ts tsconfig.json; do
	if [[ ! -f "$PROJECT/$required" ]]; then
		echo "💥 ÉCHEC [$ID] : $REL/$required introuvable" >&2
		exit 2
	fi
done

mkdir -p "$OUT"
rm -f "$OUT/$ID".*

log() {
	[[ "$QUIET" == "1" ]] || echo "$@"
}

# Affiche les premières lignes d'un fichier de log en cas d'échec.
excerpt() {
	[[ "$QUIET" == "1" ]] && return 0
	sed -n '1,15p' "$1" | sed 's/^/    │ /'
	local lines
	lines=$(wc -l < "$1" | tr -d ' ')
	if (( lines > 15 )); then
		echo "    │ … ($lines lignes, voir ${1#"$ROOT"/})"
	fi
}

# Exécute une commande avec un délai maximum (macOS n'a pas `timeout` par défaut).
with_timeout() {
	perl -e 'alarm shift; exec @ARGV or die "exec: $!"' "$TIMEOUT" "$@"
}

TS=SKIP
BUILD=SKIP
VET=SKIP
RUN=SKIP
DIFF=SKIP

log "━━ $LABEL ($REL) ━━"

# 1. Référence TypeScript
if (cd "$ROOT" && with_timeout pnpm exec tsx --tsconfig "$REL/tsconfig.json" "$REL/index.ts") \
	> "$OUT/$ID.ts.txt" 2> "$OUT/$ID.ts.err"; then
	TS=OK
	log "  [1/5] référence TS   ✔"
else
	TS=FAIL
	log "  [1/5] référence TS   ✘ (out/$ID.ts.err)"
	excerpt "$OUT/$ID.ts.err"
fi

# 2. Transpilation (même commande que les scripts build:XX, valable aussi pour une variante)
if (cd "$ROOT" && pnpm --silent run build --tsconfig "$REL/tsconfig.json" --input "$REL/index.ts" --output "$REL/dist") \
	> "$OUT/$ID.build.log" 2>&1; then
	BUILD=OK
	log "  [2/5] transpilation  ✔"
else
	BUILD=FAIL
	log "  [2/5] transpilation  ✘ (out/$ID.build.log)"
	# Le CLI lève un NotRightError dont la valeur est l'Either gauche du transpileur :
	# on en extrait l'information et le nœud TS concerné, plus lisibles que la stack.
	if grep -q "DuplojsLangEither/information" "$OUT/$ID.build.log"; then
		grep -E "DuplojsLangEither/information'|^ +(kind|parentKind|text|content): " "$OUT/$ID.build.log" \
			| sed -E "s/.*DuplojsLangEither\/information'/information/; s/^ +//" \
			> "$OUT/$ID.build.summary"
		excerpt "$OUT/$ID.build.summary"
	else
		excerpt "$OUT/$ID.build.log"
	fi
fi

# 3. go vet (inclut la compilation)
if [[ "$BUILD" == OK ]]; then
	if (cd "$DIST" && GOWORK=off go vet ./...) > "$OUT/$ID.vet.log" 2>&1; then
		VET=OK
		log "  [3/5] go vet         ✔"
	else
		VET=FAIL
		log "  [3/5] go vet         ✘ (out/$ID.vet.log)"
		excerpt "$OUT/$ID.vet.log"
	fi
else
	log "  [3/5] go vet         – (ignoré : transpilation en échec)"
fi

# 4. go run (tenté même si go vet échoue : vet peut signaler sans bloquer la compilation)
if [[ "$BUILD" == OK ]]; then
	if (cd "$DIST" && GOWORK=off with_timeout go run .) > "$OUT/$ID.go.txt" 2> "$OUT/$ID.go.err"; then
		RUN=OK
		log "  [4/5] go run         ✔"
	else
		RUN=FAIL
		log "  [4/5] go run         ✘ (out/$ID.go.err)"
		excerpt "$OUT/$ID.go.err"
	fi
else
	log "  [4/5] go run         – (ignoré : transpilation en échec)"
fi

# 5. Comparaison des sorties
if [[ "$TS" == OK && "$RUN" == OK ]]; then
	if diff -u --label "TypeScript" --label "Go" "$OUT/$ID.ts.txt" "$OUT/$ID.go.txt" > "$OUT/$ID.diff"; then
		DIFF=OK
		log "  [5/5] diff           ✔"
	else
		DIFF=FAIL
		log "  [5/5] diff           ✘ (out/$ID.diff)"
		excerpt "$OUT/$ID.diff"
	fi
else
	log "  [5/5] diff           – (ignoré : une exécution a échoué)"
fi

printf 'ts=%s build=%s vet=%s run=%s diff=%s\n' "$TS" "$BUILD" "$VET" "$RUN" "$DIFF" > "$OUT/$ID.status"

# Verdict : la première étape en échec est désignée.
if [[ "$DIFF" == OK ]]; then
	[[ "$VET" == OK ]] && echo "✅ IDENTIQUE [$ID]" || echo "✅ IDENTIQUE [$ID] (avertissements go vet : out/$ID.vet.log)"
	exit 0
elif [[ "$DIFF" == FAIL ]]; then
	echo "❌ DIFFÉRENT [$ID] : voir out/$ID.diff"
	exit 1
elif [[ "$BUILD" == FAIL ]]; then
	echo "💥 ÉCHEC [$ID] à l'étape : transpilation"
elif [[ "$RUN" == FAIL ]]; then
	if [[ "$VET" == FAIL ]]; then
		echo "💥 ÉCHEC [$ID] à l'étape : go vet (compilation Go)"
	else
		echo "💥 ÉCHEC [$ID] à l'étape : go run"
	fi
elif [[ "$TS" == FAIL ]]; then
	echo "💥 ÉCHEC [$ID] à l'étape : référence TS"
fi
exit 1
