# Problématique 05 — Transactions Asynchrones et Évaluation Paresseuse

## 1. Énoncé du Problème
Dans l'architecture de micro-services ou d'APIs transactionnelles avec **DuploJS**, les opérations combinent :
1. L'asynchronisme (`Promise<T>`, `async / await`).
2. L'évaluation différée/paresseuse via des thunks ou getters : `() => calculate(...)`.
3. L'agrégation atomique tout-ou-rien (`DEither.asyncGroup`) : un ensemble de tâches doit réussir collectivement pour produire un tuple complet de résultats `[Res1, Res2, ... ResN]`. Si une seule tâche échoue, la transaction est instantanément annulée et l'erreur est propagée sans exécuter les calculs restants.

Les défis d'ingénierie majeurs :
* **Asynchronisme vs Modèle Go :** Go ne possède pas de boucle d'événements (*Event Loop*) basée sur des promesses. Faut-il engendrer des goroutines et des canaux pour du code séquentiel pur ?
* **Conteneur polymorphe :** Dans un groupement de $N$ éléments, le résultat est souvent un tuple fixe (ex: `[3]float64`). Or Go interdit formellement d'utiliser `append` sur un tableau fixe.
* **Troncature du compilateur TypeScript :** Sur des signatures imbriquées profondes (promesses + Either + tuples), le `TypeChecker` tronque par défaut les nœuds syntaxiques en `"..."`, faisant planter le transpileur (`NOT FOUND NODE: TypeReference`).

---

## 2. Synthèse de la Stratégie Adoptée
* **Aplatissement Sémantique de l'Asynchronisme :** Pour du code sans concurrence I/O réelle, le transpileur applique la règle formelle `Promise<T> ➔ T` et `await expr ➔ expr`. Les fonctions `async` deviennent des fonctions Go synchrones pures ultra-rapides.
* **Résolution de la Troncature (`NoTruncation`) :** Injection du flag `NodeBuilderFlags.NoTruncation` sur le compilateur TypeScript, garantissant l'accès à l'arbre complet des types.
* **Moteur Polymorphe de Conteneur dans `asyncGroup` :**
  - Si le type cible est un tableau fixe (`[N]T`), il alloue sur la pile : `var values [N]T` (**zéro allocation de tas, zéro GC**), itère avec index et affecte `values[index] = res.V1.Value`.
  - Si le type cible est une slice dynamique, il utilise `make([]T, 0, len)` et `append`.
* **Évaluation Paresseuse & Court-Circuit $O(1)$ :** Chaque getter est invoqué au moment de son tour de boucle. Si son retour a `Tag == 0` (échec), la fonction retourne immédiatement, évitant l'exécution inutile des calculs suivants.

---

## 3. Résultats Empiriques & Benchmarks Réels

Mesures réelles exécutées sur **1 000 000 d'itérations** (`pnpm benchmark:approches`) :

| Environnement / Modèle d'Exécution | Temps d'Exécution | Facteur d'Accélération | Analyse Matérielle & Mémoire |
| :--- | :---: | :---: | :--- |
| **DuploJS (Node.js / V8)** | **5 060.2 ms** | Référence (1.0x) | Évaluation asynchrone sur microtâches JS, allocations d'objets `Promise`. |
| **Go Approche 1 (Slice dynam. `[]any`)** | **42.1 ms** | **~120x plus rapide** | Slice extensible avec `append()`, mais allocations mémoire sur le tas (*Heap*). |
| **Go Approche 2 (Tableau fixe sur pile SANS `any`)** | **8.47 ms** | **~597x vs Node / ~5.0x vs `any`** | Allocation statique de 24 octets sur la pile (*Stack*), 0 GC, court-circuit immédiat. |

---

## 4. Ouverture d'Esprit & Vision d'Ingénierie : Une Approche Transactionnelle Universelle SANS `any`

Une question fondamentale se pose :  
*Comment traiter des groupes transactionnels arbitraires de $N$ éléments et de types totalement hétérogènes **sans jamais sacrifier la sûreté statique ni passer par `any`** ?*

Trois axes d'ingénierie permettent de résoudre cette équation :

### Axe 1 : Structures de Tuples Hétérogènes Génériques (`TupleN[T0, T1, ... TN]`)
Au lieu d'utiliser une slice dynamique `[]any` qui dégrade le typage, le transpileur peut générer des structures de tuples paramétrées par arité :
```go
type Tuple3[T0, T1, T2 any] struct {
    V0 T0
    V1 T1
    V2 T2
}
```
* **L'avantage :** Chaque élément conserve son type statique exact (ex: `Tuple3[string, float64, bool]`), alloué d'un seul tenant sur la pile d'exécution sans aucune indirection de pointeur.

### Axe 2 : Concurrence Réelle via Canaux Typés et Annulation par `context.Context`
Lorsque l'asynchronisme de DuploJS implique de vrais I/O concurrents (ex: requêtes HTTP parallèles) :
- Au lieu d'agréger des résultats dans un conteneur générique `[]any`, on utilise une primitive de concurrence Go idiome : `context.WithCancel(ctx)`.
- Chaque tâche tourne dans une goroutine typée. Dès que la première tâche rencontre une erreur (`Left`), elle appelle `cancel()`, ce qui avorte immédiatement toutes les autres goroutines sans exécuter de calculs inutiles, le tout avec des canaux typés `chan Result[T]` sans aucun `any`.

### Axe 3 : Stratégie de Compilation Hybride
Le transpileur analyse la signature cible :
- Pour les arités fixes connues (tuples de 1 à 8 éléments) : émission de structures de pile directes `[N]T` ou `TupleN[...]` avec zéro allocation.
- Pour les collections dynamiques de taille inconnue : utilisation de conteneurs génériques homogènes `[]T` ou monomorphisés.

---

## 5. Documents Inclus
* [`historique-reflexions.md`](./historique-reflexions.md) : Analyse des erreurs de compilation Go, compromis `any` vs pile, et justifications techniques.
* [`exemples/duplojs.ts`](./exemples/duplojs.ts) : Transaction asynchrone DuploJS avec court-circuit sur division par zéro.
* [`exemples/go_equivalent.go`](./exemples/go_equivalent.go) : Exemple Go idiomatique équivalent avec allocation sur pile et court-circuit immédiat.
