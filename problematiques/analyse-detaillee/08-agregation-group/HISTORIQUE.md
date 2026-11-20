# Historique des réflexions · 08 Agrégation avec `group`

## 1. Lire l'implémentation de référence

Avant de traduire, nous avons lu le code de DuploJS (`dist/either/right/group.mjs`) : un `reduce` avec `exit` au premier `Left`, et un appel des getters (`when(isType("function"), getter => getter())`) **au fil du parcours**. Deux propriétés en découlent, et la traduction doit les conserver :

1. **arrêt au premier échec** : les éléments suivants ne sont pas examinés ;
2. **paresse** : un getter situé après l'échec n'est jamais appelé, donc ses effets n'ont jamais lieu.

## 2. Première version : toujours une slice

**V1** : `group` produisait toujours une slice, avec `make([]T, 0, len(group))` puis `append`. C'était correct pour le projet 09, dont l'entrée est un tableau `[number, number, number][]`.

**Problème au projet 10** : l'entrée de `asyncGroup` est un **tuple** de trois getters. Le checker infère donc `Success<[number, number, number]>`, c'est-à-dire `[3]float64` en Go. Deux erreurs :

1. `append` est **interdit** sur un tableau Go de taille fixe ;
2. `EitherSuccess[[]float64]` ne correspond pas à `EitherSuccess[[3]float64]` attendu par l'union de sortie (`either-value-does-not-match-expected-type`).

**V2 retenue** : le transpileur ne **suppose** plus la forme du conteneur, il lit le type cible dans l'union de sortie :

| Type cible | Code généré |
|---|---|
| `[N]T` | `var values [N]T`, puis `values[index] = …` (pile, aucune allocation) |
| `[]T` | `make([]T, 0, len(input))`, puis `append` (une allocation) |

**Leçon** : une solution qui marche sur l'exemple n'est pas forcément la bonne solution. Dès qu'une décision dépend d'un type, on la prend à partir du **type calculé par le checker**, jamais d'une hypothèse sur l'exemple.

## 3. Pistes écartées pour la propagation

| Piste | Problème | Décision |
|---|---|---|
| Parcourir tout le tableau, puis chercher un échec | Exécute les getters après l'échec, contrairement à DuploJS | ❌ |
| `break` + variable « échec trouvé » | Correct, mais demande deux variables et un test après la boucle | ❌ |
| **Fonction anonyme + `return` dans la boucle** | — | ✅ Même schéma que `rightPipe` |

## 4. Allocation de la slice

La capacité maximale est connue : il ne peut pas y avoir plus de valeurs que d'éléments. `make([]T, 0, len(input))` évite les réallocations de `append` (voir le benchmark de la problématique 07 : ≈ 2,5× plus rapide qu'un `append` sans capacité). En cas d'échec rapide, la slice est allouée pour rien, mais ce compromis est acceptable face au cas nominal.

## 5. Vision à long terme

- **Forme objet** `group({ a, b })` : une struct Go générée pour chaque forme d'objet, avec un champ par clé. Le parcours devient une suite d'instructions déroulée, puisque les clés sont connues à la compilation.
- **Getters dans `group` synchrone** : déjà gérés pour `asyncGroup`, il reste à appliquer le même code au `group` synchrone.
- **Déroulage pour les tuples** : pour un tuple de N éléments, dérouler la boucle (N blocs `if`) permettrait des éléments **hétérogènes** (`[Success<number>, Success<string>]`), impossibles avec un `range`.
