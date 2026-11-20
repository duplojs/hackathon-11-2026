# Historique — Des expressions TS qui deviennent des instructions Go

## Point de départ (projet 00, fourni)

Le boilerplate prévoyait déjà le couple `{ before, result }` pour les expressions, utilisé pour
préparer les arguments d'un appel. Les règles de l'équipe en font l'outil pour tout ce qui n'est
pas une expression en Go : ternaire, déstructuration, pipe aplati…

## 18/11 — `if` et `else if` (exercice 01)

- La condition de `if (DEither.isRight(add(10, 20)))` contient un appel. Ses préparations
  (`before`) sont placées juste avant le `if`.
- Pour un `else if`, elles restent dans la branche `else` : en TS, la seconde condition n'est
  évaluée que si la première est fausse.
- Une branche sans accolades devient un bloc.
- Variations testées : `brouillons/variations-01` (24 lignes identiques à TS).

## 19/11 — Plusieurs `return` (exercice 04)

`add` renvoie `fail()` ou `success(...)`, sans type de retour écrit. Rien de nouveau à générer :
le checker TS déduit `Fail | Success<number>`, qui devient `Either[JSUndefined, float64]`, comme
dans l'exercice 01.

## 19/11 — Ternaire (exercice 06)

`DEither.left("negative-operand", one < 0 ? one : two)`. Go n'en a pas. Traduction : une variable
du type du ternaire (donné par le checker TS, `type/ofExpression.ts`), remplie par un `if / else`.
Les préparations de chaque branche restent dans sa branche : seule la branche choisie est calculée,
comme en JS.

## 19/11 — `||` et `&&` : le court-circuit (exercice 06)

Avant, `binary.ts` calculait toujours les deux côtés : `isRight(x) || f()` aurait appelé `f()` pour
rien. `||` et `&&` ont été retirés de `binary.ts` pour un transformer à part, `logical.ts`, qui
place la partie droite dans un `if`. Elle n'est calculée que si elle peut changer le résultat.
Test : `brouillons/variations-06/court-circuit.ts`, sortie `1 10 -3 -5 6 30` identique à TS.

## Cas refusés

Testés dans `brouillons/variations-06` : ternaire sur un nombre
(`conditional-condition-is-not-boolean`) et `count || 5` (`logical-operand-is-not-boolean`).
Décision n°6 : un cas non géré est une erreur, jamais du Go approximatif.
