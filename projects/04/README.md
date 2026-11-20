# Projet 04

## Problématique

### Représenter plusieurs chemins de retour

Dans `add.ts`, la fonction peut retourner un échec lorsque `one` vaut `-1`, ou poursuivre le calcul et retourner un succès. Comment traduire une fonction dont le résultat dépend d’une condition et qui peut se terminer par plusieurs chemins de retour ?

## Notre étude

### Exercice 04

**Problèmes étudiés**

1. Construire `DEither.fail()` avec le bon type Go.
2. Une fonction sans type de retour écrit, avec deux `return` de variantes différentes.
3. Traduire `-1` (moins unaire) sans changer la valeur, y compris pour `-0`.

**Solution**

Go généré pour `add.ts` (`brouillons/variations-04`, voir « Résultat observé ») :

```go
func Sourced_add(Sourced_one float64, Sourced_two float64) (shard_dependencies.Either[shard_dependencies.JSUndefined, float64]) {
	Generated_19 := Sourced_one
	Generated_20 := (float64)(1)
	Generated_21 := -(Generated_20)
	if Generated_19 == Generated_21 {
		Generated_24 := shard_dependencies.EitherFailOf[shard_dependencies.JSUndefined, float64]
		return Generated_24()
	}
	// return DEither.success(one + two) : identique à l'exercice 01
}
```

- **Type de retour** : rien de nouveau à écrire. Le checker TS déduit `Fail | Success<number>` des
  deux `return`, et ce type devient `Either[JSUndefined, float64]`, comme dans l'exercice 01.
- **`fail()`** : même recette que `success()`. Une fonction Go générique écrite à la main
  (`either/fail/fail.go`), instanciée avec `[L, R]` lus dans le type attendu. `Left` n'est pas
  rempli : sa valeur zéro `JSUndefined{}` s'affiche `undefined`, comme en TS.
- **Un seul handler pour tous les constructeurs** (`either/constructor`) : `success` et `fail` ne
  diffèrent que par le nom de la fonction Go. Ajouter un constructeur (`left` à l'exercice 06) =
  une fonction Go + une entrée dans le routeur `either/index.ts`.
- **`-1`** (`expression/prefixUnary.ts`) : la valeur est d'abord rangée dans une variable, puis
  le moins est appliqué à la variable. En Go, une constante n'a pas de zéro négatif :
  `(float64)(-0)` vaut `+0` alors que `-0` vaut `-0` en JS. Sur une variable, le calcul se fait à
  l'exécution, en `float64`, comme en JS (même piège que `0.1 + 0.2` dans l'exercice 01).

**Variations envisagées** (`brouillons/variations-04`)

- Chemin échec `add(-1, 2)`, chemin succès `add(1, 2)` avec `isRight`, et `add(-0, -0)` qui doit
  afficher `-0` : sortie identique à TS (18 lignes).
- `brouillons/04` : le Go écrit à la main avant les transformers, même sortie.

**Résultat observé**

- Partie Either (`add.ts`) : sortie Go identique à la sortie TS, **oui**.
- Exercice complet (`./scripts/compare.sh 04`) : **pas encore**. `index.ts` utilise `DCommon.pipe`
  et `DEither.whenIsRight` (exercices 02-03, autre chantier) ; le build s'arrête avec l'erreur
  explicite `common-function-not-supported-yet`.

```bash
pnpm build --tsconfig brouillons/variations-04/tsconfig.json --input brouillons/variations-04/index.ts --output /tmp/v04
cd /tmp/v04 && go run . | diff - ~/Desktop/hackaton/brouillons/variations-04/attendu.txt
```

**Limites**

- Seul le moins unaire est géré. `!x`, `+x`, `++x` s'arrêtent sur l'erreur « aucun transformer ».
- Un constructeur passé comme valeur (`DCommon.pipe(x, DEither.success)`) est refusé
  (`either-constructor-used-as-value`).

**À vérifier**

- La variable intermédiaire du moins unaire ne coûte rien une fois compilée (comme les autres
  `Generated_N` dans l'exercice 01) : supposé, pas mesuré pour cet exercice.
