# Problématique 02 — Retours Multiples Hétérogènes et Inférence Contextuelle

## 1. Énoncé du Problème
En TypeScript idiomatique, une fonction peut posséder plusieurs instructions `return` renvoyant des types hétérogènes (`fail()`, `left(...)`, `success(...)`) **sans qu'aucune annotation explicite de type de retour ne soit fournie par le développeur** :
```typescript
function process(val: number) {
    if (val < 0) return DEither.fail();
    return DEither.success(val * 2);
}
```
En Go, une fonction exige formellement **un unique type de retour statique**.
Le problème d'ingénierie est double :
1. **Inférence automatique :** Comment déterminer la signature globale de la fonction Go sans que l'utilisateur n'ait annoté son code TS ?
2. **Réconciliation à l'émission (`placeValue`) :** Quand le transpileur visite l'instruction locale `return DEither.fail()`, comment sait-il dans quelle case de l'union globale (`Tag: 0`, `Tag: 1`, ... `Tag: N`) cette valeur doit être empaquetée ?

---

## 2. Synthèse de la Stratégie Adoptée
* **Introspection via le `TypeChecker` de TypeScript :** Le transpileur interroge la signature sémantique complète au niveau de la déclaration de la fonction (`checker.getReturnTypeOfSignature`).
* **L'Adaptateur Universel `placeValue` :** À chaque instruction `return expr`, l'algorithme :
  1. Évalue le type concret de `expr`.
  2. Résout l'union globale attendue par la fonction englobante.
  3. Compare les types textuels normalisés et calcule l'index canonique exact $k$.
  4. Génère automatiquement le constructeur structuré :
     ```go
     return UnionN[...]{ Tag: k, Vk: expression }
     ```
* **Généralisation à $N$ Branches :** Que la fonction contienne 2 retours (comme le cas d'école de l'exercice 04) ou 10 retours hétérogènes (applications métier réelles), le mécanisme opère de manière strictement identique.

---

## 3. Documents Inclus
* [`historique-reflexions.md`](./historique-reflexions.md) : Confrontation critique entre l'approche naïve V1 (IA) et l'architecture pérenne V2.
* [`exemples/duplojs.ts`](./exemples/duplojs.ts) : Exemple DuploJS illustrant le cas d'école étendu à 3 retours.
* [`exemples/go_equivalent.go`](./exemples/go_equivalent.go) : Exemple Go idiomatique équivalent montrant l'injection par index.
