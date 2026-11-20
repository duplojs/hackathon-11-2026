# 07 — Traduire les types TypeScript en types Go

**Exercices concernés** : tous, surtout 02, 05 et 07. **État** : traité pour les types des
exercices 00 à 07.

## La problématique

Le Go généré a besoin d'un type pour chaque variable : `var r T` pour un ternaire, le type de
retour d'une fonction, le type d'une étape de `pipe`. Ces types ne sont souvent **pas écrits** dans
le TS : c'est le checker TypeScript qui les calcule. Et ce qu'il calcule n'existe pas en Go (sortie
du checker sur `exemples/types`, avec `brouillons/explore-vars.ts`) :

```
result    : Fail | Success<number>                              union
divide()  : Left<"division-by-zero", 0> | Success<number>       type littéral 0
coalesced : Fail | readonly [number]                            union Either OU tableau
numbers   : [-12] | readonly [number]                           union de deux tuples
labels    : readonly (string & Number)[] & LengthEqual<1>       marques DuploJS
```

## Stratégie de l'équipe : une liste de règles essayées dans l'ordre, sinon une erreur

On demande le type au checker TS (`type/ofExpression.ts`), puis on le traduit avec la liste des
transformers de types (`type/index.ts`). Le premier qui reconnaît le type gagne :

| Type TS | Type Go | Fichier |
|---|---|---|
| `number`, littéral `0` | `float64` | `float.ts`, `numberLiteral.ts` |
| `string`, `"abc"`, `` `${number}` `` | `string` | `string.ts`, `stringLiteral.ts` |
| `boolean` | `bool` | `boolean.ts` |
| `T[]`, `readonly T[]`, tuple dont tous les éléments ont le même type | `[]T` | `array.ts` |
| union de variantes Either | `Either[L, R]` (problématique 02) | `duplojs/either/eitherType` |
| union dont tous les membres donnent **le même type Go** | ce type | `sameTypeUnion.ts` |
| `A & Marque` où la marque vient de `@duplojs/lang` | `A` | `brandedIntersection.ts` |
| union d'un Either **et** d'autre chose | `any` (seule exception) | `mixedEitherUnion.ts` |
| tout le reste | **erreur de build explicite** | — |

## L'exception `any`, et une seule

`DEither.whenIsRight(result, DArray.coalescing)` renvoie le tableau en cas de succès, ou l'Either
d'échec : `Fail | readonly [number]`. C'est le TypeScript lui-même qui mélange deux types sans
rapport : aucun type Go précis ne peut contenir les deux. Cette union devient `any`. Toute autre
union inconnue reste une erreur (décision n°6, exception validée le 19/11).

## Résultat

- `./scripts/compare.sh 02` (le cas `any`), `05` (unions de tuples, marques), `07` (littéral `0`) :
  sorties identiques.
- `exemples/types` : la stratégie écrite à la main donne la même sortie que la référence TS.

## Limites

- `newResult` en `any` (exercice 02) : le compilateur Go ne vérifie plus son type, et la valeur est
  emballée (allocation possible).
- Le tuple `readonly [number]` devient un slice `[]float64` : la longueur fixe et le `readonly` ne
  sont pas conservés.
- `brandedIntersection` ignore toutes les marques venant de `@duplojs/lang`, y compris celles qui
  portent un invariant (ex. `LengthEqual<1>` sur le résultat de `map`) : cet invariant n'est pas
  conservé en Go.
- Tuple avec des types différents (`[number, string]`) : erreur `tuple-with-different-element-types`.

Voir aussi : [HISTORIQUE.md](HISTORIQUE.md).
