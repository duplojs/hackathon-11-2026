# Appels de fonction et génériques

## Problématique

Comment traduire un appel de fonction (`DEither.success(one + two)`, `add(1, 2)`) en conservant l’ordre d’évaluation de JS, quand la fonction appelée est **générique** en Go ? Le projet 00 fourni par le boilerplate ne compilait pas à cause de ce point.

## Stratégie retenue

- Les arguments sont évalués dans l’ordre du source.
- Une **déclaration de fonction** est appelée directement, sans être rangée dans une variable : elle ne peut pas changer, donc l’ordre n’est pas affecté, et Go peut déduire les paramètres génériques à l’appel.

## Exercices concernés

00 (correction du boilerplate), puis tous les appels.

## Fichiers

- `HISTORIQUE.md` : le bug du projet 00, les deux corrections envisagées et l’évolution.
- `exemple.ts` / `exemple.go` : l’ordre d’évaluation des arguments et l’appel direct d’une fonction générique.
