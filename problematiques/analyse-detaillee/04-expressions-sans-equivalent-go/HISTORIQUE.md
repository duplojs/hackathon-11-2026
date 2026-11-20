# Historique des réflexions · 04 Expressions sans équivalent Go

## 1. Ternaire

| Piste | Problème | Décision |
|---|---|---|
| Fonction runtime `Ternary(cond, a, b)` | **Les deux branches sont évaluées** avant l'appel : effets de bord et coûts faux, et division par zéro possible dans la branche non choisie | ❌ |
| `Ternary(cond, func() T { return a }, func() T { return b })` | Paresseux, mais crée deux fermetures par ternaire, illisible | ❌ |
| Fonction anonyme appelée immédiatement `func() T { if … }()` | Correct, mais coûte un appel. On la réserve aux cas qui demandent un retour anticipé (`rightPipe`, `group`) | ❌ Ici |
| **Variable + `if / else` dans les préparations** | Aucun | ✅ **Retenu** |

**Point important** : les préparations de chaque branche restent **dans** leur branche. Au projet 06, le ternaire est un argument de `DEither.left(...)`, lui-même dans un `return` à l'intérieur d'un `if`. Ses préparations sont émises juste avant ce `return`, donc exécutées seulement si l'échec est vraiment retourné.

**Type du résultat** : il vient du checker pour l'expression entière (`one < 0 ? one : two` → `number`). Si les branches ont des types différents (`cond ? "a" : 1`), le checker donne une union. Ce cas n'est pas encore traduit ; la suite naturelle est de placer chaque branche dans son membre avec `placeValue` (problématique 02), comme le fait déjà `whenIsRightOtherwise`.

## 2. Court-circuit `&&` / `||` : un bug corrigé en cours de route

**Première version** : chaque côté était transformé, et ses préparations étaient concaténées **avant** l'opérateur. Le Go produit était donc :

```go
left := one < 0
right := expensiveCheck(two) // toujours exécuté ❌
result := left || right
```

Sur les projets 06 et 08 (`one < 0 || two < 0`), la sortie restait identique, car le côté droit n'a pas d'effet : le bug était invisible dans les exemples fournis. Il a été corrigé (commit `e0ec6cb`) puis vérifié avec une variante où le côté droit contient un appel (voir le README du projet 09).

**Correction** : quand le côté droit a des préparations, elles sont placées dans un `if` qui ne s'exécute que si le côté gauche ne suffit pas. Quand il n'en a pas, on garde l'opérateur Go natif, qui court-circuite déjà.

**Leçon** : une sortie identique sur les exemples fournis ne suffit pas à prouver qu'une traduction est juste. On a donc ajouté des variantes absentes des exemples (listées dans chaque README de projet).

## 3. Déstructuration de paramètre

| Piste | Problème | Décision |
|---|---|---|
| Changer la signature Go en `func(one, two, divisor float64)` | `map` appelle le callback avec **un** élément (le tuple). La signature ne correspond plus au type attendu | ❌ |
| **Recevoir le tuple, lier chaque nom au début du corps** | Un nom déconstruit mais inutilisé déclenche l'erreur Go « declared and not used » | ✅ **Retenu** |

L'association position → nom est exactement celle du motif TypeScript, et les trous sont ignorés. Comme le tuple est un tableau Go `[3]float64` (problématique 07), l'accès `tuple[2]` est vérifié à la compilation.

## 4. Vision à long terme

- **Variables inutilisées** : émettre `_ = name` pour les noms liés mais jamais lus, ou ne pas les lier du tout, ce qui demande une analyse d'usage.
- **Déstructuration complète** : objets (`{ a, b }` → champs de struct), valeurs par défaut (`if` sur `JSUndefined`), reste (`...rest` → découpage `tuple[2:]`) et imbrication. Le même schéma « recevoir puis lier » s'y applique.
- **Vérité JavaScript** : `if (nombre)` ou `if (objet)` est aujourd'hui refusé explicitement. Une fonction `truthy` choisie à la compilation selon le type (`!= 0 && !NaN` pour un nombre, `!= ""` pour une chaîne) permettrait de les traduire sans réflexion.
