# Historique des réflexions · 01 Nombres et ordre d'évaluation

## 1. Quel type Go pour `number` ?

| Piste | Avantages | Problèmes | Décision |
|---|---|---|---|
| `int` / `int64` | Rapide, naturel pour `1 + 2` | `7 / 2` vaut `3` au lieu de `3.5`. Le dépassement se produit à 2⁶³ au lieu d'une perte de précision au-delà de 2⁵³. Pas de `NaN`, `Infinity` ni `-0` | ❌ Sémantique fausse |
| `int` quand le littéral est entier, `float64` sinon | Code plus « joli » | Il faudrait prouver qu'une valeur reste entière à travers toutes les opérations, ce qui demande une analyse d'intervalles. Une seule division casse tout | ❌ Trop risqué pour le gain |
| `math/big.Float` | Précision arbitraire | C'est justement **plus précis** que JavaScript, donc faux, en plus d'être lent | ❌ |
| `float64` | Format identique (IEEE 754 binaire 64) | Code moins idiomatique pour des compteurs | ✅ **Retenu** |

**Justification** : la priorité est l'équivalence observable. `float64` reproduit exactement les arrondis, `NaN`, `±Infinity` et `-0`.

## 2. Le piège des constantes Go (découvert en comparant les sorties)

Première version : les littéraux étaient émis tels quels (`one + two` avec `one = 1`). Quand on a comparé octet par octet les sorties de `tsx` et de `go run`, `0.1 + 0.2` affichait `0.3` côté Go.

**Cause** : en Go, une expression composée uniquement de constantes est calculée **à la compilation, avec une précision exacte**. Elle n'est arrondie en `float64` qu'à la fin. `-0.0` est aussi la constante `0`, ce que l'outil d'analyse `staticcheck` signale (SA4026).

**Correction** : les opérandes des opérateurs binaires et unaires passent par une variable typée (`operand := float64(0.1)`), ce qui force un calcul `float64` à l'exécution.

**Leçon** : la comparaison automatique des sorties avec la version TypeScript est notre filet de sécurité principal. Elle a été appliquée à tous les projets (sortie identique octet par octet).

## 3. Préserver l'ordre d'évaluation

| Piste | Problème | Décision |
|---|---|---|
| Recopier l'expression (`counter + bump()`) | Ordre non spécifié en Go. Mesuré : **22** avec Go 1.27 contre **12** en JavaScript | ❌ |
| Ne créer des temporaires que si une sous-expression a des effets | Il faut analyser les effets de bord, ce qui est impossible en général (appels de fonctions importées) | ❌ Pour l'instant |
| Mise en ANF systématique : chaque sous-expression non triviale dans une variable | Go généré plus verbeux | ✅ **Retenu** |

**Pourquoi la verbosité n'est pas un problème** :

- **Performance** : le compilateur Go passe en forme SSA et supprime les variables temporaires. Le code machine est le même qu'avec l'expression imbriquée.
- **Lisibilité** : les temporaires portent un nom dérivé de leur rôle (`callee`, `argument`, `left`, `right`, `checkedResult`…) au lieu de `tmp1`, `tmp2`. Voir le commit « donner des noms explicites aux variables ».
- **Composition** : c'est ce contrat `{ before, result }` qui a permis d'ajouter ensuite le ternaire, le court-circuit `&&` / `||`, `pipe` ou `rightPipe` sans changer le reste du transpileur (voir la problématique 04).

## 4. Vision à long terme

- **Analyse de pureté** : marquer les expressions sans effet (littéraux, identifiants `const`, fonctions DuploJS pures) permettrait d'émettre des expressions imbriquées quand l'ordre n'a pas d'importance, pour un Go plus idiomatique.
- **Spécialisation entière** : une passe d'optimisation pourrait traduire en `int` les compteurs de boucle dont l'intervalle est prouvé, comme le font les moteurs JavaScript (V8 « Smi »).
- **Tests différentiels** : générer des expressions arithmétiques aléatoires, les exécuter avec `tsx` et `go run`, et comparer les sorties (*fuzzing* différentiel).

## 5. Limite relevée : `%` et opérateurs bit à bit

En relisant `src/transpiler/transformers/expression/binary.ts`, nous avons constaté que `%` est traduit par l'opérateur Go `%`. Or, en Go, `%` n'existe pas pour les `float64` :

```text
invalid operation: operator % not defined on a (variable of type float64)
```

Aucun projet n'utilise `%`, donc le problème ne s'est pas montré. **Correction proposée** : traduire `a % b` par `math.Mod(a, b)`, qui donne le même résultat que JavaScript (`5.5 % 2` vaut `1.5` dans les deux cas, vérifié).

Même remarque pour `&`, `|`, `^`, `<<` et `>>` : JavaScript convertit d'abord les opérandes en entiers 32 bits. Une traduction fidèle passerait par une conversion explicite (`float64(int32(a) & int32(b))`), avec le même comportement de dépassement que JavaScript.
