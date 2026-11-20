# Projet 02

## Problématique

### Transmettre une fonction pour transformer conditionnellement un résultat

Dans `index.ts`, `DEither.whenIsRight` reçoit le résultat de `add` et la fonction `DArray.coalescing`. Comment traduire un appel qui reçoit une fonction en argument et applique cette fonction uniquement à la valeur d’un résultat `Right`, tout en conservant inchangés les autres cas ?

## Solution

### Exercice 02

**Problèmes étudiés**

- `whenIsRight(result, coalescing)` : appliquer une fonction reçue en argument seulement si le
  résultat est un succès.
- Une fonction passée **comme valeur** (`DArray.coalescing`, sans parenthèses).
- **Problème découvert** en lançant le build : le type de `newResult`. Le code de DuploJS montre
  que `whenIsRight` ne renvoie pas un Either en cas de succès, mais directement le résultat de la
  fonction :

  ```js
  function whenIsRight(input, theFunction) {
  	if (isRight(input)) return theFunction(valueKind.getValue(input));
  	return input;
  }
  ```

  Le checker le confirme : `newResult` est de type `DEither.Fail | readonly [number]`, un Either
  **ou** un tuple. C’est le premier type de l’exercice qui n’est pas un Either.

**Solution**

```go
Generated_6 := Sourced_result
var Generated_7 any
if Generated_6.IsRight {
	Generated_7 = shard_dependencies.Coalescing(Generated_6.Right)
} else {
	Generated_7 = Generated_6
}
Sourced_newResult := Generated_7
```

- **`whenIsRight` en ligne** (décision n°5) : pas de fonction Go `WhenIsRight` ni de fonction
  anonyme. L’entrée est rangée dans une variable, puis un `if / else` reproduit exactement le code de
  DuploJS : succès → résultat de la fonction **tel quel**, sinon → entrée inchangée. La fonction est
  recopiée en ligne avec `inlineCallback`, comme dans `rightPipe` et `matchInformation`.
- **`DArray.coalescing`** : fonction Go générique écrite à la main
  (`duplojs/array/coalescing.go`, décision n°8), `Coalescing[T any](value T) []T`. Le type des
  éléments est déduit de la valeur (`float64` → `[]float64`) : pas de `any`. Comme elle est appelée
  directement (`Coalescing(x)`), Go déduit `T` sans qu’on l’écrive.
- **Le type de `newResult`** : une **exception limitée** à la décision n°6. Une union qui mélange un
  Either et une valeur qui n’en est pas un (`Fail | readonly [number]`) ne correspond à aucun type
  Go précis : elle devient `any` (`type/mixedEitherUnion.ts`). Ce n’est pas un `any` pour faire
  passer le build : c’est le TypeScript lui-même qui mélange deux types sans rapport. Toute autre
  union inconnue reste une erreur. La valeur rangée dans `any` est ensuite affichée par `Print`, qui
  reçoit déjà un `any`.

Alternative étudiée puis écartée : une première version utilisait un Either à valeur `any`, une
fonction Go `WhenIsRight(input any, f func(any) any) any` et des tableaux `[]any`. Elle fonctionnait
(sortie de même valeur), mais mettait `any` partout, n’affichait pas comme Node et a été abandonnée
au profit de l’Either typé de l’équipe.

Benchmark reproductible (`brouillons/benchmark-either`, `go test -bench . -benchmem -count 5`) :
créer l’Either de `add(1, 2)` puis lire sa valeur coûte ~13 ns et **0 allocation** avec la struct
de l’équipe, contre ~26 ns et **1 allocation** (8 octets) quand la valeur est rangée dans un champ
`any`. Environ ×2 sur ce micro-benchmark : l’argument principal est l’allocation évitée et le type
vérifié par le compilateur, pas la vitesse du programme entier (non mesurée).

**Variations envisagées**

- `add` qui renvoie un échec (`fail()` quand `one === 1`) : le `if` n’affiche rien et `newResult`
  reste l’échec. Sortie identique à TS.
- `DArray.coalescing(x)` appelé directement : refusé avec une erreur explicite
  (`array-coalescing-direct-call-not-supported`), absent des exercices.
- `whenIsRight(fonction)` curryfié hors d’un `pipe` : refusé (`either-when-is-right-curried-outside-pipe`),
  il faudrait une fonction anonyme.

**Résultat observé**

Sortie Go identique à la sortie TS : **oui**. Les projets 00 et 01 passent toujours.

```bash
./scripts/compare.sh 02
```

**Limites**

- `newResult` est un `any` : le compilateur Go ne vérifie plus son type, et la valeur est emballée
  (allocation possible).
- *(corrigé après la revue)* En TS, `coalescing` renvoie un tableau tel quel. La première version
  l’enveloppait quand même (`[[1, 1]]` au lieu de `[1, 1]`). Le transformer lit maintenant le type
  de la valeur que `coalescing` va recevoir (type « contextuel » donné par le TypeChecker) et
  choisit `CoalescingArray` (renvoie tel quel) ou `Coalescing` (enveloppe). Testé : sortie identique
  à Node avec `success([n, n])`.
- Le tuple `readonly [number]` devient un slice `[]float64` : la longueur fixe et le `readonly`
  ne sont pas conservés (aucun code ne modifie le tableau).
- `DEither.whenIsRight` passé comme valeur n’est pas géré.

**À vérifier**

- Le coût de l’emballage dans `any` n’a pas été mesuré sur le Go généré, seulement dans le
  micro-benchmark (`brouillons/benchmark-either`).