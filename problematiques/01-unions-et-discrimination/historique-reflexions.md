# Historique des Réflexions — Problématique 01 : Unions & Discrimination

## 1. Pistes Explorées et Écarts Conceptuels

### Piste A : L'interface vide `interface{}` ou `any`
* **Idée :** Comme n'importe quelle valeur Go satisfait `interface{}`, une union `A | B` pourrait être représentée par `any`.
* **Pourquoi cette piste a été rejetée :**
  1. **Perte totale de sûreté statique :** Le compilateur Go ne peut plus vérifier les types.
  2. **Coût d'allocation (Boxing) :** Assigner une structure ou un scalaire à `any` force Go à allouer de la mémoire sur le tas (*Heap*), sollicitant lourdement le ramasse-miettes (*GC*).
  3. **Lenteur à l'exécution :** Pour vérifier si la valeur est un `Success`, il faut utiliser un type switch dynamique :
     ```go
     switch v := result.(type) {
     case EitherSuccess[float64]: ...
     }
     ```
     Cette inspection de métadonnées de type au runtime consomme des dizaines de cycles processeur.

---

### Piste B : Interface fermée avec méthode marqueur (Tag Method)
* **Idée :** Définir une interface privée `type Either interface { isEither() }` et implémenter cette méthode sur `EitherFail` et `EitherSuccess`.
* **Pourquoi cette piste a été rejetée :**
  Bien qu'elle restreigne les types admissibles, elle impose toujours le passage par un pointeur d'interface et une indirection dynamique (vtable), empêchant l'inlining et l'allocation directe sur la pile.

---

### Piste C : L'Union Étiquetée Générique `UnionN` sur la Pile (Retenue)
* **Idée :** Modéliser l'union comme une somme disjointe (*Tagged Union*) explicite :
  ```go
  type Union2[T0 any, T1 any] struct {
      Tag uint8
      V0  T0
      V1  T1
  }
  ```
* **Avantages déterminants :**
  1. **Zéro allocation de tas :** La structure vit entièrement sur la pile (*Stack*).
  2. **Discrimination en 1 cycle d'horloge :** Tester si le résultat est un `Right` se résume à comparer un entier dans un registre processeur (`result.Tag == 1`).
  3. **Extensibilité formelle à l'échelle N :** Ce schéma se décline mécaniquement pour $N$ membres (`Union3`, `Union4`, etc.).

---

## 2. Le Défi de l'Instabilité des Ordres de Types (Dédoublonnage Canonique)

En TypeScript, les unions ne sont pas ordonnées :
```typescript
type U1 = DEither.Success<number> | DEither.Fail;
type U2 = DEither.Fail | DEither.Success<number>;
```
Pour le compilateur TypeScript, `U1` et `U2` sont identiques. Mais en Go, si l'on assignait les tags selon l'ordre textuel d'apparition dans le code source :
* Pour `U1`, `Tag 0 = Success`, `Tag 1 = Fail`.
* Pour `U2`, `Tag 0 = Fail`, `Tag 1 = Success`.

**Conséquence fatale :** Un test généré `if result.Tag == 1` interpréterait un succès comme un échec selon le fichier d'origine !

### Choix & Justification :
Nous avons imposé un **tri canonique déterministe** à la compilation :
Les membres de l'union sont triés alphabétiquement d'après leur représentation textuelle Go normalisée (`GoPrinter.renderNode(memberType)`). Deux types syntaxiquement inversés produisent **rigoureusement la même structure Go avec les mêmes tags d'index**.
