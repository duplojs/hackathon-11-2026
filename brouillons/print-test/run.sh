#!/usr/bin/env bash
# Compare le Print Go réellement généré (projects/01/dist) avec console.log de Node.
# Usage : ./brouillons/print-test/run.sh   (depuis la racine du dépôt, après pnpm build:01)
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$root"
ts_out="$(pnpm exec tsx brouillons/print-test/reference.ts)"
go_out="$(cd projects/01/dist && go run "$root/brouillons/print-test/go/main.go")"
if diff <(printf '%s\n' "$ts_out") <(printf '%s\n' "$go_out"); then
	echo "PRINT OK : $(printf '%s\n' "$ts_out" | wc -l) lignes identiques à Node"
else
	echo "PRINT : différences ci-dessus (< Node   > Go)"
	exit 1
fi
