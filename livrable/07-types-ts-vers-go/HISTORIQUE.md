# Historique — Traduire les types TypeScript en types Go

## 18/11 — Type écrit ou type déduit (exercice 01)

L'exercice 01 a un type de retour écrit (`Success<number> | Fail`). Le même transformer
(`either/eitherType`) traite le type écrit dans le code et le type reconstruit par le checker TS.
Dès l'exercice 04, `add` n'a plus de type écrit : le checker le déduit, et rien de nouveau n'est à
écrire.

## 19/11 — Les variables déclarées avant d'être remplies (exercices 06 et 07)

Le ternaire et `matchInformation` produisent `var r T` puis des `if` ou un `switch`. Le TS n'écrit
nulle part ce `T`. Ajout de `type/ofExpression.ts` : le type Go d'une expression, d'après le
checker. Ajout aussi des types `string` et `boolean`.

## 19/11 — Le type littéral `0` (exercice 07)

Après `if (divisor === 0)`, TS sait que `divisor` vaut `0` : le Left de `divide` a le type
`Left<"division-by-zero", 0>`. Go n'a pas de types littéraux : `0` devient `float64`. Les deux Left
(`number` et `0`) ont donc le même type Go, et un seul `L` suffit.

## 19/11 — Le premier type qui n'est pas un Either (exercice 02)

`whenIsRight` renvoie `Fail | readonly [number]`. Exception limitée à la décision n°6, validée le
19/11 : une union qui mélange un Either et une valeur qui n'en est pas un devient `any`
(`type/mixedEitherUnion.ts`). Ce n'est pas un `any` pour faire passer le build : c'est le TS
lui-même qui mélange deux types sans rapport. Toute autre union inconnue reste une erreur.

## 19/11 — Les types de l'exercice 05

Le transpileur refusait de traduire. C'est en lisant ses erreurs qu'on a trouvé les types réels :

- la sortie de la 1re étape est typée `readonly [number] | number[]` (tuple d'un côté, tableau de
  l'autre). Règle ajoutée (`sameTypeUnion.ts`) : une union dont tous les membres donnent le même
  type Go devient ce type. On obtient `[]float64` et **pas `any`**. Laisser `any` aurait marché à
  l'affichage, mais c'était un `any` silencieux alors que le type exact est connu ;
- `DString.to` renvoie `string & Number` : DuploJS colle des **marques** avec `&`, qui n'existent
  qu'à la compilation. Enlever toutes les intersections (`A & B` → `A`) était trop large, on
  pourrait perdre un vrai type. On ne retire que les marques qui viennent de `@duplojs/lang`,
  vérifiées par leur fichier d'origine (`brandedIntersection.ts`) ;
- `readonly X` → `X` (Go n'a pas de readonly), `T[]` → `[]T`, tuple de même type → `[]T`
  (`array.ts`) ; type littéral `"abc"` ou template literal `` `${number}` `` → `string`.

## 20/11 — Bugs trouvés en revue

- **`coalescing` sur un tableau** : en TS, `coalescing` renvoie un tableau tel quel. La première
  version l'enveloppait quand même (`[[1, 1]]` au lieu de `[1, 1]`). Le transformer lit maintenant
  le type de la valeur reçue (type « contextuel » donné par le checker) et choisit
  `CoalescingArray` (tel quel) ou `Coalescing` (enveloppe). Testé avec `success([n, n])` : sortie
  identique à Node.
- **`StringTo` acceptait tout** : il paniquait à l'exécution sur un tableau. Il est maintenant
  contraint à `float64 | string | bool` (interface `Stringable`) : c'est le compilateur Go qui
  refuse les autres types.
