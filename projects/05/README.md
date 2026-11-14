# Projet 05

## Problématique

### Transformer les différentes issues d’un résultat

Dans `index.ts`, `DEither.whenIsRightOtherwise` transforme un succès avec `DArray.coalescing` et fournit une autre valeur pour les autres issues. Comment traduire une transformation qui doit traiter différemment les variantes d’un résultat, puis transmettre la valeur obtenue aux étapes suivantes du pipe ?

### Transformer chaque élément d’une collection

Après cette sélection, `DArray.map` convertit chaque élément en chaîne. Comment traduire une transformation appliquée à tous les éléments d’une collection en conservant son ordre et sa structure ?
