# Historique — Nombres et ordre d'évaluation

## Point de départ (projet 00, fourni)

La solution de l'exercice 00 posait déjà deux choix : `number` → `float64` (même représentation
IEEE 754 que JS), et un appel découpé en variables (`callable := …`, `firstArgument := …`, puis
l'appel), pour préserver l'ordre d'évaluation et permettre les instructions de préparation.

## 18/11 — Décision n°3 : `number` → `float64`, toujours

Écrite dans les règles de l'équipe dès le départ.

## 18/11, exercice 01 — `0.1 + 0.2`

Go calcule une addition de constantes de façon exacte et affiche `0.3`, alors que JS affiche
`0.30000000000000004`. Le transpileur passe toujours par des variables `float64`, ce qui donne le
résultat de JS. On l'a noté dans les limites de l'exercice 01 : « cette propriété doit être
conservée ».

## 19/11, exercice 04 — `-1` et `-0`

`(float64)(-0)` vaut `+0` en Go, alors que `-0` vaut `-0` en JS. Choix : la valeur est d'abord
rangée dans une variable, puis le moins est appliqué à la variable (`expression/prefixUnary.ts`).
Testé avec `add(-0, -0)` dans `brouillons/variations-04`, qui affiche bien `-0`.

## 19/11, exercice 07 — la division

Comme les autres opérations, la division porte sur des variables. Go calcule alors à l'exécution,
comme JS (`x / 0` donne `+Inf`). Vérifié : avec deux constantes, `1 / 0` ne compile même pas en Go.

## Ce qu'on retient

Le Go « joli » (expressions directes, constantes) est souvent faux par rapport à JS. Le Go généré
est plus long à lire, mais il est correct.
