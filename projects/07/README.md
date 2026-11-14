# Projet 07

## Problématique

### Enchaîner des opérations dépendantes

Dans `index.ts`, `DEither.rightPipe` reçoit le résultat de `add`, puis transmet sa valeur à `divide`. Cette seconde opération peut aussi échouer. Comment enchaîner des opérations qui dépendent les unes des autres, en interrompant la suite dès qu’une étape produit un échec et en conservant cet échec dans le résultat final ?
