#!/usr/bin/env bash
# Usage : ./scripts/bench-run.sh 05 [lancements]
# Compare le temps d'un lancement complet : le TS d'origine (bundlé en JS, lancé par Node)
# contre le binaire Go produit par le transpileur. Mesure aussi la mémoire max (Mo).
# Attention : ces programmes sont minuscules, donc on mesure surtout le DÉMARRAGE
# (lancer V8 contre lancer un binaire), pas la vitesse de calcul.
set -euo pipefail
n="$1"
runs="${2:-30}"
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
work="$(mktemp -d)"

# 1. Le TS en un seul fichier JS (esbuild est fourni par tsx), pour ne pas mesurer la compilation TS.
esbuild="$(ls -d node_modules/.pnpm/esbuild@*/node_modules/esbuild/bin/esbuild | head -1)"
"$esbuild" "projects/$n/index.ts" --bundle --platform=node --format=esm \
	--outfile="$work/index.mjs" --log-level=error --tsconfig="projects/$n/tsconfig.json"

# 2. Le Go transpilé, compilé en binaire.
pnpm run --silent "build:$n" > /dev/null
(cd "projects/$n/dist" && go build -o "$work/app" .)

# 3. Mêmes sorties ?
diff <(node "$work/index.mjs") <("$work/app") > /dev/null && echo "Sorties identiques"

# 4. Médiane du temps et mémoire max, sur $runs lancements.
python3 - "$runs" "$work" <<'PY'
import resource, subprocess, sys, time
runs, work = int(sys.argv[1]), sys.argv[2]
for name, cmd in [("Node", ["node", f"{work}/index.mjs"]), ("Go", [f"{work}/app"])]:
    times = []
    for _ in range(runs):
        start = time.perf_counter()
        subprocess.run(cmd, stdout=subprocess.DEVNULL, check=True)
        times.append(time.perf_counter() - start)
    memory = subprocess.run(
        [sys.executable, "-c",
         "import resource,subprocess,sys;subprocess.run(sys.argv[1:],stdout=subprocess.DEVNULL);"
         "print(resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss//1024)", *cmd],
        capture_output=True, text=True).stdout.strip()
    print(f"{name:5} {sorted(times)[len(times)//2]*1000:6.1f} ms (médiane)   {memory} Mo de mémoire max")
PY
