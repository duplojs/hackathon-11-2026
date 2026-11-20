#!/usr/bin/env bash
# Mesures de l'ADR-1. S'exécute DANS le conteneur Go (voir run.sh).
set -euo pipefail
mode="${1:-all}"

echo "## go version"; go version
echo "## cpu"; grep -m1 "model name" /proc/cpuinfo; echo "cpus: $(nproc)"
echo "## vet"; go vet ./...
echo "## tests de comportement (sortie identique à tsx) et tailles"
go test -count 1 -v -run 'TestBehaviour|TestSizes|TestUniform' ./...

if [ "$mode" = "all" ]; then
	echo "## benchmarks"
	go test -run '^$' -bench . -benchmem -count 5 ./a ./aprime ./b ./c
	echo "## escape analysis"
	go build -gcflags='-m' ./a ./aprime ./b ./c 2>&1 | grep -E 'escapes to heap|moved to heap' | grep -v '_test.go' | sort -u
fi
