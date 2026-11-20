# 07 · Collections : tableaux, tuples et `map`

**Projets concernés** : 02, 05, 08, 09, 10.

## Problématique

TypeScript distingue des formes de collections que Go représente différemment :

- `number[]` / `readonly number[]` : longueur variable ;
- `[number, number, number]` : **tuple**, de longueur fixe, où la **position** porte le sens ;
- les types DuploJS comme `LengthEqual<1>` : contraintes de longueur qui n'existent qu'à la compilation.

Il faut choisir une représentation Go qui conserve **cardinalité et position**, puis traduire `DArray.map` (ordre et longueur conservés) et `DArray.coalescing` sans perdre en performance.

## Stratégie retenue

| TypeScript | Go | Pourquoi |
|---|---|---|
| `T[]`, `readonly T[]` | `[]T` | longueur variable. `readonly` est une contrainte de compilation seulement |
| `[T, T, T]` | `[3]T` | la longueur fait partie du type, donc vérifiée par le compilateur Go |
| `string & Number`, `LengthEqual<1>` | représentation de la primitive | marqueurs de type uniquement |
| `DArray.map` | `ArrayMap[T, U]` générique | une allocation, à la bonne longueur |
| `map` sur un tuple | `tuple[:]` | vue sans copie |
| `DArray.coalescing` | choix **à la compilation** selon le type | aucun test à l'exécution |

## Exemple et mesures

```bash
pnpm exec tsx problematiques/analyse-detaillee/07-collections-tuples-et-tableaux/exemples/exemple.ts
cd problematiques/analyse-detaillee && go run ./07-collections-tuples-et-tableaux/exemples
go test -bench . -benchmem ./07-collections-tuples-et-tableaux/exemples
```

Sur 1 000 tuples de 3 nombres (création + parcours) :

| | `[][3]float64` (retenu) | `[][]float64` | Écart |
|---|---|---|---|
| Temps | **~6,2 µs** | ~38 µs | **≈ 6×** |
| Allocations | **1** | 1 001 | |

`map` sur 1 000 éléments : allocation unique **~2,4 µs / 2 allocations**, contre ~6,3 µs / 13 allocations avec des `append` successifs (≈ 2,5×).

Voir [HISTORIQUE.md](HISTORIQUE.md).
