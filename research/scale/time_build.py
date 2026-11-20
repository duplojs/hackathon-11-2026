"""Temps de transpilation (médiane de N exécutions du CLI) pour chaque cible."""
import statistics, subprocess, sys, time
root, n, targets = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
for target in targets:
    samples = []
    for _ in range(n):
        start = time.perf_counter()
        done = subprocess.run(["pnpm", "--silent", "run", "build", "--tsconfig", f"{target}/tsconfig.json",
                               "--input", f"{target}/index.ts", "--output", "/tmp/tb-out"], cwd=root,
                              capture_output=True)
        samples.append((time.perf_counter() - start) * 1000)
        if done.returncode != 0:
            print(f"{target}: échec"); break
    else:
        print(f"{target}: médiane {statistics.median(samples):.0f} ms [{min(samples):.0f}..{max(samples):.0f}] (n={n})")
