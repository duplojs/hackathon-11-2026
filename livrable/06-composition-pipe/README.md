# 06 — Composer des étapes : `pipe` et `rightPipe`

**Exercices concernés** : 03 à 07 (`DCommon.pipe`), 07 (`DEither.rightPipe`). **État** : traité.

## La problématique

```ts
DCommon.pipe(result, DEither.whenIsRightOtherwise(DArray.coalescing, () => [-12]), DArray.map(DString.to));
DEither.rightPipe(add(1, 2), (value) => divide(value, 0));
```

Dans DuploJS, ces deux fonctions sont des **boucles sur une liste de fonctions**
(`for (const pipe of pipes) acc = pipe(acc)`). `rightPipe` s'arrête en plus à la première étape qui
renvoie un échec, et garde cet échec.

## Stratégie de l'équipe : dérouler la chaîne

Le nombre d'étapes est connu à la traduction : le transpileur écrit les étapes **l'une après
l'autre**, sans fonction Go `Pipe` ni liste de fonctions construite à l'exécution (décision n°5).

```go
// rightPipe(add(1, 2), (value) => divide(value, 0)) : un accumulateur, un if par étape
Generated_6 := Generated_3(Generated_4, Generated_5)    // add(1, 2) : l'Either d'entrée
if Generated_6.IsRight {
	Sourced_value := Generated_6.Right
	_ = Sourced_value
	…
	Generated_6 = Generated_7(Generated_8, Generated_9)  // divide(value, 0)
}
Sourced_result := Generated_6
```

- **`pipe`** (`duplojs/common/pipe.ts`) : une variable par étape, déclarée avec le type donné par
  le checker TS. Les étapes curryfiées (`whenIsRight(f)`, `whenIsRightOtherwise(f, g)`, `map(f)`)
  sont recopiées en ligne (problématique 05).
- **`rightPipe`** (`either/rightPipe`) : une variable « accumulateur » et **un `if` par étape**. Dès
  qu'une étape échoue, les `if` suivants sont sautés et l'échec est gardé, comme en TS.

## Résultat

- `./scripts/compare.sh 03` à `07` : sorties identiques.
- `brouillons/variations-07` (18 lignes identiques à TS) : `add` réussit puis `divide` échoue ;
  `add` échoue (l'étape `divide` n'est pas exécutée) ; tout réussit (`(4 + 5) / 3`).
- `exemples/deroule` : la stratégie écrite à la main donne la même sortie que la référence TS
  (19 lignes).

## Limites

- `rightPipe` : l'entrée, chaque étape et le résultat doivent avoir **le même type Go**, sinon le
  build s'arrête (`either-right-pipe-types-differ`). C'est le cas dans les exercices 07, 08 et 10
  (vérifié avec le checker, `brouillons/explore-vars.ts`). Une étape qui renvoie une valeur brute
  (que TS emballe dans `success()`) est refusée.
- Une étape écrite avec un bloc `{ return … }` est refusée (`callback-not-supported-yet`).
- `DCommon.pipe` et `rightPipe` passés comme valeurs ne sont pas gérés.

Voir aussi : [HISTORIQUE.md](HISTORIQUE.md).
