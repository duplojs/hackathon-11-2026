# Historique — Composer des étapes : `pipe` et `rightPipe`

## 19/11 — `rightPipe` (exercice 07)

Pas de fonction anonyme (décision n°5). L'Either d'entrée est rangé dans une variable
(l'« accumulateur »), et chaque étape devient un `if` : « si c'est encore un succès, calcule
l'étape suivante avec sa valeur ».

Pour garder un seul accumulateur, tous les Either de la chaîne doivent avoir le même type Go. On a
vérifié avec le checker TS (`brouillons/explore-vars.ts`) que c'est le cas dans les exercices 07,
08 et 10. Le type littéral `0` de `divide` (`Left<"division-by-zero", 0>`) devient `float64`, comme
`number` (`type/numberLiteral.ts`). Les deux Left ont donc le même type Go.

Le Go attendu a d'abord été écrit à la main (`brouillons/07`), puis le transformer.

Variations (`brouillons/variations-07`) : 3 chemins testés, sortie identique. Cas refusés avec une
erreur : étape qui renvoie une valeur brute (`erreur-etape-valeur.ts`), étape écrite avec un bloc
(`erreur-etape-bloc.ts`).

## 19/11 — `pipe` (exercice 03)

Le code de DuploJS est une boucle. Alternative étudiée puis écartée : traduire
`whenIsRight(f)` par une fonction anonyme Go, et `pipe` par des appels successifs à ces fonctions.
Elle marchait, mais créait une fonction à l'exécution et imposait `func(any) any` à toutes les
étapes. Choix : le nombre d'étapes étant connu à la traduction, les étapes sont écrites l'une après
l'autre, dans l'ordre du TS. `pipe(result, whenIsRight(coalescing))` produit le même Go que
`whenIsRight(result, coalescing)`, ce qui est attendu : les deux font le même calcul.

## 19/11 — Étapes de types différents (exercice 05)

La 1re étape renvoie un tableau de nombres, la 2e un tableau de chaînes. Chaque étape ayant sa
propre variable, déclarée avec son type Go (`var Generated_8 []float64`, `var Generated_12
[]string`), ce n'est pas un problème.

## 20/11 — Bug trouvé en revue

Deux fonctions fléchées avec le même paramètre dans un même `pipe` déclaraient deux fois la même
variable Go. Chaque étape est désormais recopiée dans son propre bloc `{ }`, le résultat étant
déclaré avant avec son type. Testé : sortie identique à Node.
