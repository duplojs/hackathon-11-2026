Machine : Apple M4 , macOS 15.6.1· go1.27.4 darwin/arm64 · Node v22.19.0 · boucle Python (hyperfine absent) · 30 exécutions par mesure · 2026-11-18

| Ex. | Node + tsx (ms) | Node, JS compilé (ms) | Go, binaire (ms) | RSS max Node (Mo) | RSS max Go (Mo) | « escapes to heap » (code utilisateur) | Remarque |
|---|---:|---:|---:|---:|---:|---:|---|
| 01 | 138.1 [134.6..213.5] | 17.2 [16.6..23.9] | 2.0 [1.9..2.5] | 37 | 3 | 0 | |
| 05 | 153.4 [151.6..158.6] | 17.1 [16.6..17.9] | 2.0 [1.9..2.1] | 37 | 3 | 6 | |
| 09 | 155.3 [152.8..225.5] | 17.9 [17.3..18.7] | 2.0 [2.0..2.9] | 37 | 3 | 11 | |
| 10 | 156.5 [154.3..177.0] | 17.6 [17.0..18.8] | 2.0 [1.9..2.3] | 37 | 3 | 10 | |

Temps : médiane [min..max] d'un processus complet (démarrage compris).
