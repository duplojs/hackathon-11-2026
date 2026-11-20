# Historique des Réflexions — Problématique 04 : Composition & Court-Circuit

## 1. Pistes Explorées et Arbitrage d'Ingénierie : avec ou sans `any` ?

### Piste A : L'Approche Universelle avec `any` (Polymorphisme et Compacité)
* **Idée :** Écrire une fonction variadique Go unique dans la bibliothèque runtime :
  ```go
  func PipeAny(initial any, fns ...func(any) EitherAny) EitherAny { ... }
  ```
* **Pourquoi cette piste est très pertinente :**
  1. **Généralité universelle :** Une fonction unique écrite une seule fois dans la bibliothèque runtime est capable d'absorber 100% des pipelines de l'application, quelles que soient les signatures ou le nombre d'étapes.
  2. **Absorption du dynamisme :** Elle gère naturellement les fonctions chargées à l'exécution ou les tableaux dynamiques de fonctions.
  3. **Compacité du code compilé :** Aucun risque de *code bloat* : pas besoin d'inliner ou de dupliquer du code à la compilation.
* **Ses compromis matériels :**
  1. **Surcoût mémoire (Heap Boxing) :** Chaque passage d'argument impose l'emballage en `any` sur le tas (*Heap*), sollicitant le ramasse-miettes (*GC*).
  2. **Assertions dynamiques :** Nécessite des vérifications de type au runtime (`val.(float64)`).

---

### Piste B : Chaînage par structures monadiques avec méthodes (`.AndThen()`)
* **Idée :** Attacher des méthodes de type `result.AndThen(fn1).AndThen(fn2)`.
* **Pourquoi cette piste a été écartée :**
  En Go, les méthodes de structures ne peuvent pas déclarer de nouveaux paramètres de type génériques indépendants de la structure receveuse. Il est donc impossible d'exprimer proprement en Go une méthode `.AndThen[U](fn func(T) U) Result[U]`.

---

### Piste C : L'Approche Spécialisée SANS `any` — Inlining Statique et IIFE (Retenue pour la Vitesse Pure)
* **Idée :** Résoudre la composition **à la compilation** lors de la visite de l'arbre syntaxique :
  1. Le transpileur inspecte la liste ordonnée des étapes.
  2. Il émet une fonction fermée auto-invoquée `func() Union2 { ... }()`.
  3. Pour chaque étape :
     - Il appelle la fonction avec la valeur précédente déballée.
     - Si le résultat est un échec (`Tag == 0`), il émet un `return` anticipé immédiat.
* **Avantages déterminants :**
  * **Zéro allocation de tas :** Toutes les variables intermédiaires sont allouées sur la pile (*Stack*) ou dans des registres CPU.
  * **Court-circuit instantané :** Dès le premier échec, le reste de la séquence est sauté en 1 seul cycle processeur sans aucune allocation.
  * **Optimisation par le compilateur Go :** Le compilateur Go intègre l'IIFE (*inlining*) et supprime tout coût d'appel de fonction.
* **Ses limites :**
  * Requiert que toutes les étapes soient connues à la compilation (pas de dynamisme).
  * Risque de *code bloat* si un projet contient des centaines de pipelines complexes.

---

## 2. Benchmark Comparatif et Conclusion d'Ingénierie

Mesures réelles exécutées sur 1 000 000 d'itérations :
* **DuploJS (Node.js / V8) :** 793.2 ms
* **Go Approche 1 (Universelle avec any) :** 25.9 ms (30.6x plus rapide que Node.js)
* **Go Approche 2 (Spécialisée sans any) :** 0.72 ms (36.0x plus rapide qu'avec any, 1 100x plus rapide que Node.js)

### Bilan :
L'approche `any` est **certes universelle, mais n'est pas la plus rapide**.  
La vision d'ingénierie optimale pour DuploJS est donc un **transpileur hybride** : inlining sans `any` sur les chemins critiques (*hot paths*), et bibliothèque générique avec `any` pour le code polymorphique ou dynamique.
