# Historique des Réflexions — Problématique 05 : Transactions Asynchrones

## 1. Pistes Explorées et Échecs de la V1

### Échec 1 : La modélisation par Goroutines et Canaux pour des calculs séquentiels
* **Idée :** Traduire chaque `Promise` par une goroutine Go et chaque `await` par la lecture d'un canal `<-chan T`.
* **Pourquoi cette piste a été rejetée :**
  1. **Surcoût d'ordonnancement massif :** Créer des goroutines et des canaux pour exécuter des calculs arithmétiques ou logiques séquentiels multiplie le temps d'exécution par 10 (temps de commutation de contexte du scheduler Go).
  2. **Risque de deadlock :** Sans une gestion méticuleuse de fermeture de canaux et de buffers, les flux conditionnels risquent de bloquer l'exécutable.
  3. **Justification de l'Aplatissement V2 :** En l'absence d'I/O réseau non bloquant concurrent, `Promise<T>` est une simple monade d'évaluation différée. L'aplatir en `T` en Go préserve l'exactitude sémantique à coût nul.

---

### Échec 2 : Le piège du conteneur fixe dans `group` (L'erreur de l'IA V1)
Dans l'exercice 09, `group` recevait une collection dynamique. L'IA a donc généré :
```go
values := make([]float64, 0, len)
values = append(values, current.Value)
```
Dans l'exercice 10, l'entrée est un tuple littéral de 3 fonctions `[ () => c1, () => c2, () => c3 ]`. TypeScript infère donc un type de retour cible sous forme de **tableau fixe de 3 éléments** : `[3]float64`.
* **Conséquence :** Le compilateur Go a rejeté violemment le code :
  `first argument to append must be slice; have [3]float64`.
* **De plus :** `placeValue` a échoué car le type produit `EitherSuccess[[]float64]` ne correspondait pas au type attendu `EitherSuccess[[3]float64]`.

---

### Échec 3 : La troncature des types par le compilateur TypeScript
Sur des structures profondément imbriquées (`Promise<Either<Left, Success<[3]number>>>`), le compilateur TypeScript tronque automatiquement les types longs en chaînes syntaxiques `"..."`.
* **Conséquence :** Le transpileur Go échouait avec `NOT FOUND NODE: TypeReference typeName: ...`.

---

## 2. Les Solutions d'Architecture Retenues (V2)

1. **Introspection sans troncature :**  
   Dans `transformCheckerType`, nous avons forcé le flag de compilation :
   `flags: NodeBuilderFlags.NoTruncation`. L'arbre syntaxique complet est systématiquement disponible.

2. **Polymorphisme de Conteneur dans `groupExpressionHandler` :**  
   Le transpileur inspecte le type Go cible attendu :
   ```typescript
   const isTargetArray = DModeling.hasTagValue(valuesType, "[node][type]array");
   ```
   * Si c'est un tableau fixe `[N]T` : il déclare une variable zéro-valeur sur la pile `var values [N]T` et écrit directement par index `values[index] = current.Value`.
   * Si c'est une slice `[]T` : il utilise `make` et `append`.

3. **Atomicité et Évaluation Paresseuse :**  
   Si les éléments du groupe sont des fonctions (`signatures.length > 0`), le transpileur génère un appel `element()`. Dès qu'un retour porte l'étiquette d'erreur (`Tag == 0`), un `return` anticipé termine l'exécution de la transaction.

---

## 3. Confrontation d'Ingénierie : Approche avec `any` vs Approche sans `any`

### Approche 1 : Slice Dynamique `[]any` (Universelle)
* **Avantages :** Accepte une collection de N fonctions arbitraires de types de retour hétérogènes. `append()` est autorisé par le compilateur Go. Implémentation universelle simple dans le runtime.
* **Compromis :** Allocation sur le tas (*Heap*), sollicitation du Garbage Collector, et perte du typage strict du tuple `[3]float64`.

### Approche 2 : Tableau Fixe sur la Pile `[3]float64` (Spécialisée)
* **Avantages :** Allocation de 24 octets stricts sur la pile, zéro ramasse-miettes, assignation par index direct `values[i] = ...`, et respect rigoureux du contrat de type DuploJS.
* **Limites :** Code spécialisé généré sur-mesure pour la taille exacte $N=3$.

### Benchmark Réel Mesuré (1 000 000 d'itérations) :
* **DuploJS (Node.js / V8) :** 5 060.2 ms
* **Go Approche 1 (Slice dynam. []any) :** 42.1 ms (120x plus rapide que Node.js)
* **Go Approche 2 (Tableau fixe sur pile) :** 8.47 ms (5.0x plus rapide qu'avec any, 597x plus rapide que Node.js)

### Conclusion :
L'approche avec `any` est **universelle mais pas la plus rapide**. Elle constitue la solution idéale pour le code polymorphique, tandis que l'approche sans `any` sur la pile garantit la performance maximale pour les transactions critiques.
