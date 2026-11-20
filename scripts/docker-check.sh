#!/usr/bin/env bash
# Lance la validation dans un conteneur Docker (macOS, Linux, WSL, Git Bash).
# Seul prérequis : Docker. Ni Node, ni pnpm, ni Go n'ont besoin d'être installés sur l'hôte.
#
# Usage : ./scripts/docker-check.sh                         check-all des exercices 00 à 10
#         ./scripts/docker-check.sh 01 variations/01-alias  check-all sur des cibles choisies
#         ./scripts/docker-check.sh --variations 01         toutes les variantes 01-*
#         ./scripts/docker-check.sh --check 01              check.sh détaillé d'une cible
#         ./scripts/docker-check.sh --run pnpm test:lint    n'importe quelle commande
#         ./scripts/docker-check.sh --shell                 shell dans le conteneur
#   DOCKER_REBUILD=1 force la reconstruction de l'image.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE="hackathon-duplojs-go:1"

if ! docker info > /dev/null 2>&1; then
	echo "💥 Docker n'est pas disponible : lancez Docker Desktop (ou le démon docker) puis réessayez." >&2
	exit 2
fi

if [[ "${DOCKER_REBUILD:-0}" == "1" ]] || ! docker image inspect "$IMAGE" > /dev/null 2>&1; then
	echo "Construction de l'image $IMAGE (une seule fois)…" >&2
	docker build -t "$IMAGE" "$ROOT/scripts/docker" >&2
fi

TTY=()
[[ -t 0 && -t 1 ]] && TTY=(-it)

# Sous Git Bash (Windows), empêche la conversion des chemins /work en C:/Program Files/Git/work.
export MSYS_NO_PATHCONV=1

exec docker run --rm ${TTY[@]+"${TTY[@]}"} \
	-e HOST_UID="$(id -u)" -e HOST_GID="$(id -g)" \
	-v "$ROOT":/work \
	-v hackathon-node-modules:/work/node_modules \
	-v hackathon-pnpm-store:/pnpm-store \
	-v hackathon-go-cache:/root/.cache/go-build \
	-v hackathon-go-mod:/go/pkg/mod \
	"$IMAGE" bash /work/scripts/docker/entrypoint.sh "$@"
