#!/usr/bin/env bash
# Rejoue toutes les mesures de l'ADR-1 dans un conteneur Go officiel.
# Pourquoi Docker : sur nos postes Windows 11, Smart App Control bloque go.exe
# et tous les binaires de test non signés produits par `go test`.
# Usage (depuis n'importe où) : ./research/either/run.sh [all|test]
set -euo pipefail

image="golang:1.27.1-bookworm"
here="$(cd "$(dirname "$0")" && pwd -W 2>/dev/null || pwd)"

# MSYS_NO_PATHCONV évite que Git Bash réécrive les chemins /work.
MSYS_NO_PATHCONV=1 docker run --rm -v "$here":/work -w /work "$image" bash /work/measure.sh "${1:-all}"
