# Projet 06

## Problématique

### Représenter et traiter des erreurs identifiées

Dans `add.ts`, un échec contient une information, `negative-operand`, ainsi que la valeur de l’opérande concerné. Dans `index.ts`, `DEither.matchInformation` choisit ensuite un traitement selon que le résultat porte cette information ou l’information `success`. Comment représenter des erreurs identifiées avec leur contexte, puis distinguer les variantes d’un résultat pour appliquer le traitement associé à chacune ?

### Traduire une expression ternaire

Dans `add.ts`, l’expression `one < 0 ? one : two` choisit une valeur selon une condition. TypeScript permet d’écrire cette sélection directement dans une expression, alors que Go ne possède pas d’opérateur ternaire. Comment traduire cette expression tout en conservant le choix de la branche et en produisant une valeur utilisable dans l’appel à `DEither.left` ?

## Notre étude

### Exercice 06

**Problèmes étudiés**

1. Construire `DEither.left("negative-operand", valeur)` et représenter son type
   `Left<"negative-operand", number>`.
2. Traduire le ternaire `one < 0 ? one : two` (Go n'en a pas).
3. Traduire `one < 0 || two < 0` sans calculer la partie droite quand elle est inutile.
4. Traduire `DEither.matchInformation(result, { … })` : un traitement par information, qui reçoit
   la valeur du bon côté (Left ou Right).

**Solution**

Go généré pour `add.ts` :

```go
func Sourced_add(Sourced_one float64, Sourced_two float64) (shard_dependencies.Either[float64, float64]) {
	Generated_28 := Sourced_one
	Generated_29 := (float64)(0)
	Generated_30 := Generated_28 < Generated_29
	if !(Generated_30) {                       // ||
		Generated_32 := Sourced_two
		Generated_33 := (float64)(0)
		Generated_30 = Generated_32 < Generated_33
	}
	if Generated_30 {
		Generated_37 := shard_dependencies.EitherLeftOf[float64, float64]
		Generated_41 := "negative-operand"
		var Generated_38 float64                // ternaire
		Generated_39 := Sourced_one
		Generated_40 := (float64)(0)
		if Generated_39 < Generated_40 {
			Generated_38 = Sourced_one
		} else {
			Generated_38 = Sourced_two
		}
		Generated_42 := Generated_38
		return Generated_37(Generated_41, Generated_42)
	}
	// return DEither.success(one + two) : identique à l'exercice 01
}
```

Go généré pour un `matchInformation` (`brouillons/variations-06`) :

```go
Generated_20 := Sourced_succeeded
var Generated_21 float64
switch Generated_20.Information {
	case "negative-operand":
		Sourced_operand := Generated_20.Left
		_ = Sourced_operand
		…
		Generated_21 = Generated_22 * Generated_24
	case "success":
		Sourced_value := Generated_20.Right
		_ = Sourced_value
		…
		Generated_21 = Generated_23 * Generated_25
}
Sourced_doubled := Generated_21
```

- **`left()`** : même recette que `success()` et `fail()` (exercice 04), une entrée de plus dans le
  handler commun des constructeurs. `Kind` reste vide : `left()` n'affiche pas de 4e clé.
- **Type `Left<info, valeur>`** : ajouté à la table des variantes (`either/eitherType`). Le côté
  Left prend le type de la valeur (`number` -> `float64`), d'où `Either[float64, float64]`.
- **Ternaire** (`expression/conditional.ts`) : une variable du type du ternaire (donné par le
  checker TS), remplie par un `if/else`. Les préparations de chaque branche restent dans sa
  branche : seule la branche choisie est calculée, comme en JS.
- **`||` et `&&`** (`expression/logical.ts`) : la partie droite est placée dans un `if`, elle n'est
  calculée que si elle peut changer le résultat (« court-circuit » de JS). Avant, `binary.ts`
  calculait toujours les deux côtés : `isRight(x) || f()` aurait appelé `f()` pour rien.
- **`matchInformation`** (`either/matchInformation`) : pas de fonction anonyme (décision n°5), un
  `switch` sur `.Information` ; le corps de chaque traitement est recopié dans son `case`. Le type
  TS de l'Either dit de quel côté est chaque information, donc si le paramètre lit `.Left` ou
  `.Right`. `_ = x` évite l'erreur Go « declared and not used » quand le traitement ignore sa
  valeur. Pas de `default` : TypeScript oblige à traiter toutes les informations, et seulement elles.
- Ajouts « TypeScript de base » nécessaires : chaînes `"…"`, types `string` et `boolean`.

**Variations envisagées** (`brouillons/variations-06`)

- Fonctionnent, avec une sortie identique à TS : `left` affiché (sans 4e clé), ternaire qui choisit
  le second opérande (`add(1, -5)`), `matchInformation` avec et sans paramètre, sur un échec et sur
  un succès (12 lignes) ; `court-circuit.ts` : `isPositive(1) || isPositive(2)` n'appelle pas
  `isPositive(2)`, `isPositive(-3) && isPositive(4)` n'appelle pas `isPositive(4)` (sortie
  `1 10 -3 -5 6 30`, comme TS).
- Refusées avec une erreur explicite : ternaire sur un nombre (`conditional-condition-is-not-boolean`),
  `count || 5` (`logical-operand-is-not-boolean`), traitement avec un bloc `{ return … }`
  (`callback-not-supported-yet`), `DEither.left("x")` sans valeur (le build
  s'arrête sur le type `undefined`, pas encore traduit : `notfound-transformer`).

**Résultat observé**

- Partie Either (`add.ts` et `matchInformation`) : sortie Go identique à la sortie TS, **oui**.
- Exercice complet (`./scripts/compare.sh 06`) : **pas encore**. `index.ts` utilise `DCommon.pipe`,
  `whenIsRightOtherwise`, `DArray.map` et `DString.to` (exercices 02 à 05, autres chantiers) ; le
  build s'arrête avec l'erreur explicite `common-function-not-supported-yet`.

```bash
pnpm build --tsconfig brouillons/variations-06/tsconfig.json --input brouillons/variations-06/index.ts --output /tmp/v06
cd /tmp/v06 && go run . | diff - ~/Desktop/hackaton/brouillons/variations-06/attendu.txt
```

**Limites**

- Dans `index.ts`, le traitement `success: (value) => DString.to(value)` a besoin de `DString.to`
  (chantier 4), et le résultat a le type `string | (string & Number)` : il faudra traduire ce type
  « marqué » en `string`.
- `matchInformation` : seulement la forme à deux arguments, et des traitements `() => valeur`,
  `(x) => valeur` ou une fonction passée par son nom (ajoutée à l'exercice 07). La forme courte pour
  un pipe et les traitements avec un bloc ne sont pas encore gérés.
- Une même information des deux côtés (`Left<"x", …> | Right<"x", …>`) est refusée : sa valeur
  n'aurait pas un seul type Go.
- `DEither.left("x")` sans valeur n'est pas géré.

**À vérifier**

- Les lignes `_ = x` et les variables `Generated_N` ne coûtent rien une fois compilées : supposé
  (vu pour l'exercice 01 avec `-gcflags=-m`), pas mesuré ici.
