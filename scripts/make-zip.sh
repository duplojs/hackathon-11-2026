#!/usr/bin/env bash
# Archive ZIP de remise (PLAN §12) : IDENTIQUE au commit de tête de la PR.
#
# Usage : ./scripts/make-zip.sh [<ref>]     (défaut : HEAD, à lancer sur la branche de la PR)
# Sortie : out/hackathon-11-2026-<hash>.zip, son hash de commit et son empreinte SHA-256.
#
# L'archive est produite par `git archive` : elle ne contient QUE les fichiers versionnés du
# commit, donc ni dist/, ni out/, ni node_modules/ (ignorés par git). Le script refuse de
# s'exécuter si l'arbre de travail a des modifications non commitées (fichiers suivis), car
# l'archive ne correspondrait alors pas à ce que l'on croit remettre.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REF="${1:-HEAD}"

if [[ -n "$(git -C "$ROOT" status --porcelain --untracked-files=no)" ]]; then
	echo "💥 Modifications non commitées : commitez ou remisez-les avant de produire l'archive." >&2
	git -C "$ROOT" status --short --untracked-files=no >&2
	exit 1
fi

COMMIT="$(git -C "$ROOT" rev-parse --verify "$REF^{commit}")"
SHORT="$(git -C "$ROOT" rev-parse --short "$COMMIT")"
ARCHIVE="$ROOT/out/hackathon-11-2026-$SHORT.zip"
mkdir -p "$ROOT/out"
git -C "$ROOT" archive --format=zip --prefix=hackathon-11-2026/ -o "$ARCHIVE" "$COMMIT"

# Contrôle : aucun artefact de build ne doit figurer dans l'archive.
if unzip -Z1 "$ARCHIVE" | grep -E '(^|/)(node_modules|dist|out)/' > /dev/null; then
	echo "💥 L'archive contient des artefacts de build (node_modules/, dist/ ou out/) : vérifiez .gitignore." >&2
	exit 1
fi

if command -v shasum > /dev/null; then SHA="$(shasum -a 256 "$ARCHIVE" | cut -d' ' -f1)"; else SHA="$(sha256sum "$ARCHIVE" | cut -d' ' -f1)"; fi

echo "Archive : ${ARCHIVE#"$ROOT"/}"
echo "Commit  : $COMMIT"
echo "Fichiers: $(unzip -Z1 "$ARCHIVE" | grep -vc '/$')"
echo "SHA-256 : $SHA"
echo "À vérifier : ce commit doit être la tête de la PR vers duplojs/hackathon-11-2026."
