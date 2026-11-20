# Historique des réflexions · 05 Erreurs identifiées

## 1. Comment représenter un échec ?

| Piste | Avantages | Problèmes | Décision |
|---|---|---|---|
| **A. `(T, error)`**, l'idiome Go | Familier pour un développeur Go | L'échec n'est plus une valeur : on ne peut pas le ranger dans un tableau de résultats (`map`, `group`). Contexte retrouvé par `errors.As`. Interface, donc allocation. Mesuré ≈ 3,5× plus lent | ❌ |
| **B. Un type Go par information** (`LeftNegativeOperand`, `LeftDivisionByZero`) | Exhaustif, aucune comparaison de chaîne | Explosion du nombre de types. Une `rightPipe` qui combine N fonctions produit des unions de plus en plus larges. L'affichage doit tout de même restituer la chaîne | ❌ |
| **C. `Left[T]{Information, Value}`** | Un seul type générique, qui suit le modèle de `EitherSuccess[T]` | Une comparaison de chaîne quand plusieurs informations partagent un membre | ✅ **Retenu** |

**Justification de C** : c'est la représentation **la plus fidèle à l'exécution JavaScript**, où l'information est une chaîne portée par l'objet. Le type littéral `"negative-operand"` n'existe qu'à la compilation : on s'en sert pour **générer** le code, pas pour le stocker.

## 2. Une première version qui perdait le contexte

Lors de la première implémentation de `whenIsRightOtherwise` (projet 07), la fonction `otherwise` recevait **le résultat entier** et non la valeur de l'échec. Ça marchait sur l'exemple (`() => [-12]` ignore son argument), mais pas avec la sémantique DuploJS. On s'est alors fixé une règle, appliquée partout : **un traitement reçoit la valeur interne, et seulement s'il déclare un paramètre.**

## 3. `matchInformation` : où placer le test ?

| Piste | Problème | Décision |
|---|---|---|
| Comparer `Information` sur **tous** les résultats (`if r.Information == "success"`) | Comparaison de chaîne inutile pour un `Success`, dont l'information est fixe | ❌ |
| Utiliser l'étiquette seule | Faux dès que deux `Left` partagent un membre (projet 07) | ❌ |
| **Étiquette, puis chaîne seulement si nécessaire** | — | ✅ |

Les informations possibles de chaque membre sont **lues dans les types** (`Left<"division-by-zero", 0>` → `"division-by-zero"`). Conséquences :

- un membre qui n'a qu'une information possible n'a **aucun** test de chaîne (projet 06) ;
- seuls les traitements qui peuvent s'appliquer à un membre y sont générés, sans code mort ;
- si le résultat change de type, le Go généré s'adapte automatiquement.

## 4. Fusion des `Left`

Au projet 07, `rightPipe(add(...), divide)` combine `Left<"negative-operand", number>` et `Left<"division-by-zero", 0>`. Le littéral `0` est un `number`, donc les deux deviennent `Left[float64]`. L'union canonique (problématique 02) les **dédoublonne** : 2 membres au lieu de 3. Si les valeurs avaient des types différents (`Left<"x", string>`), on obtiendrait deux membres distincts, et le mécanisme reste le même.

## 5. Vision à long terme

- **Informations internées** : remplacer la chaîne par une constante entière (`uint16`) générée pour chaque information du programme, avec une table de correspondance pour l'affichage. La comparaison devient un test d'entier. À mesurer : les chaînes courtes se comparent déjà très vite (longueur, puis `memcmp`).
- **Exhaustivité vérifiée** : TypeScript vérifie déjà que chaque information est traitée. Côté Go, ajouter un `default: panic("unreachable")` documenterait l'invariant.
- **Interopérabilité** : à la frontière avec du code Go existant, générer des adaptateurs `Left → error` pour exposer une API idiomatique sans changer la représentation interne.
