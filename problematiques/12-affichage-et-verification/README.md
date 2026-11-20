# Affichage et vérification du comportement

## Problématique

`DCommon.print` affiche une valeur avec le format de la console Node (`util.inspect`). Comment produire en Go une sortie fidèle, et surtout **prouver** qu’un programme Go se comporte comme le programme TypeScript d’origine ?

## Stratégie retenue

- `print` affiche une chaîne telle quelle, et toute autre valeur en JSON indenté, grâce aux tags `json` des structs Either.
- Une valeur `undefined` est omise, comme avec `JSON.stringify`.
- Vérification : Node est lancé avec un affichage JSON, puis sa sortie est comparée **octet par octet** à celle du programme Go (`diff`). Chaque programme Go doit aussi passer `go vet`.

## Exercices concernés

Tous. Résultat : 12 projets sur 12 identiques.

## Fichiers

- `HISTORIQUE.md` : pourquoi le JSON plutôt que le format de Node, et la méthode de comparaison.
- `exemple.ts` / `exemple.go` : un `success`, un `fail` (valeur `undefined` omise) et une chaîne.
