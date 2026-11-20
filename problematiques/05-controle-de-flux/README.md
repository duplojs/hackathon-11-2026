# Contrôle de flux

## Problématique

Comment traduire `if/else`, l’opérateur ternaire `c ? a : b` (absent de Go) et les opérateurs `&&` et `||` en conservant exactement l’ordre d’évaluation de JS : une branche non prise ou un côté droit inutile ne doit jamais être exécuté ?

## Stratégie retenue

- **`if/else`** : les préparations de la condition sont placées avant le `if`, celles d’une branche restent dans la branche.
- **Ternaire** : une variable typée par le checker, puis un `if/else`.
- **`&&` et `||`** : l’opérateur natif de Go quand le côté droit est une simple expression ; sinon, ses préparations vont dans un `if`, exécuté seulement si nécessaire.

## Exercices concernés

01, 04, 06.

## Fichiers

- `HISTORIQUE.md` : le helper `ternary` écarté, et le bug de court-circuit trouvé dans le boilerplate.
- `exemple.ts` / `exemple.go` : un ternaire et un `||` dont le côté droit ne doit pas s’exécuter.
