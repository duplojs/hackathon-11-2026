# Projet 01

## Problématique

### Représenter un retour composé de plusieurs variantes

La fonction `add` déclare un retour qui peut être un `DEither.Success<number>` ou un `DEither.Fail`. Comment représenter en Go un retour qui peut prendre plusieurs formes, tout en conservant le type et la valeur associés à chacune d’elles ? Dans cet exemple, l’implémentation retourne actuellement un succès, mais sa signature annonce également la possibilité d’un échec.

### Traduire une instruction conditionnelle

Dans `index.ts`, l’instruction `if` utilise `DEither.isRight(result)` comme condition et contient un bloc d’instructions à exécuter lorsque cette condition est vraie. Comment traduire une instruction conditionnelle en préservant l’évaluation de sa condition et l’exécution de la bonne branche ?

## Notre étude

### Exercice 01

**Problèmes étudiés**

1. Représenter en Go le type de retour `DEither.Success<number> | DEither.Fail`.
2. Construire `DEither.success(one + two)` avec le bon type Go.
3. Traduire `if (DEither.isRight(result)) { … }`.
4. Reproduire exactement l’affichage de `DCommon.print` (le `console.log` de Node).

**Solution**

Un seul struct générique, passé par valeur, pour tous les Either (écrit à la main dans
`src/transpiler/transformers/duplojs/either/either.go`) :

```go
type Either[L any, R any] struct {
	IsRight     bool
	Information string
	Kind        string // "success", "fail"… ; "" pour left()/right()
	Left        L
	Right       R
}
```

Go généré (`pnpm build:01`) :

```go
func Sourced_add(Sourced_one float64, Sourced_two float64) (shard_dependencies.Either[shard_dependencies.JSUndefined, float64]) {
	Generated_6 := shard_dependencies.EitherSuccessOf[shard_dependencies.JSUndefined, float64]
	Generated_7 := Sourced_one
	Generated_8 := Sourced_two
	Generated_9 := Generated_7 + Generated_8
	return Generated_6(Generated_9)
}

func init() {
	// …
	Sourced_result := Generated_1(Generated_2, Generated_3)
	if Sourced_result.IsRight {
		Generated_4 := shard_dependencies.Print
		Generated_5 := Sourced_result
		Generated_4(Generated_5)
	}
}
```

- **Type** : une union de variantes Either devient `Either[L, R]`. `L` est le type des valeurs
  des variantes Left (`Fail` → `JSUndefined`), `R` celui des variantes Right (`Success<number>` →
  `float64`). Un côté sans variante prend `JSUndefined` (struct vide, 0 octet). Le même transformer
  (`either/eitherType`) traite le type écrit dans le code et le type reconstruit par le checker.
- **Pourquoi un struct et pas une interface** : la valeur reste sur la pile, sans allocation ni
  test de type ; `isRight(x)` devient la lecture d’un champ (`x.IsRight`). Sur l’exemple partagé par
  l’encadrant, la version typée fait 0 allocation par appel, contre 2 à 11 pour une version en `any`
  (`brouillons/prof/go`, `go test -bench . -benchmem`).
- **Pourquoi `Kind`** : `DEither.success(3)` affiche une clé `success: null` que
  `DEither.right("success", 3)` n’a pas. Sans ce champ, l’affichage ne peut pas être identique.
- **Pourquoi `EitherSuccessOf[L, R]`** : Go ne peut pas déduire `L` à partir de l’argument, et il
  refuse de ranger une fonction générique non instanciée dans une variable (c’était l’erreur du
  projet 00 avec Go 1.27.4). `L` et `R` viennent du type TS attendu : pour un `return`, le type de
  retour de la fonction (déclaré ou déduit), c’est-à-dire exactement celui de la signature Go.
- **`if`** : les préparations de la condition (`before`) sont placées juste avant le `if`. Pour un
  `else if`, elles restent dans la branche `else`, comme en TS où la seconde condition n’est évaluée
  que si la première est fausse. Une branche sans accolades devient un bloc.
- **`print`** : `Print` (`duplojs/common/print/print.go`, écrit à la main) reproduit l’algorithme
  de `util.inspect` de Node : une ligne si l’objet tient en 80 caractères, une entrée par ligne
  sinon, tableaux de plus de 6 éléments en colonnes, profondeur 2, nombres écrits comme en JS
  (`-0`, `1e+21`, `NaN`), guillemets choisis comme Node, longueurs comptées en unités UTF-16.
  Il reçoit un `any` : c’est la frontière d’affichage, aussi dynamique que `console.log`.

**Variations envisagées** (`brouillons/variations-01`)

- Fonctionnent, avec une sortie identique à TS (24 lignes) : branche sans accolades suivie d’un
  `else` ; `else if` dont la condition contient un appel ; fonction sans type de retour écrit
  (type déduit `Success<number>`) ; appel imbriqué dans `print` ; `if` dans une fonction.
- Refusées avec une erreur explicite (jamais de Go faux) : condition non booléenne
  (`if (count)` → `if-condition-is-not-boolean`), résultat de `print` utilisé
  (`common-print-result-used`), second paramètre de `print`, variante Either absente de la table
  (`either-type-not-supported-yet` ; aujourd’hui `Right`, `erreur-variante.ts`), `DEither.success`
  passé comme valeur.

**Résultat observé**

Sortie Go identique à la sortie TS : **oui**. Le projet 00 passe aussi.

```bash
./scripts/compare.sh 01
./scripts/compare.sh 00
./brouillons/print-test/run.sh   # Print comparé à Node sur 136 lignes de cas limites
```

`go build -gcflags=-m` montre que Go copie (« inline ») `EitherSuccessOf` et `Sourced_add` à
l’endroit de l’appel, malgré les variables temporaires `Generated_N`. La seule valeur qui part sur
le tas est l’argument de `Print`, emballé dans un `any`.

**Limites**

- Deux variantes d’un même côté dont les valeurs ont des types Go différents (par exemple
  `Fail | Left<"x", number>`) : un seul `L` ne suffit pas. Le build s’arrête avec l’erreur
  `either-side-with-several-go-types` (testé depuis l’exercice 06, où `Left` a rejoint la table :
  `brouillons/variations-01/erreur-left.ts`). Aucun exercice de 00 à 10 ne
  produit ce cas (types vérifiés avec le checker, `brouillons/explore-vars.ts` : dans l’exercice 07,
  les Left portent `number` et `0`, deux `float64`). Il apparaît dans l’exemple de l’encadrant
  (`undefined` et `null`).
- Les `const` de haut niveau deviennent des variables locales de `func init()` : une fonction du
  même fichier ne peut pas les lire, et une variable jamais utilisée fait échouer la compilation
  Go (« declared and not used »).
- Go calcule les expressions constantes de façon exacte : `0.1 + 0.2` écrit avec des constantes
  donne `0.3` en Go, `0.30000000000000004` en JS. Le transpileur passe toujours par des variables
  `float64`, ce qui donne le résultat de JS. Cette propriété doit être conservée.
- `Print` ne gère pas la troncature des chaînes de plus de 10 000 caractères (`maxStringLength`).

**À vérifier**

- Le temps d’exécution de l’exercice lui-même n’a pas été mesuré : le programme est trop court.
  Les mesures ci-dessus portent sur l’exemple de l’encadrant.
- La copie de `Print` (environ 300 lignes, `reflect`) dans tout programme qui affiche quelque chose
  augmente la taille du binaire. Non mesuré.
