# Passage à l’échelle des unions

## Problématique

Sur un vrai projet, une fonction peut renvoyer une union de nombreuses variantes, dont les valeurs ont des types différents : un `number` pour une erreur, un `string` pour une autre, `undefined` pour une troisième. Le professeur a ajouté le projet 11 pour illustrer ce point d’attention. Quelle représentation Go reste valable quel que soit le nombre de variantes, sans faire grossir le code avec le projet ?

## Stratégie retenue

Un **type Go par constructeur DuploJS**, en nombre fixe, et une seule interface `Either` pour toutes les unions. Ajouter une variante dans le code TypeScript ne crée aucun nouveau type Go.

## Exercices concernés

06, 07, 11, et un test dédié à 5 variantes.

## Fichiers

- `HISTORIQUE.md` : les approches qui ne passent pas à l’échelle, et la vérification de la nôtre.
- `exemple.ts` / `exemple.go` : une fonction à 5 variantes, avec des valeurs de 4 types différents.
