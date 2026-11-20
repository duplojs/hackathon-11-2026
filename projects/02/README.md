# Projet 02

## Problématique

### Transmettre une fonction pour transformer conditionnellement un résultat

Dans `index.ts`, `DEither.whenIsRight` reçoit le résultat de `add` et la fonction `DArray.coalescing`. Comment traduire un appel qui reçoit une fonction en argument et applique cette fonction uniquement à la valeur d’un résultat `Right`, tout en conservant inchangés les autres cas ?

## Solution

### Transmettre une fonction pour transformer conditionnellement un résultat

Dans les extraits, `sd` désigne le paquet `shard_dependencies`.

```go
result1 := Sourced_result
coalescing1 := func(value1 float64) [1]float64 {
	return [1]float64{value1}
}
var whenIsRightResult1 sd.Union2[[1]float64, sd.EitherFail]
if result1.Tag == 1 {
	whenIsRightResult1 = sd.Union2[[1]float64, sd.EitherFail]{Tag: 0, V0: coalescing1(result1.V1.Value)}
} else {
	whenIsRightResult1 = sd.Union2[[1]float64, sd.EitherFail]{Tag: 1, V1: result1.V0}
}
Sourced_newResult = whenIsRightResult1
```

- **Ordre d’évaluation** : le résultat et la fonction sont d’abord évalués dans leur ordre d’apparition et stockés dans des variables temporaires. La fonction n’est appelée qu’ensuite, et seulement si elle est nécessaire.
- **Application au seul `Right`** : `result` est l’union étiquetée du projet 01 (`Success<number> | Fail`). Chaque variante est classée à la compilation ; à l’exécution, le choix se réduit à un test d’étiquette (`Tag == 1`). La fonction reçoit la valeur du `Success` (`V1.Value`), pas le `Success` entier, comme `DEither.whenIsRight`.
- **Autres cas inchangés** : une variante qui n’est pas un `Right` (ici le `Fail`) est renvoyée telle quelle, placée dans son membre de l’union de sortie. Avec plusieurs variantes non `Right`, une chaîne `if / else if / else` les renvoie chacune dans leur membre.
- **Type du résultat** : le checker type `newResult` comme `Fail | readonly [number]`. L’union Go garde ces deux représentations (`EitherFail` et `[1]float64`), sans `any` ni conversion de type à l’exécution.
- **Fonction transmise comme valeur** : `DArray.coalescing` est générique et Go ne manipule pas une fonction générique sans l’instancier. Le type attendu à cet endroit (`(value: number) => readonly [number]`) produit une fonction littérale Go typée, transmise comme valeur et non appelée tout de suite.
- **`coalescing`** : un tableau est gardé tel quel, une autre valeur est placée dans un tableau d’un élément. Le choix dépend du type de la valeur, connu à la compilation : aucun test à l’exécution. Le résultat `readonly [number]` est un tuple, donc un tableau Go `[1]float64` (voir le projet 08).
- **Forme curryfiée** : `DEither.whenIsRight(fn)`, utilisable dans un `pipe`, devient une fonction littérale Go qui capture `fn` et applique le même aiguillage.
- **Affichage** : `print` choisit à la compilation `InspectUnion2(…, InspectEitherFail)`. Le tuple est affiché comme un tableau Node (`[ 3 ]`).

## Résultats

La sortie du programme Go généré est identique, octet par octet, à celle de `tsx projects/02/index.ts` :

```
{
  '@duplojs/lang/kind/@DuplojsLangEither/right': null,
  '@duplojs/lang/kind/@DuplojsLangEither/information': 'success',
  '@duplojs/lang/kind/@DuplojsLangEither/value': 3,
  '@duplojs/lang/kind/@DuplojsLangEither/success': null
}
[ 3 ]
```

Le Go a été validé avec `go vet` et `go run`. Des variantes absentes de l’exemple ont été vérifiées de la même manière :

- `whenIsRight` sur un échec (`division-by-zero`), renvoyé inchangé ;
- forme curryfiée dans un `pipe` ;
- `coalescing` appelé sur un tableau (`[ 3, 3 ]`, gardé tel quel) ;
- callback écrit sur place (`(value) => value + 1`).

Reproduction :

```bash
pnpm build:02
cd projects/02/dist && go run .
```

## Limites

- `whenIsRight` demande une seule représentation Go du `Right` dans l’entrée.
- `coalescing` d’une valeur dont le type est une union mêlant tableau et non-tableau n’est pas traduit : le choix est fait à la compilation.
