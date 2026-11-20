# Problématique 03 — Dualité Mémoire Tableaux Fixes `[N]T` vs Slices `[]T`

## 1. Énoncé du Problème
En TypeScript, un tuple de taille fixe (comme `[number]`) et un tableau dynamique de taille variable (`number[]`) partagent la même classe d'objets `Array` et les mêmes méthodes (`.map()`, `.filter()`).

En Go, le modèle matériel est fondamentalement différent :
* **Un tableau de taille fixe `[1]float64`** est un type statique alloué directement sur la pile d'exécution (*Stack*).
* **Une slice `[]float64`** est un en-tête dynamique de 24 octets (pointeur, longueur, capacité) pointant vers une zone mémoire allouée sur le tas (*Heap*).

**L'incompatibilité formelle en Go :**  
Un tableau fixe `[N]T` **ne peut jamais être passé directement** à une fonction attendant une slice dynamique `[]T` (comme la fonction de bibliothèque `ArrayMap[T, U](array []T, fn func(T) U) []U`). Le compilateur Go rejette l'appel avec une erreur de type stricte :
```text
cannot use array (variable of type [1]float64) as []float64 value in argument to ArrayMap
```

---

## 2. Synthèse de la Stratégie Adoptée
* **Détection du Type de Nœud dans l'AST :** Le transpileur inspecte l'argument passé aux fonctions de collection. Si l'argument possède le tag `[node][type]array` (tableau de taille fixe), il ne tente pas de le convertir par une allocation de tas.
* **Slicing Universel Zéro-Copie (`array[:]`) :** Le transpileur émet automatiquement l'opérateur de découpage Go `array[:]`.
* **Bénéfice d'Architecture :**
  1. Crée une vue slice pointant directement sur la zone mémoire du tableau fixe existant sur la pile.
  2. **Zéro allocation sur le tas (*Heap*), zéro copie de données, temps d'exécution strictement nul $O(1)$.**
  3. Fonctionne pour n'importe quelle taille de tableau fixe ($[1]T$, $[3]T$, $[100]T$).

---

## 3. Documents Inclus
* [`historique-reflexions.md`](./historique-reflexions.md) : Analyse des pistes rejetées (allocation dynamique, duplication de bibliothèques) et justification du slicing.
* [`exemples/duplojs.ts`](./exemples/duplojs.ts) : Exemple DuploJS reliant `coalescing` et `DArray.map`.
* [`exemples/go_equivalent.go`](./exemples/go_equivalent.go) : Exemple Go idiomatique équivalent montrant l'usage de la vue slice `[:]`.
