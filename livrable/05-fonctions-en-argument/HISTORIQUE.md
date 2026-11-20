# Historique — Les fonctions passées en argument

## 18/11 — La règle de départ (décision n°5)

Avant d'écrire les transformers concernés, l'équipe a posé la règle : les fonctions passées en
argument (`whenIsRight`, `rightPipe`, `map`, `pipe`…) sont générées **en ligne** (`if r.IsRight
{ … }`, boucle `for`, étapes à la suite). Une closure Go n'est autorisée qu'en solution de repli,
justifiée dans le README.

## 19/11 — `whenIsRight` : une première version en `any`, abandonnée (exercice 02)

La première version utilisait un Either à valeur `any`, une fonction Go
`WhenIsRight(input any, f func(any) any) any` et des tableaux `[]any`. Elle donnait les bonnes
valeurs, mais avec `any` partout et un affichage différent de Node. Elle a été remplacée par la
version en ligne, sur l'Either typé de l'équipe.

En lisant le code de DuploJS, on a découvert que `whenIsRight` ne renvoie **pas** un Either en
cas de succès, mais directement le résultat de la fonction. Le type de `newResult` est donc
`Fail | readonly [number]` (voir la problématique 07).

## 19/11 — La forme curryfiée (exercice 03)

`DEither.whenIsRight(DArray.coalescing)` avec un seul argument renvoie une fonction. Alternative
étudiée puis écartée : une fonction anonyme Go (`func(value any) any { return WhenIsRight(value, f) }`)
et des appels successifs dans `pipe`. Elle marchait, mais créait une fonction à l'exécution et
imposait `func(any) any` à toutes les étapes. Choix : `pipe` reconnaît cette forme et applique
directement le cœur de `whenIsRight` (`applyWhenIsRight`) à la valeur courante.

## 19/11 — Le helper commun `inlineCallback` (exercice 07)

`rightPipe` et `matchInformation` avaient tous deux besoin de « recopier une fonction ». Un helper
partagé (`common/inlineCallback.ts`) a été écrit, avec la consigne de le réutiliser pour
`whenIsRight`, `whenIsRightOtherwise` et `DArray.map`, afin que toute l'équipe génère le même Go.

## 19/11 — `matchInformation` (exercice 06)

Un `switch` sur `.Information`, le corps de chaque traitement recopié dans son `case`. Le type TS
de l'Either dit de quel côté est chaque information, donc si le paramètre lit `.Left` ou `.Right`.
`_ = x` évite l'erreur Go « declared and not used ». Pas de `default` : TypeScript oblige à traiter
toutes les informations, et seulement elles. Un traitement passé par son nom
(`success: DString.to`) a été ajouté avec l'exercice 07.

## 19/11 — `whenIsRightOtherwise` et `map` (exercice 05)

- Écrire `whenIsRightOtherwise` comme une fonction séparée : écarté, 90 % du code est identique à
  `whenIsRight`. Un seul cœur, avec un paramètre optionnel.
- `map` en fonction Go générique `Map[T, U](arr []T, f func(T) U) []U` dans le runtime : marche,
  mais oblige à fabriquer une fonction anonyme pour `f` (décision n°5). Boucle en ligne préférée.

## 20/11 — Bug trouvé en revue

Deux fonctions fléchées avec le même paramètre dans un même `pipe` (`(v) => v + 1, (v) => v * 2`)
déclaraient deux fois `Sourced_v` : Go refusait de compiler. Correction : chaque fonction recopiée
est placée dans son propre bloc `{ }`. Testé : sortie identique à Node.
