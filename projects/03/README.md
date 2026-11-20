# Projet 03

## Problématique

### Composer des transformations dans un pipe

Dans `index.ts`, `result` est transmis à `DCommon.pipe`, puis à `DEither.whenIsRight` configuré avec `DArray.coalescing`. Comment traduire une composition où chaque étape reçoit le résultat de l’étape précédente, en respectant l’ordre du pipe et le comportement conditionnel de la transformation ?

## Solution

### Exercice 03

**Problèmes étudiés**

- `DCommon.pipe(x, f, g)` = `g(f(x))` : chaque étape reçoit le résultat de la précédente.
- **Problème découvert** : `whenIsRight` reçoit ici **un seul** argument,
  `DEither.whenIsRight(DArray.coalescing)`. Le code de DuploJS montre que cette forme
  (« curryfiée ») ne calcule rien : elle renvoie une fonction qui attend l’entrée plus tard.

  ```js
  if (args.length === 1) {
  	const [theFunction] = args;
  	return (input) => whenIsRight(input, theFunction);
  }
  ```

  C’est `pipe` qui l’appelle ensuite avec `result`.

**Solution**

```go
Generated_6 := Sourced_result          // entrée du pipe
Generated_7 := Generated_6             // étape whenIsRight(coalescing), en ligne
var Generated_8 any
if Generated_7.IsRight {
	Generated_8 = shard_dependencies.Coalescing(Generated_7.Right)
} else {
	Generated_8 = Generated_7
}
Sourced_newResult := Generated_8       // résultat de la dernière étape
```

- **`pipe` déroulé** (`duplojs/common/pipe.ts`) : le code de DuploJS est une boucle
  (`for (const pipe of pipes) acc = pipe(acc)`). Le nombre d’étapes étant connu à la traduction,
  le transpileur écrit les étapes l’une après l’autre, dans l’ordre du TS : pas de fonction Go
  `Pipe`, pas de liste de fonctions construite à l’exécution.
- **`whenIsRight(fonction)` comme étape** : plutôt que de fabriquer une fonction anonyme
  (décision n°5), `pipe` reconnaît cette forme et réutilise le cœur de `whenIsRight` du projet 02
  (`applyWhenIsRight`), appliqué directement à la valeur courante. Le Go produit est le même que
  celui du projet 02, ce qui est attendu : `pipe(result, whenIsRight(coalescing))` et
  `whenIsRight(result, coalescing)` font le même calcul.
- **Autres étapes** (fonction fléchée ou passée par son nom) : recopiées en ligne avec
  `inlineCallback`, comme dans `rightPipe`.

Alternative étudiée puis écartée : traduire `whenIsRight(f)` par une fonction anonyme Go
(`func(value any) any { return WhenIsRight(value, f) }`) et `pipe` par des appels successifs à ces
fonctions. Elle marchait, mais crée une fonction à l’exécution et impose le type `func(any) any`
à toutes les étapes.

**Variations envisagées**

- `add` qui renvoie un échec (`fail()` quand `one === 1`) : `newResult` reste l’échec. Sortie
  identique à TS.
- Le projet 04, qui utilise le même `pipe(result, whenIsRight(coalescing))`, passe désormais
  aussi.

**Résultat observé**

Sortie Go identique à la sortie TS : **oui**. Les projets 00, 01, 02 et 04 passent.

```bash
./scripts/compare.sh 03
./scripts/compare.sh 04
```

**Limites**

- Seules deux formes d’étapes sont reconnues : `whenIsRight(fonction)` et une fonction (fléchée ou
  passée par son nom). `whenIsRightOtherwise(f, g)` et `DArray.map(f)` ont été
  ajoutées ensuite de la même manière (projet 05).
- *(corrigé après la revue)* Deux fonctions fléchées avec le même paramètre dans un même pipe
  (`(v) => v + 1, (v) => v * 2`) déclaraient deux fois `Sourced_v` : Go refusait de compiler.
  Chaque fonction fléchée est maintenant recopiée dans son propre bloc `{ }`, le résultat étant
  déclaré avant avec son type (comme pour `whenIsRight`). Testé : sortie identique à Node.
- `DCommon.pipe` passé comme valeur n’est pas géré.
- Le type de chaque étape vient du checker : une étape dont le type de retour ne peut pas être
  calculé provoque une erreur explicite.

**À vérifier**

- Un `pipe` à plusieurs étapes de types différents n’apparaît dans aucun exercice et n’a pas été
  testé.