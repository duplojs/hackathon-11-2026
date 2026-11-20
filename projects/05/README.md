# Projet 05

## Problématique

### Un pipe avec un cas d'échec et une transformation de tableau

Dans `index.ts`, `result` (un Either issu de `add`) passe dans un `DCommon.pipe` à deux étapes :

1. `DEither.whenIsRightOtherwise(DArray.coalescing, () => [-12])` : si c'est un succès, on met la valeur dans un tableau ; sinon on renvoie `[-12]`.
2. `DArray.map(DString.to)` : on transforme chaque nombre du tableau en texte.

Comment traduire ça en Go en gardant les deux chemins (succès / échec), un vrai type de tableau, et la même sortie que Node ?

## Solution

### Exercice 05

**Problèmes étudiés**

- `whenIsRightOtherwise` = `whenIsRight` du projet 02 **plus** une fonction pour le cas d'échec.
  Dans le code de DuploJS, le callback « otherwise » reçoit l'Either entier (le Left).
- `DArray.map(DString.to)` est en forme **curryfiée** (un seul argument), comme `whenIsRight` au
  projet 03 : c'est `pipe` qui lui donne le tableau.
- **Problèmes de types découverts en route** (le transpileur refusait de traduire) :
  - la sortie de la 1ʳᵉ étape est typée par TS `readonly [number] | number[]` (tuple d'un côté, tableau de l'autre) ;
  - `DString.to` renvoie, d'après `tsc`, `string & Number` : une chaîne avec une étiquette DuploJS ;
  - DuploJS colle des **étiquettes de type** avec `&` (ex. `string & Number`, ou `readonly T[] & …contraintes`) qui n'existent qu'à la compilation TS.

**Solution**

Go généré pour le pipe :

```go
Generated_7 := Generated_6               // étape 1 : whenIsRightOtherwise, en ligne
var Generated_8 []float64
if Generated_7.IsRight {
	Generated_8 = shard_dependencies.Coalescing(Generated_7.Right)
} else {
	Generated_9 := (float64)(12)
	Generated_10 := -(Generated_9)
	Generated_8 = ([]float64{Generated_10}) // le callback () => [-12], recopié en ligne
}
Generated_11 := Generated_8              // étape 2 : map(DString.to), en ligne
var Generated_12 []string
for _, Generated_13 := range Generated_11 {
	Generated_12 = append(Generated_12, shard_dependencies.StringTo(Generated_13))
}
Sourced_newResult := Generated_12
```

- **`whenIsRightOtherwise`** (`either/whenIsRight/index.ts`) : on réutilise `applyWhenIsRight` du 02,
  avec un paramètre optionnel `otherwise`. La branche `else` recopie le callback « otherwise » avec
  l'Either en entrée (décision n°5 : pas de fonction anonyme).
- **`map`** (`array/map.ts`) : une boucle `for … range` + `append`. Même logique que `pipe` : le
  nombre d'étapes et la fonction sont connus à la traduction, donc on écrit la boucle directement.
- **`DString.to`** (`string/to.go`) : runtime Go écrit à la main (décision n°8), `StringTo[T]`,
  qui réutilise `formatNumber` de `Print` → `3` donne `"3"` comme en JS (pas `"3.000000"`).
  Cas particulier : `` `${-0}` `` vaut `"0"` en JS, donc `-0` → `"0"`.
- **Types** :
  - `array.ts` : `readonly X` → X (Go n'a pas de readonly), `T[]` → `[]T`, tuple dont tous les éléments ont le même type → `[]T` ;
  - `sameTypeUnion.ts` : une union dont tous les membres donnent **le même type Go** devient ce type. C'est pour ça qu'ici on obtient `[]float64` et **pas `any`** (contrairement au 02 où l'union mélangeait Either et tableau) ;
  - `stringLiteral.ts` : un type littéral (`"abc"`) ou un template literal type (`` `${number}` ``) → `string` ;
  - `brandedIntersection.ts` : dans un `A & B`, on ignore les étiquettes qui viennent de `@duplojs/lang` ; s'il reste exactement un type réel, on le traduit, sinon erreur.
- **Littéraux de tableau** (`expression/arrayLiteral.ts`) : `[a, b]` → `[]T{a, b}`, avec T donné par le TypeChecker.

**Variations envisagées**

- Écrire `whenIsRightOtherwise` comme une fonction séparée : écarté, 90 % du code est identique à
  `whenIsRight` → un seul cœur avec un paramètre optionnel.
- `map` en fonction Go générique `Map[T, U](arr []T, f func(T) U) []U` dans le runtime : marche,
  mais oblige à fabriquer une fonction anonyme pour `f` (décision n°5) → boucle en ligne préférée.
- Laisser les unions `readonly [number] | number[]` en `any` : aurait marché à l'affichage, mais
  c'est un `any` silencieux (décision n°6) alors que le type exact est connu.
- Enlever toutes les intersections (`A & B` → A) : trop large, on pourrait perdre un vrai type.
  On ne retire que les étiquettes DuploJS, vérifiées par leur fichier d'origine.

**Résultat observé**

`./scripts/compare.sh 05` → sortie identique à Node :

```
{
  '@duplojs/lang/kind/@DuplojsLangEither/right': null,
  '@duplojs/lang/kind/@DuplojsLangEither/information': 'success',
  '@duplojs/lang/kind/@DuplojsLangEither/value': 3,
  '@duplojs/lang/kind/@DuplojsLangEither/success': null
}
[ '3' ]
```

Variante d'échec testée à la main (`add(-1, 2)`) : sortie identique, `[ '-12' ]`.
Les exercices 00 à 07 passent tous avec ce changement (pas de régression).

**Limites**

- `map` ne donne que l'élément au callback ; DuploJS donne aussi `{ index, self }`. Un callback à
  2 paramètres est refusé avec une erreur (aucun exercice ne s'en sert).
- `map`, `whenIsRight`, `whenIsRightOtherwise` en forme curryfiée **hors d'un pipe** → erreur
  explicite (il faudrait une fonction anonyme).
- *(corrigé après la revue)* `StringTo` est contraint à `float64 | string | bool` (interface
  `Stringable`). Avant, il acceptait `any` type et paniquait à l'exécution sur un tableau ;
  maintenant c'est le compilateur Go qui refuse : le contrat est vérifié à la compilation.
- `brandedIntersection` ignore toutes les étiquettes venant de `@duplojs/lang`, y compris celles
  qui portent un invariant (ex. `LengthEqual<1>` sur le résultat de `map`) : cet invariant n'est
  pas conservé en Go (un slice n'a pas de longueur fixe dans son type).
- Tuple avec des types différents (`[number, string]`) → erreur `tuple-with-different-element-types`.
- Tableau vide : `var x []T` vaut `nil` en Go, mais `Print` l'affiche bien `[]` (vérifié).

**À vérifier**

- `make([]T, 0, len(arr))` au lieu de `var x []T` éviterait les ré-allocations de `append`
  (piste d'optimisation, pas nécessaire pour la sortie).