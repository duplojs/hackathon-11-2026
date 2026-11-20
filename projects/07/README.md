# Projet 07

## Problématique

### Enchaîner des opérations dépendantes

Dans `index.ts`, `DEither.rightPipe` reçoit le résultat de `add`, puis transmet sa valeur à `divide`. Cette seconde opération peut aussi échouer. Comment enchaîner des opérations qui dépendent les unes des autres, en interrompant la suite dès qu’une étape produit un échec et en conservant cet échec dans le résultat final ?

## Solution

Les extraits viennent de `dist/` (préfixes `Sourced_` et chemins de packages raccourcis pour la lecture).

### Enchaîner des opérations dépendantes

```go
var Generated_1 shard_dependencies.Either
Generated_1 = add.add((float64)(1), (float64)(2))
if Generated_1.IsRight() {
	Generated_1 = func(value float64) (shard_dependencies.Either) {
		return divide.divide(value, (float64)(0))
	}(Generated_1.GetValue().(float64))
}
result := Generated_1
```

`DEither.rightPipe(add(1, 2), (value) => divide(value, 0))` est déroulé en **`if` imbriqués** (`transformers/duplojs/either/rightPipe/`). Une seule variable `Either` porte le résultat courant : chaque étape n’est exécutée que si le résultat précédent est `Right`, et reçoit sa valeur convertie vers le type de son paramètre. Dès qu’une étape produit un `Left`, les suivantes ne sont pas exécutées et ce `Left` reste le résultat final, comme dans le runtime DuploJS.

Avec plusieurs étapes, chaque `if` est imbriqué dans le précédent (voir `calculate` au projet 10).

Le `matchInformation` du projet (trois informations, dont `division-by-zero`) suit la traduction du projet 06 : un `switch` sur `GetInformation()`. `DString.to` passé directement comme callback devient la référence `NumberToString`.

## Variations étudiées

- Une étape (ce projet), deux étapes (projet 10, `rightAsyncPipe`).
- `rightPipe` utilisé dans une fonction fléchée passée à `DArray.map` (projet 08).
- **Étape qui renvoie une valeur brute** (`(value) => value * 10`) : en DuploJS, elle est acceptée et le résultat final est enveloppé dans `success`. Testé : le Go généré **ne compile pas** (la valeur brute est affectée à la variable `Either`). Voir Limites.

## Résultats observés

Sortie Go identique octet pour octet à celle de Node (affichée en JSON) : `["-12"]` puis `division par zéro impossible`. L’échec de `divide` interrompt bien la chaîne.

Reproduction :

```sh
pnpm build:07
cd projects/07/dist && go vet ./... && go run .
```

Comparaison avec Node : faire afficher Node en JSON (module préchargé qui remplace `console.info` par `JSON.stringify(v, null, 2)`, voir le README racine), puis `diff` avec la sortie de `go run .`.

## Limites

- Une étape de `rightPipe` qui renvoie une valeur non-Either produit du Go qui ne compile pas. Piste : quand le checker indique que l’étape ne renvoie pas un Either, envelopper sa valeur avec `EitherSuccessOf`.
- Les étapes sont des fonctions anonymes appelées sur place ; leur inlining par Go n’a pas été vérifié.
