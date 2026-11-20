# Historique des Réflexions — Problématique 02 : Retours Multiples & placeValue

## 1. Pistes Explorées et Impasse de l'Approche Naïve V1

### L'Échec de l'Approche Initiale (V1 - Overfitting sur l'Exercice)
Lors de la première implémentation assistée par IA, celle-ci s'est focalisée sur l'exemple particulier de l'exercice 04 (`add.ts`) :
* L'IA a constaté que `add.ts` ne renvoyait que `DEither.fail()` et `DEither.success()`.
* **Le raccourci naïf :** L'IA a hardcodé dans le handler de fonction que si une fonction contenait un appel à `fail()`, elle devait automatiquement retourner `Union2[EitherFail, EitherSuccess]`.
* **Pourquoi cette approche était défaillante :**
  1. **Incapacité totale à passer à l'échelle :** Si une fonction métier contient un échec simple (`fail`), une erreur détaillée (`left("invalid-arg", val)`), et un succès (`success(data)`), le transpileur V1 s'effondrait car il ne concevait que des paires rigides de 2 membres.
  2. **Perte de contexte dans l'AST :** Lorsqu'un transformateur d'expression traite `return DEither.fail()`, il n'a accès qu'au nœud local de retour. Sans mécanisme d'inférence descendante, il émettait naïvement `return EitherFailOf()`, ce qui provoquait l'erreur de compilation Go :
     `cannot use EitherFail as Union2 in return statement`.

---

## 2. La Conception de l'Architecture Pérenne (V2)

Pour résoudre le problème pour n'importe quelle fonction du monde réel, nous avons articulé deux principes fondateurs :

### 1. Inférence ascendante via le `TypeChecker`
Au lieu de déduire les types à partir de la syntaxe brute du fichier, le transpileur s'appuie sur le moteur sémantique de TypeScript :
```typescript
const signature = await typeChecker.getSignatureFromDeclaration(node);
const returnType = await typeChecker.getReturnTypeOfSignature(signature);
```
Même si le développeur omet l'annotation `: Success | Fail`, TypeScript calcule le type d'union exact. Nous passons ce type à `transformCheckerType` pour allouer statiquement l'union Go cible `UnionN[T0, T1, ... Tn]`.

### 2. Le Moteur Universel d'Insertion `placeValue`
Dans `src/transpiler/transformers/duplojs/either/members.ts`, nous avons conçu la fonction `placeValue` :
```typescript
export async function placeValue(params: PlaceValueParams) {
    const { expression, goType, target, location, context } = params;
    const targetUnion = await resolveCheckerUnion(target, location, context);
    // 1. Calcul de la clé textuelle normalisée du type produit
    const key = GoPrinter.renderNode(goType);
    
    // 2. Recherche du slot canonique exact dans l'union cible
    const memberIndex = findMemberIndex(targetUnion, key);
    
    // 3. Encapsulation automatique dans la structure Go
    return GoAST.createCompositeLiteral({
        type: targetUnion.goType,
        elements: [
            GoAST.createKeyValue({ key: "Tag", value: memberIndex }),
            GoAST.createKeyValue({ key: `V${memberIndex}`, value: expression })
        ]
    });
}
```

### Justification du Choix :
* **Généralité absolue :** Ce code ne contient aucun nom en dur (`"add"`, `"fail"`, `"number"`). Il fonctionne pour n'importe quel type de retour, n'importe quelle arité $N$, et n'importe quelle imbrication monadique.
* **Allocation sur la pile :** Le compilateur Go reçoit une structure fermée passée par valeur : zéro pointeur, zéro allocation heap, zéro surcharge GC.
