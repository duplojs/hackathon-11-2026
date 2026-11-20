# ADR-8 : ternaire et court-circuit

- **Statut :** accepté (PLAN §0.6), implémenté au Sprint 3
- **Date :** 2026-11-17
- **Code :** [`expression/conditional.ts`](../../src/transpiler/transformers/expression/conditional.ts), [`expression/binary.ts`](../../src/transpiler/transformers/expression/binary.ts)
- **Corrige :** D2 (`&&` et `||` évaluaient toujours l'opérande de droite)

> Légende : **[observé]** = exécuté ou mesuré, la preuve est citée ; **[à vérifier]** = raisonnement non encore vérifié.

---

## 1. Contexte

- L'exercice 06 contient `one < 0 ? one : two` et `one < 0 || two < 0`.
- Go n'a **pas d'opérateur ternaire**.
- Le transformer des expressions binaires sortait **chaque opérande** dans une variable (`a := …; b := …; a || b`), pour conserver l'ordre d'évaluation quand un opérande a des préparations (`before`). Pour `&&` et `||`, cela évaluait la droite **même quand JS ne l'évalue pas** (D2) : un appel à droite produisait son effet à tort.

## 2. Décision

| Forme | Traduction Go | Pourquoi |
|---|---|---|
| `c ? a : b` | `before(c)` ; `var t T` ; `if c { before(a) ; t = a } else { before(b) ; t = b }` | Les préparations de chaque branche restent **dans** leur branche : `a` et `b` ne sont jamais évalués tous les deux. T est le type Go du ternaire (type de base des littéraux) ; chaque branche est convertie vers T (`coerceExpression`). |
| `a && b`, `a \|\| b`, **sans** `before` à droite | `t := a ; t && b` (opérateur natif) | Go court-circuite comme JS. Seule la sortie de `b` dans une variable posait problème. |
| `a && b`, `a \|\| b`, **avec** `before` à droite | `t := a ; if t { before(b) ; t = b }` (`&&`) ; `if !t { … }` (`\|\|`) | La droite, et ses effets, ne sont évalués que si nécessaire. |
| `x \|\| défaut` sur des valeurs **non booléennes** | erreur `logical-operator-on-non-boolean-values-not-supported` | En JS, l'opérateur renvoie la **valeur** d'un opérande (« truthiness »). Ce n'est utilisé dans aucun exercice. |

## 3. Résultats [observé]

- Exercice **06 ✅**. Go produit pour `add` (extrait) :

```go
Generated_24 := Generated_22 < Generated_23
if !(Generated_24) {
	Generated_25 := Sourced_two
	Generated_26 := (float64)(0)
	Generated_24 = Generated_25 < Generated_26
}
if Generated_24 {
	…
	var Generated_30 float64
	if Generated_28 < Generated_29 {
		Generated_30 = Sourced_one
	} else {
		Generated_30 = Sourced_two
	}
	Generated_31 := Generated_30
	return shard_dependencies.EitherLeftOf[float64](Generated_27, Generated_31)
}
```

- Variante `06-short-circuit` ✅ : `traced("a", true) || traced("b", …)` n'évalue jamais `b`, et `traced("c", false) && traced("d", …)` jamais `d`.
- Variante `06-ternary-lazy` ✅ : seule la branche choisie affiche « évalué : … ».

## 4. Limites

- `||` et `&&` sur des valeurs non booléennes (repli par « truthiness ») : non pris en charge (voir §2).
- `??` (coalescence des nuls) et `?.` : non pris en charge.
- Dans `one < 0 || two < 0`, la droite a des préparations, parce que le transformer binaire sort ses opérandes dans des variables. On obtient donc la forme `if` alors qu'un `||` natif aurait suffi. C'est correct, mais plus verbeux qu'un humain. **[à vérifier]** : le compilateur Go produit le même code machine (non mesuré).
