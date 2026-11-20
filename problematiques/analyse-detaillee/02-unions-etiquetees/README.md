# 02 · Unions TypeScript et unions étiquetées Go

**Projets concernés** : 01, 04. Utilisé ensuite partout où apparaît un `Either`.

## Problématique

`add` retourne `DEither.Fail | DEither.Success<number>` : une valeur qui peut prendre **plusieurs formes**, chacune avec son propre type. Go n'a pas de type union. Il faut :

- représenter une union **sans perdre le type de chaque membre** (pas de `any`) ;
- placer la bonne valeur dans l'union à chaque `return`, même quand le type de retour est **inféré** (projet 04) ;
- traduire les gardes de type (`DEither.isRight`) et le **rétrécissement** qui en découle.

## Stratégie retenue

```go
type Union2[T0 any, T1 any] struct {
	Tag uint8 // membre actif
	V0  T0
	V1  T1
}
```

1. **Union étiquetée générique `UnionN`** : une valeur (pas un pointeur), sans allocation, testée par une comparaison d'entier.
2. **Ordre canonique** : membres dédoublonnés par représentation Go puis triés. `A | B` et `B | A` donnent le même type Go. `true | false` se réduit à `bool`.
3. **`placeValue`** : à chaque `return` ou initialisation typée, le transpileur compare le type de la valeur au type attendu et choisit le membre (`Tag: 1, V1: …`).
4. **Gardes de type résolues à la compilation** : chaque membre est classé par le checker (`isTypeAssignableTo`). `isRight(x)` devient `x.Tag == 1` et le rétrécissement devient une lecture directe de `x.V1`.

## Exemple et mesure

```bash
pnpm exec tsx problematiques/analyse-detaillee/02-unions-etiquetees/exemples/exemple.ts
cd problematiques/analyse-detaillee && go run ./02-unions-etiquetees/exemples
go test -bench . -benchmem ./02-unions-etiquetees/exemples
```

Comparaison avec la piste écartée (interface Go + switch de type, [`alternative_interface.go`](exemples/alternative_interface.go)), sur 1 024 résultats (i7-1165G7, Go 1.27) :

| | Union étiquetée | Interface | Écart |
|---|---|---|---|
| Produire et stocker | ~1,2 µs, **0 allocation** | ~9,6 µs, **1 024 allocations** (8 Ko) | **≈ 8× plus rapide** |
| Lire le membre actif | ~2,0 µs | ~2,0 µs | équivalent |

Le gain se joue à la **création** des résultats, pas à leur lecture. Pour un transpileur qui produit un `Either` à chaque calcul, c'est le cas dominant.

Voir [HISTORIQUE.md](HISTORIQUE.md).
