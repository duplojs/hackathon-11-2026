# Passage à l'échelle du transpileur

Mesure du temps de transpilation sur un projet synthétique plus gros que les
exercices (ADR-13, T1 et T2).

```bash
python3 research/scale/generate.py /tmp/large 60           # 60 modules + index.ts (≈ 2 000 lignes)
cp -r /tmp/large variations/zz-large                      # tsconfig hérité du dépôt
./scripts/check.sh variations/zz-large                    # vérifie TS = Go avant de mesurer
python3 research/scale/time_build.py . 3 variations/zz-large
rm -rf variations/zz-large
```

Chaque module contient une fonction à deux erreurs de types différents
(`number` et `string`), une union `string | number` rétrécie par `typeof`, un
`rightPipe` et un `matchInformation`. Le projet n'a pas de cycle d'imports.

## Résultats [observé]

Apple M4 (10 cœurs), macOS 15.6.1, Node v22.19.0, go1.27.4, **18/11/2026**,
branche `sprint7/scale`. Temps d'un appel complet du CLI (démarrage de tsgo
compris), médiane de 3 exécutions.

| Cible | Lignes TS | Avant T1/T2 | Après T1/T2 |
|---|---:|---:|---:|
| `projects/09` | 52 | 552 ms | 521 ms |
| projet synthétique, 60 modules | 1 982 | 3 474 ms [3 448..3 630] | 2 695 ms [2 676..2 714] |

Le projet synthétique passe `check.sh` de bout en bout (sortie Go identique à
`tsx`). Le temps restant est surtout fait d'appels au checker (IPC vers tsgo) ;
la transpilation des fichiers en parallèle (T3) n'est pas faite, car elle
rendrait la numérotation des `Generated_N` non déterministe.
