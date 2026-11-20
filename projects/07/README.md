# Projet 07

## Problématique

### Enchaîner des opérations dépendantes

Dans `index.ts`, `DEither.rightPipe` reçoit le résultat de `add`, puis transmet sa valeur à `divide`. Cette seconde opération peut aussi échouer. Comment enchaîner des opérations qui dépendent les unes des autres, en interrompant la suite dès qu’une étape produit un échec et en conservant cet échec dans le résultat final ?

## Solution

Dans les extraits, `sd` désigne le paquet `shard_dependencies` et `Result` le type `sd.Union2[sd.EitherLeft[float64], sd.EitherSuccess[float64]]`.

### Enchaîner des opérations dépendantes

```go
callback1 := func(Sourced_value float64) Result {
	return divide(Sourced_value, 0)
}
Sourced_result = func() Result {
	if addResult1.Tag == 0 {
		return addResult1
	}
	stepResult1 := callback1(addResult1.V1.Value)
	return stepResult1
}()
```

- **Ordre d’évaluation** : comme en JavaScript, le résultat de `add(1, 2)` et la fonction `(value) => divide(value, 0)` sont évalués avant l’exécution du pipe et stockés dans des variables temporaires.
- **Interruption au premier échec** : le pipe devient une fonction Go appelée immédiatement. Un échec est un `return` anticipé : les étapes suivantes ne sont pas exécutées et l’échec est le résultat final, sans imbrication de branches.
- **Valeur transmise** : l’étape suivante reçoit la valeur du `Right` (`V1.Value`), pas le `Success` entier. Une étape qui retourne une valeur simple est enveloppée dans un `Success`, comme le fait `rightPipe`.
- **Échec conservé** : `add` retourne `Left<"negative-operand", number> | Success<number>` et `divide` `Left<"division-by-zero", 0> | Success<number>`. Les deux `Left` ont la même représentation Go (`EitherLeft[float64]`), l’information étant une valeur à l’exécution. L’union du résultat a donc deux membres, et l’échec garde son information (`division-by-zero`) et sa valeur.
- **Classement à la compilation** : chaque variante est classée (échec, réussite) d’après sa représentation Go, elle-même dérivée du type TypeScript. À l’exécution il ne reste qu’une comparaison d’étiquette (`Tag == 0`), sans `any` ni réflexion.
- Ici, `add` produit un succès `3`, puis `divide` reçoit ce `3` et le diviseur `0` : le résultat conservé est l’échec `division-by-zero`. Le `print` protégé par `isRight` n’affiche donc rien.

### Traiter l’échec selon son information

```go
var matchResult1 string
if result2.Tag == 0 {
	if result2.V0.Information == "negative-operand" {
		matchResult1 = callback3()
	}
	if result2.V0.Information == "division-by-zero" {
		matchResult1 = callback4()
	}
}
if result2.Tag == 1 {
	matchResult1 = to2(result2.V1.Value)
}
```

- **`DEither.matchInformation`** : l’étiquette choisit le membre de l’union. Deux `Left` partagent le même membre : l’information (une chaîne) les départage à l’exécution. Un membre qui n’a qu’une information possible (`success`) n’a pas de test.
- **Informations connues à la compilation** : l’information de chaque variante est lue dans son type (`Left<"division-by-zero", 0>` → `"division-by-zero"`, `Success` → `"success"`). Seuls les traitements qui peuvent s’appliquer à un membre y sont générés.
- **Traitements** : chaque traitement reçoit la valeur du résultat s’il déclare un paramètre (`DString.to`), sinon il est appelé sans argument.

### Transformer le résultat dans un `pipe`

- **`whenIsRightOtherwise` curryfié** : une fonction littérale Go qui applique `DArray.coalescing` à la valeur d’un succès, ou `() => [-12]` sinon. Les deux branches produisent un tuple `[1]float64`.
- **`DArray.coalescing`** : le choix (garder un tableau ou envelopper la valeur) est fait à la compilation selon le type de la valeur. Passé en valeur, il est instancié selon le type attendu à cet endroit.
- **`DArray.map(DString.to)` sur un tuple** : le tuple Go `[1]float64` est parcouru comme une slice (`array[:]`), sans copie. Le checker type le résultat `readonly (string & Number)[] & LengthEqual<1>` : `Number` et `LengthEqual<1>` sont des contraintes DuploJS qui n’existent qu’à la compilation. Le résultat est donc un `[]string`.
- **Types fonction** : `(value: A) => B` devient `func(A) B`, ce qui permet de ranger une fonction dans une variable typée.

## Résultats

La sortie du programme Go généré est identique, octet par octet, à celle de `tsx projects/07/index.ts` :

```
[ '-12' ]
division par zéro impossible
```

Le Go a été validé avec `go vet` et `go run`. Des variantes absentes de l’exemple ont été vérifiées de la même manière :

- `matchInformation` sur une réussite et sur l’échec `negative-operand` ;
- `matchInformation` curryfié passé à `DArray.map` sur un tableau de résultats (`[ '4', 'négatif', 'division par zéro impossible' ]`) ;
- traitement utilisant la valeur de l’échec (`(value) => value * 10`) ;
- fonction rangée dans une variable typée.

Les projets 00, 01, 02, 08 et 09 donnent toujours une sortie identique. `tsc -p tsconfig.app.json` et le lint passent.

Reproduction :

```bash
pnpm build:07
cd projects/07/dist && go run .
```

## Limites

- `matchInformation` curryfié rangé seul dans une variable n’est pas traduit : TypeScript type alors son entrée `unknown`, sans représentation Go possible. Il est traduit lorsqu’il est utilisé directement (dans un `pipe`, un `map`…).
- Une fonction générique passée en valeur à l’intérieur d’un `matchInformation` curryfié (`success: DString.to` dans un `map`) n’est pas traduite : écrire `(value) => DString.to(value)`.
- `matchInformation` n’accepte qu’un objet littéral dont les clés sont des noms ou des chaînes.
