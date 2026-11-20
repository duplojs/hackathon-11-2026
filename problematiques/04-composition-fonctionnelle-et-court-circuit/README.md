# Problématique 04 — Élimination du Runtime et Court-Circuit Monadique

## 1. Énoncé du Problème
Les architectures fonctionnelles modernes et le framework **DuploJS** s'appuient massivement sur des combinateurs monadiques tels que `DCommon.pipe` et `DEither.rightPipe`.
Ces opérateurs permettent d'enchaîner une série de transformations de manière déclarative :
```typescript
const result = DEither.rightPipe(
    initialValue,
    step1,
    step2,
    step3
);
```
La sémantique monadique exige un **court-circuit immédiat** : si une étape intermédiaire retourne un échec (`Left`), les étapes suivantes ne doivent jamais être appelées, et l'erreur doit être retournée immédiatement.

En Go, il n'existe pas de combinateur variadique d'ordre supérieur natif supportant le court-circuit typé.
Le défi d'ingénierie consiste à :
1. Traduire ces enchaînements en Go **sans créer de bibliothèque runtime dynamique** imposant des interfaces vides `interface{}` et de la réflexion.
2. Garantir le court-circuit à coût zéro sans créer d'allocations de fermetures (*closures*) intermédiaires.

---

## 2. Synthèse de la Stratégie Adoptée
* **Déroulement Statique à la Compilation (Inlining de Variables) :**  
  Pour les `pipe` purs, le transpileur élimine l'appel de fonction d'ordre supérieur et génère des variables locales séquentielles (`Generated_1`, `Generated_2`), exécutant un appel direct.
* **Fonctions Auto-Invoquées (IIFE Go) pour le Court-Circuit :**  
  Pour `rightPipe`, le corps est encapsulé dans une fonction anonyme appelée immédiatement :
  ```go
  result := func() ResultUnion {
      if step1.Tag == 0 { return step1 } // Court-circuit anticipé
      if step2.Tag == 0 { return step2 }
      return step3
  }()
  ```
  Le compilateur Go optimise cette forme (*inlining*) et transforme le code en de simples sauts d'instructions machine conditionnels (*JMP/CMP*).

---

## 3. Résultats Empiriques & Benchmarks Réels

Mesures réelles exécutées sur **1 000 000 d'itérations** (`pnpm benchmark:approches`) :

| Environnement / Modèle d'Exécution | Temps d'Exécution | Facteur d'Accélération | Analyse Matérielle & Mémoire |
| :--- | :---: | :---: | :--- |
| **DuploJS (Node.js / V8)** | **793.2 ms** | Référence (1.0x) | Exécution dynamique sur machine virtuelle V8, closures multiples. |
| **Go Approche 1 (Universelle avec `any`)** | **25.9 ms** | **~30.6x plus rapide** | 1 seule fonction générique `PipeAny()`, mais boxing mémoire sur le tas (*Heap*). |
| **Go Approche 2 (Spécialisée sans `any` / IIFE)** | **0.72 ms** | **~1 100x vs Node / ~36x vs `any`** | Inlining direct sur registres CPU et pile (*Stack*), court-circuit $O(1)$ sur Tag. |

---

## 4. Ouverture d'Esprit & Vision d'Ingénierie : Comment Avoir une Approche Universelle SANS `any` ?

Une interrogation légitime d'architecture se pose :  
*L'approche avec `any` est universelle (elle absorbe 100% des cas dynamiques) mais ralentie par le tas ; l'approche inlinée sans `any` est ultra-rapide mais restreinte aux pipelines statiques. **Est-il possible de concevoir une approche fonctionnant dans TOUS les cas de figure sans jamais recourir à `any` ?***

La réponse est **OUI**, grâce à trois axes d'ingénierie avancés :

### Axe 1 : Monomorphisation via les Génériques Go (Go 1.18+)
Au lieu de recourir au type `any`, le transpileur peut s'appuyer sur une famille de combinateurs génériques fortement typés par arité :
```go
func Pipe2[A, B, C any](val A, f1 func(A) Either[B], f2 func(B) Either[C]) Either[C]
func Pipe3[A, B, C, D any](val A, f1 func(A) Either[B], f2 func(B) Either[C], f3 func(C) Either[D]) Either[D]
```
* **Le bénéfice :** Le compilateur Go applique la **monomorphisation** à la compilation. Il génère du code machine spécialisé pour chaque signature concrète sans passer par le tas (*zero heap boxing*), tout en conservant une fonction réutilisable pour tous les pipelines du projet.

### Axe 2 : Défonctionnalisation de Reynolds (Defunctionalization)
Pour des pipelines dont la structure n'est connue qu'au runtime, la théorie des langages propose la **défonctionnalisation** :  
Au lieu de passer des pointeurs de fonctions opaques emballés dans `any`, chaque étape est encodée comme une variante d'un type somme énuméré (*Sum Type*). Une boucle de transition d'états déterministe exécute les calculs sur la pile sans aucune fermeture (*closure*) ni allocation dynamique.

### Axe 3 : Architecture de Compilation Hybride & Auto-Spécialisation
Le transpileur de production idéal ne doit pas être dogmatique :
1. **Chemins critiques (*Hot Paths*) :** Détection automatique des boucles et fonctions intensives ➔ application de l'Approche 2 (inlining zéro-allocation).
2. **Code polymorphe ou flux I/O externes :** Génération de combinateurs génériques monomorphisés `PipeN[T...]` pour concilier universalité et sûreté statique.

---

## 5. Documents Inclus
* [`historique-reflexions.md`](./historique-reflexions.md) : Analyse comparative détaillée des compromis `any` vs sans `any`.
* [`exemples/duplojs.ts`](./exemples/duplojs.ts) : Pipeline monadique DuploJS avec plusieurs causes d'échec.
* [`exemples/go_equivalent.go`](./exemples/go_equivalent.go) : Exemple Go idiomatique déroulé avec court-circuit $O(1)$.
