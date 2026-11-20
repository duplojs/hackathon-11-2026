#!/usr/bin/env bash
# Plan B de la démo (PLAN §0.8) : enregistre les sorties de la démo, en texte, pour pouvoir
# les montrer si le réseau, Docker ou Go font défaut le jour de la soutenance.
#
# Usage : ./scripts/record-demo.sh      (à lancer sur le commit LIVRÉ, après le gel du code)
#   DEMO_DIR=<dossier> change la destination (défaut : docs/demo).
# Fichiers produits (codes ANSI retirés, en-tête : commit, date, machine, commande) :
#   check-all.txt     ./scripts/check-all.sh
#   variations.txt    ./scripts/check-all.sh --variations
#   check-09.txt      ./scripts/check.sh 09
#   check-10.txt      ./scripts/check.sh 10
# Le script refuse de s'exécuter si des fichiers suivis ont des modifications non commitées :
# les sorties doivent correspondre exactement au commit indiqué dans leur en-tête.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEMO_DIR="${DEMO_DIR:-$ROOT/docs/demo}"

if [[ -n "$(git -C "$ROOT" status --porcelain --untracked-files=no)" ]]; then
	echo "💥 Modifications non commitées : les sorties ne correspondraient pas au commit." >&2
	git -C "$ROOT" status --short --untracked-files=no >&2
	exit 1
fi

COMMIT="$(git -C "$ROOT" rev-parse HEAD)"
if [[ "$(uname)" == Darwin ]]; then
	MACHINE="$(sysctl -n machdep.cpu.brand_string), macOS $(sw_vers -productVersion)"
else
	MACHINE="$(uname -srm)"
fi
MACHINE="$MACHINE, $(go version | cut -d' ' -f3-4), Node $(node --version)"
mkdir -p "$DEMO_DIR"

# record <fichier> <commande…> : exécute depuis la racine, retire les codes ANSI, ajoute l'en-tête.
# Le code de sortie de la commande est noté (des échecs attendus existent, ex. 10-sync-between).
record() {
	local file="$1"; shift
	local status=0
	local output
	output="$(cd "$ROOT" && "$@" 2>&1)" || status=$?
	{
		echo "# Commit : $COMMIT"
		echo "# Date   : $(date '+%Y-%m-%d %H:%M %Z')"
		echo "# Machine: $MACHINE"
		echo "# Commande : $* (code de sortie : $status)"
		echo
		printf '%s\n' "$output" | sed -E $'s/\x1b\\[[0-9;]*[A-Za-z]//g'
	} > "$DEMO_DIR/$file"
	echo "✔ $file (code de sortie $status)" >&2
}

record check-all.txt ./scripts/check-all.sh
record variations.txt ./scripts/check-all.sh --variations
record check-09.txt ./scripts/check.sh 09
record check-10.txt ./scripts/check.sh 10

echo "Sorties enregistrées dans ${DEMO_DIR#"$ROOT"/} pour le commit $COMMIT." >&2
