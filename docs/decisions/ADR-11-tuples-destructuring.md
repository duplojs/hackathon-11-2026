# ADR-11 : tuples homogènes et déstructuration

- **Statut :** accepté (Sprint 4)
- **Portée :** exercice 08
- **Prototype et mesures :** [`research/tuples/`](../../research/tuples/)

## Contexte

L'exercice 08 traite des entrées `[number, number, number]` et utilise
`([one, two, divisor]) => …`. Go n'a pas de paramètres déstructurés. Il faut
préserver la cardinalité, les positions et l'évaluation unique de la source.

## Options

| Option | Représentation | Conséquence |
|---|---|---|
| A | `[]T` | Réutilise la représentation des tuples homogènes et tableaux ; cardinalité garantie par le type source et les indices constants. |
| B | `[N]T` | Cardinalité portée par Go ; demande des conversions `t[:]` dans les unions et une temporaire pour les littéraux non adressables. |
| C | `struct { F0, F1, F2 T }` | Accès explicite, mais nécessite de générer un type par forme de tuple. |

## Décision

Option A : les tuples homogènes restent des `[]T`, en continuité avec l'ADR-2.
`bindArrayPattern` reçoit une source déjà évaluée, émet des liaisons par indice
constant et ne déclare pas les noms dont le symbole n'est jamais lu. La fonction
fléchée reçoit un paramètre Go généré du type du tuple ; les liaisons commencent
le corps. `const [a, b] = expr` lie d'abord `expr` une seule fois, puis lit ses
positions. Au niveau fichier, les noms utilisés deviennent des variables de
package selon le mécanisme des déclarations existant.

Les éléments omis, `...rest`, valeurs par défaut, motifs imbriqués, tableaux
hétérogènes et sources qui ne sont pas des slices sont refusés explicitement.

## Mesure de `[3]T` contre `[]T`

**[observé]** Benchmark `research/tuples`, Go 1.24.4, Windows 11 amd64,
Intel Core i7-9750H, 12 processeurs logiques. Cinq passes :

| Représentation | ns/op médian [min..max] | B/op | allocs/op |
|---|---:|---:|---:|
| `[][]float64` | 23 152 [22 678..26 724] | 24 000 | 1 000 |
| `[][3]float64` | 4 372 [4 279..4 918] | 0 | 0 |

Le benchmark construit et parcourt les 1000 triplets, lit les trois indices et
calcule `(one + two) / divisor`. Dans cet essai, `[3]float64` est environ 5,3×
plus rapide par médiane et évite les 1000 allocations des slices internes.
C'est une micro-mesure locale ; elle ne remplace pas une mesure de bout en bout.
La décision A est conservée pour le Sprint 4 afin de rester cohérent avec les
tableaux/tuples homogènes déjà traduits. Le résultat documente toutefois un axe
à réévaluer si l'interopérabilité Go devient prioritaire.

## Go produit et limites

**[observé]** `projects/08/dist/index.ts/index.ts.go` représente `inputs` en
`[][]float64`. Pour le paramètre `Generated_14 []float64`, le corps lit
`Generated_14[0]`, `[1]` et `[2]`. Le benchmark et l'analyse d'échappement sont
reproductibles depuis `research/tuples`.

La cardinalité des slices n'est pas vérifiée à l'exécution ; le contrat repose
sur le type TypeScript. Les tuples hétérogènes demanderaient une représentation
distincte et restent refusés.
