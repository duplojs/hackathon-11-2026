# Erreurs identifiées et `matchInformation`

## Problématique

En DuploJS, un échec porte une **information** qui l’identifie (`"negative-operand"`, `"division-by-zero"`) et une valeur de contexte. `DEither.matchInformation` choisit ensuite un traitement selon cette information. Comment traduire ce choix en Go, et passer à chaque traitement une valeur correctement typée, alors que le source n’écrit pas ce type (`(value) => …`) ?

## Stratégie retenue

- `DEither.left("negative-operand", valeur)` → `EitherLeftOf("negative-operand", valeur)`.
- `matchInformation` → un `switch` sur `GetInformation()`, un `case` par clé.
- La valeur passée à un traitement est lue avec `GetValue()` puis convertie vers le type de son paramètre, **donné par le checker TypeScript**.

## Exercices concernés

06, 07, 11.

## Fichiers

- `HISTORIQUE.md` : pourquoi un `switch` sur l’information plutôt qu’un `switch` sur le type.
- `exemple.ts` / `exemple.go` : trois issues d’un calcul, chacune avec son message.
