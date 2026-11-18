# Projet 09

## Problématique

### Regrouper des résultats en une transaction

Dans `index.ts`, plusieurs calculs indépendants produisent chacun un résultat `Either`. `DEither.group` doit les réunir pour former un résultat unique : la transaction ne peut être considérée comme réussie que si tous les calculs réussissent. Comment regrouper ces résultats en conservant les valeurs de réussite et en propageant un échec à l’ensemble de la transaction ?

## Solution

Le calcul de `calculations` reprend les traductions du projet 08 : tuples `[3]float64`, `DArray.map`, déconstruction, `rightPipe` et `DEither.left`. Dans les extraits, `sd` désigne le paquet `shard_dependencies` et `Transaction` le type `sd.Union2[sd.EitherLeft[float64], sd.EitherSuccess[[]float64]]`.

### Regrouper des résultats en une transaction

```go
Sourced_transaction = func() Transaction {
	Generated_15 := make([]float64, 0, len(Generated_13))
	for _, Generated_14 := range Generated_13 {
		if Generated_14.Tag == 0 {
			return Transaction{Tag: 0, V0: Generated_14.V0}
		}
		Generated_15 = append(Generated_15, Generated_14.V1.Value)
	}
	return Transaction{Tag: 1, V1: sd.EitherSuccessOf[[]float64](Generated_15)}
}()
```

- **Sémantique de `group`** : les résultats sont parcourus dans l’ordre. Le premier échec rencontré devient le résultat de la transaction et les éléments suivants ne sont pas examinés, comme dans l’implémentation DuploJS (`reduce` avec `exit`). Si tous réussissent, leurs valeurs sont réunies, dans l’ordre, dans un `Success`.
- **Type de la transaction** : le checker calcule `Left<"division-by-zero", 0> | Left<"negative-operand", number> | Success<number[]>`. Les deux `Left` partagent la représentation `EitherLeft[float64]` : l’union Go a donc deux membres. L’échec garde son information et sa valeur, il est placé tel quel dans l’union de la transaction.
- **Valeurs de réussite** : la slice est allouée une seule fois, avec pour capacité le nombre de résultats (il ne peut pas y avoir plus de valeurs), puis remplie par `append`. Son type (`[]float64`) vient du `Success<number[]>` de la sortie.
- **Classement à la compilation** : chaque membre de l’union d’un élément est classé (échec ou réussite) d’après sa représentation Go. Le test à l’exécution est une comparaison d’étiquette (`Tag == 0`), sans inspection de la valeur.
- **Retour anticipé** : la boucle est placée dans une fonction Go appelée immédiatement. La propagation de l’échec est un simple `return`.

### Traiter les deux issues de la transaction

```go
var Generated_22 sd.Union2[[]string, [1]string]
if Generated_16.Tag == 1 {
	Generated_22 = sd.Union2[[]string, [1]string]{Tag: 0, V0: Generated_21(Generated_16.V1.Value)}
} else {
	Generated_22 = sd.Union2[[]string, [1]string]{Tag: 1, V1: Generated_17()}
}
```

- **`whenIsRightOtherwise` (forme directe)** : une variable du type de sortie, affectée dans un `if` / `else` sur l’étiquette. `theFunction` reçoit la valeur du `Success` (`[]float64`) ; `() => [...]` est appelé sans argument.
- **Sortie** : le checker type `display` comme `readonly (string & Number)[] | ["transaction annulée"]`, c’est-à-dire un tableau de longueur variable ou un tuple d’un élément. Les deux représentations Go diffèrent (`[]string` et `[1]string`) : l’union étiquetée les conserve toutes les deux, et chaque branche place son résultat dans son membre.
- **`DArray.map(values, DString.to)`** : `DString.to` est passé en valeur. Go ne manipule pas une fonction générique sans l’instancier : le type attendu à cet endroit (`(value: number) => string`) produit une fonction littérale `func(value float64) string`.
- **Affichage** : `print` choisit à la compilation `InspectUnion2(InspectSlice(InspectString), …)`. Le tuple `[1]string` est affiché comme un tableau, vu comme une slice (`value[:]`), sans copie.

## Résultats

La sortie du programme Go généré est identique, octet par octet, à celle de `tsx projects/09/index.ts` :

```
[ 'transaction annulée' ]
```

Le Go a été validé avec `go vet` et `go run`. Des variantes absentes de l’exemple ont été vérifiées de la même manière :

- transaction réussie, avec l’affichage `[ '3', '3', '0.07500000000000001' ]` et celui du `Success` contenant `[ 3, 3, 0.07500000000000001 ]` ;
- transaction dont l’échec est `negative-operand` ;
- ternaire sur des chaînes (`1 > 2 ? "oui" : "non"`) ;
- `||` dont l’opérande droit contient un appel.

Les projets 00, 01 et 08 donnent toujours une sortie identique. `tsc -p tsconfig.app.json` et le lint passent.

Reproduction (Linux, macOS ou Windows) :

```bash
pnpm build --tsconfig projects/09/tsconfig.json --input projects/09/index.ts --output projects/09/dist
cd projects/09/dist && go run .
```

## Limites

- `group` ne traduit qu’un tableau. La forme objet (`group({ a, b })`) demanderait une struct Go par forme d’objet. Les getters (`() => either`) et un tuple d’`Either` ne sont pas traduits.
- Les éléments du groupe doivent avoir une seule représentation de `Right`.
- Correction annexe : `print` d’une union de chaînes littérales (`"oui" | "non"`) affichait des guillemets. Le test porte désormais sur la représentation Go (`string`), et la chaîne est affichée telle quelle, comme dans Node.
- Les limites du projet 08 s’appliquent aussi, puisque 09 en reprend les traductions.
