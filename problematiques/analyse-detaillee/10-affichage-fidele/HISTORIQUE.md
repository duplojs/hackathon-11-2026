# Historique des réflexions · 10 Affichage fidèle

## 1. Pourquoi l'affichage est une vraie problématique

C'est notre **oracle** : pour chaque projet, on compare la sortie de `go run` à celle de `tsx`, octet par octet. Si l'affichage n'est pas exact, on ne peut rien prouver sur le reste. Un affichage approximatif masquerait aussi de vraies erreurs de calcul (`0.1 + 0.2`, problématique 01).

## 2. Pistes explorées pour `print`

| Piste | Problème | Décision |
|---|---|---|
| `fmt.Println` | Format Go (`{{} 3}`, `1e-07`, `[3]`) | ❌ |
| `encoding/json` + les tags de struct DuploJS | Proche, mais pas le format Node (guillemets doubles, pas d'espaces, pas de `undefined`, pas de passage à la ligne à 80 colonnes) | ❌ |
| Inspecteur générique par **réflexion** (`reflect.ValueOf(x).Kind()`) | Fonctionne pour tout, mais réintroduit `any` et `reflect` | ❌ |
| **Inspecteurs composés à la compilation** d'après le type TypeScript | Il faut un inspecteur par forme de type | ✅ **Retenu** |

Le type de l'argument de `print` est connu. Le transpileur **compose** donc l'inspecteur : `Success<number>[]` → `InspectSlice(InspectEitherSuccess(InspectNumber))`. C'est le même principe que pour `pipe` ou `isRight` : ce que TypeScript sait, on ne le recalcule pas à l'exécution.

## 3. `Number::toString`

**Piste naïve** : `strconv.FormatFloat(x, 'f', -1, 64)` ou `fmt`. Elle est juste pour `3` ou `0.5`, mais fausse pour `1e21` (21 zéros au lieu de `1e+21`), pour `1.5e-7` (`0.00000015`), et avec `fmt` pour `123456789012` (`1.23456789012e+11`).

**Version retenue** : on sépare deux problèmes.

1. **Quels chiffres ?** Le plus court nombre de chiffres qui redonne exactement le même `float64`. Go le calcule déjà (`'e', -1`), avec le même critère que JavaScript.
2. **Quelle mise en forme ?** Les règles de la spécification ECMAScript (position de la virgule `n` : entier si `k ≤ n ≤ 21`, décimal si `0 < n ≤ 21`, `0.000…` si `-6 < n ≤ 0`, sinon exponentiel avec `e+` / `e-` sans zéro de tête).

**Validation** : un test différentiel sur ~200 000 valeurs aléatoires donne **0 différence** avec le moteur JavaScript. C'est plus convaincant qu'une liste de cas choisis à la main.

**Nuance découverte** : `DString.to(-0)` vaut `"0"`, alors que `print(-0)` affiche `-0`, parce que `util.inspect` traite le zéro négatif à part. Ce sont deux fonctions différentes côté Go (`NumberToString` et `InspectNumber`).

## 4. Correction en cours de route

Une union de chaînes littérales (`"oui" | "non"`) s'affichait **avec** des guillemets, parce que le test « est-ce une chaîne de premier niveau ? » portait sur le type TypeScript (une union) et non sur la représentation Go (`string`). Le test porte désormais sur la représentation Go. C'est la même leçon que pour les unions (problématique 02) : **décider à partir de la représentation Go**, qui est canonique.

## 5. Limites et vision

- Non reproduits : le regroupement en colonnes des tableaux de plus de 6 éléments, la limite de 100 éléments et la profondeur maximale (`[Object]`).
- **Tests différentiels généralisés** : appliquer la même méthode (génération aléatoire, puis comparaison avec Node) à `util.inspect` sur des structures imbriquées aléatoires, pour couvrir le passage à la ligne à 80 colonnes.
- **Performance** : `print` construit des chaînes intermédiaires. Écrire dans un `strings.Builder` partagé éviterait des allocations, si l'affichage devenait un goulot d'étranglement.

## 6. Chaînes de caractères et expressions régulières (projet 11)

Le test global du projet 11 (validation d'un nom d'utilisateur) a ajouté trois opérations sur les chaînes, avec des entrées choisies pour viser chaque piège.

| Opération | Piège | Traduction retenue |
|---|---|---|
| `DString.length` | JavaScript compte des unités UTF-16 (`"é"` vaut 1, un emoji vaut 2). `len()` en Go compte des octets (`"é"` vaut 2, un emoji vaut 4) | `StringLength` parcourt les caractères et compte 2 au-delà du plan de base (code > 65535) |
| `DString.test(value, /[0-9]/)` | Compiler la regex à chaque appel coûterait cher | `regexp.MustCompile` dans une variable de package : compilée une seule fois au chargement |
| `DString.includes` | — | `strings.Contains` |

Entrées testées : `"test"`, `"test1"`, `"te@st"`, `"élodie"` (6), `"😀ab"` (4), `"a1@b"` (le premier `if` doit l'emporter) et `""`. Sortie identique à `tsx` pour les 7, sans modifier le transpileur.

**Limite** : le moteur Go (RE2) ne prend pas en charge toute la syntaxe JavaScript, par exemple les références arrière (`\1`) et les assertions avant ou arrière (`(?=…)`, `(?<=…)`). Une traduction complète devrait refuser ces expressions avec une erreur explicite, conformément au principe « refuser plutôt qu'approximer ».
