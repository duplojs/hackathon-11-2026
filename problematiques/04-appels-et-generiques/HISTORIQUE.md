# Historique — appels de fonction et génériques

## Point de départ : la stratégie du boilerplate

Pour respecter l’ordre d’évaluation de JS (la fonction, puis chaque argument de gauche à droite), le transformer d’appel fourni rangeait la fonction **et** chaque argument dans des variables temporaires :

```go
f := shard_dependencies.EitherSuccessOf
a := one + two
return f(a)
```

## Le bug

Ce code ne compile pas : `cannot use generic function EitherSuccessOf without instantiation`. Go ne sait pas déduire `T` quand une fonction générique est rangée dans une variable. **Le Go du projet 00 fourni ne compilait donc pas.**

## Pistes explorées

### Piste A — instancier explicitement (écartée)

Écrire `f := EitherSuccessOf[float64]`, avec le type lu dans le checker TypeScript. Problème : `DEither.success` est déclaré avec un générique `const`, donc `success(3)` a pour type le **littéral** `3`, pas `number`. Il aurait fallu gérer tous les types littéraux, et ajouter du code dans chaque handler.

### Piste B — appeler directement les déclarations de fonction (retenue)

Une **déclaration** de fonction (`function add…`, une fonction importée, `DEither.success`) ne peut pas être réassignée. L’évaluer avant ou après les arguments ne change rien, donc on peut l’appeler directement : `EitherSuccessOf(a)`. Go déduit alors `T` à l’appel. Le symbole est résolu par le checker, donc un import renommé est reconnu.

## Évolution

- **Louis-Martin** a étendu l’appel direct aux identifiants et sélecteurs de package, et supprimé les variables temporaires inutiles pour les arguments simples.
- Effet mesuré : le coût d’inlining de `add` par le compilateur Go est passé de **33 à 18** (seuil 80), et le code généré est plus lisible.

## Limite assumée

Si une **variable** locale contenant une fonction était réassignée pendant l’évaluation des arguments, l’appel direct lirait la nouvelle valeur au lieu de l’ancienne. Ce cas est très rare en DuploJS, où les fonctions sont des déclarations.
