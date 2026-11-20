# 05 — Les fonctions passées en argument

**Exercices concernés** : 02 (`whenIsRight`), 03 (forme curryfiée), 05 à 07
(`whenIsRightOtherwise`, `DArray.map`, `matchInformation`). **État** : traité.

## La problématique

DuploJS est un style fonctionnel : on passe des fonctions à d'autres fonctions.

```ts
DEither.whenIsRight(result, DArray.coalescing);
DEither.whenIsRightOtherwise(DArray.coalescing, () => [-12]);   // forme curryfiée, dans un pipe
DArray.map(DString.to);
DEither.matchInformation(result, { "negative-operand": () => "…", success: DString.to });
```

Go sait passer des fonctions (closures). Faut-il reproduire ce style, ou générer autre chose ?

## Stratégie de l'équipe : recopier la fonction en ligne (décision n°5)

Le transpileur connaît la fonction passée au moment de traduire : il recopie son corps **à
l'endroit de l'appel**. Son paramètre devient une variable. Une fonction passée par son nom
devient un appel direct. Une closure Go n'est autorisée qu'en solution de repli, justifiée.

```go
// whenIsRightOtherwise(coalescing, () => [-12]), étape d'un pipe
var Generated_8 []float64
if Generated_7.IsRight {
	Generated_8 = shard_dependencies.Coalescing(Generated_7.Right)
} else {
	Generated_9 := (float64)(12)
	Generated_10 := -(Generated_9)
	Generated_8 = ([]float64{Generated_10})   // le callback () => [-12], recopié en ligne
}

// map(DString.to) : une boucle
var Generated_12 []string
for _, Generated_13 := range Generated_11 {
	Generated_12 = append(Generated_12, shard_dependencies.StringTo(Generated_13))
}

// matchInformation : un switch sur Information. Le type TS dit si le paramètre lit .Left ou .Right
switch Generated_20.Information {
	case "negative-operand":
		Sourced_operand := Generated_20.Left
		…
	case "success":
		Sourced_value := Generated_20.Right
		…
}
```

- Un seul helper pour toutes les fonctions DuploJS : `common/inlineCallback.ts`
  (`(x) => corps` → `x := argument`, `_ = x`, puis le corps ; une fonction nommée → `f(argument)`).
- Les formes curryfiées (`whenIsRight(f)`, `whenIsRightOtherwise(f, g)`, `map(f)`) sont reconnues
  comme étapes d'un `pipe` (problématique 06).
- `whenIsRightOtherwise` réutilise le cœur de `whenIsRight` (`applyWhenIsRight`) avec un paramètre
  optionnel `otherwise`.

## Résultat

- `./scripts/compare.sh 02`, `03`, `05`, `06`, `07` : sorties identiques.
- `./scripts/compare-variation.sh 02` à `07` : sorties identiques.
- `exemples/en-ligne` : la stratégie écrite à la main donne la même sortie que la référence TS.

## Limites

- Fonctions acceptées : `() => valeur`, `(x) => valeur`, ou une fonction passée par son nom (une
  seule signature, au plus un paramètre). Refusées avec une erreur : corps avec un bloc
  `{ return … }` (`callback-not-supported-yet`), plusieurs paramètres, paramètre déstructuré
  (`callback-parameter-not-supported`).
- Formes curryfiées **hors d'un pipe** : refusées (`either-when-is-right-curried-outside-pipe`,
  `array-map-curried-outside-pipe`), il faudrait une fonction anonyme.
- `map` ne donne que l'élément au callback. DuploJS donne aussi `{ index, self }`.
- `DArray.coalescing(x)` appelé directement : refusé (`array-coalescing-direct-call-not-supported`).

Voir aussi : [HISTORIQUE.md](HISTORIQUE.md).
