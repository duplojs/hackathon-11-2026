#!/usr/bin/env bash
# Point d'entrée du conteneur de validation (appelé par docker-check.sh / docker-check.ps1).
#
#   (aucun argument ou arguments de check-all)  → ./scripts/check-all.sh "$@"
#   --check <cible>                              → ./scripts/check.sh <cible>
#   --run <commande…>                            → exécute la commande (ex. --run pnpm test:lint)
#   --shell                                      → shell interactif
#
# node_modules est un volume Docker propre au conteneur : les binaires natifs de l'hôte
# (macOS, Windows) ne sont jamais utilisés sous Linux, et le node_modules de l'hôte n'est pas modifié.

set -euo pipefail
cd /work

# Rend les fichiers produits à l'utilisateur de l'hôte (utile sous Linux/WSL, sans effet sous Docker Desktop).
restore_owner() {
	if [[ -n "${HOST_UID:-}" && -n "${HOST_GID:-}" ]]; then
		chown -R "$HOST_UID:$HOST_GID" out projects/*/dist variations/*/dist 2>/dev/null || true
	fi
}
trap restore_owner EXIT

if ! pnpm install --frozen-lockfile --store-dir /pnpm-store > /tmp/pnpm-install.log 2>&1; then
	cat /tmp/pnpm-install.log >&2
	echo "💥 pnpm install a échoué dans le conteneur" >&2
	exit 1
fi

case "${1:-}" in
	--check)
		shift
		./scripts/check.sh "$@"
		;;
	--run)
		shift
		"$@"
		;;
	--shell)
		bash
		;;
	*)
		./scripts/check-all.sh "$@"
		;;
esac
