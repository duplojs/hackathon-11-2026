# Historique — Représenter un Either

## Point de départ (projet 00, fourni)

Le projet 00 traduisait `DEither.success` vers une fonction de la dépendance Go partagée,
`EitherSuccessOf`. Il n'y avait qu'une seule variante, pas encore d'union.

## 18/11 — Le choix de la représentation (décision n°1)

Dès l'exercice 01, `add` renvoie `Success<number> | Fail`. Décision : **un struct unique passé par
valeur, pas d'interface**. Pour comparer, deux traductions Go de l'exemple de l'encadrant ont été
écrites et mesurées (`brouillons/prof/go`) :

- **`any` partout** : 11 allocations par appel. Une partie venait d'une regex recompilée à chaque
  appel. Une 3e version (`any`, regex compilée une seule fois) sépare les deux coûts : il reste
  2 allocations ;
- **typée** (`Either[L, R]`) : 0 allocation.

## 18/11 — Le champ `Kind`

En comparant l'affichage à Node : `DEither.success(3)` a une 4e clé (`success: null`) que
`DEither.right("success", 3)` n'a pas. Les deux ont pourtant la même information et la même valeur.
Il fallait donc garder le « constructeur d'origine » : champ `Kind` ajouté, validé le 18/11.

## 18/11 — « Pas de valeur »

Pour `DEither.fail()`, ou un côté sans aucune variante : `JSUndefined`, 0 octet comme `struct{}`,
et `Print` sait l'afficher `undefined`. Validé le 18/11.

## 18/11 — Go 1.27.4 refuse le projet 00

`Generated_4 := shard_dependencies.EitherSuccessOf` ne compilait plus : Go refuse de ranger une
fonction générique non instanciée dans une variable. Correction dans le handler `success` : le
transpileur écrit toujours les types (`EitherSuccessOf[JSUndefined, float64]`), lus dans le type TS
attendu. Pour un `return`, c'est le type de retour de la fonction, déclaré ou déduit par le
checker TS.

## 19/11 — `fail` et `left` (exercices 04 et 06)

Même recette que `success` : une fonction Go générique écrite à la main par constructeur
(`fail/fail.go`, `left/left.go`), et un seul handler commun (`either/constructor`). Ajouter un
constructeur revient à écrire une fonction Go et une ligne dans le routeur `either/index.ts`.
`Left<info, valeur>` a rejoint la table des types (`either/eitherType`).

## 19/11 — Une version `any` de l'exercice 07, pour comparer

`brouillons/any-07` : le Go attendu si l'Either gardait sa valeur dans un champ `Value any`.
Chaque lecture devient `Generated_4.Value.(float64)`, un test de type à l'exécution.

## 20/11 — La mesure (`brouillons/benchmark-either`)

Struct typé ~13 ns et 0 allocation, contre ~26 ns et 1 allocation (8 octets) avec un champ `any`
(`brouillons/BENCHMARKS.md`). Limite notée : c'est un micro-benchmark, une seule opération répétée.
