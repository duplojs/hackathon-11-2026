# Projet 07

## Problématique

### Enchaîner des opérations dépendantes

Dans `index.ts`, `DEither.rightPipe` reçoit le résultat de `add`, puis transmet sa valeur à `divide`. Cette seconde opération peut aussi échouer. Comment enchaîner des opérations qui dépendent les unes des autres, en interrompant la suite dès qu’une étape produit un échec et en conservant cet échec dans le résultat final ?

## Stratégie retenue

`rightPipe` est inliné en `if` imbriqués (ADR-10). L'entrée est évaluée une
seule fois, les callbacks fléchés sont inlinés dans leur branche et la première
gauche interrompt les étapes suivantes. Voir [docs/exercises/07.md](../../docs/exercises/07.md).
