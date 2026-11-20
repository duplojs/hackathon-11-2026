# Historique des réflexions · 02 Unions étiquetées

## 1. Point de départ : un seul type de retour

L'exemple de départ fourni avec le transpileur ne retournait qu'un `Success<number>`, traduit par une struct générique `EitherSuccess[T]`. Le projet 01 annonce `Success<number> | Fail` : il fallait une représentation d'union avant d'aller plus loin.

## 2. Pistes explorées

| Piste | Principe | Problèmes constatés | Décision |
|---|---|---|---|
| **A. `any`** | Retourner `interface{}` et tester avec des assertions | Plus aucun typage côté Go. Chaque lecture demande une assertion qui peut paniquer. Allocation sur le tas | ❌ Une première version des `Either` l'utilisait (interfaces `eitherRight` / `eitherLeft` + `any`), abandonnée |
| **B. Interface scellée** | `interface{ isEither() }` + `switch v := x.(type)` | Idiomatique, mais **une allocation par résultat** et un appel indirect. Mesuré : ≈ 8× plus lent pour produire 1 024 résultats | ❌ |
| **C. Struct nommée par union** | `type AddResult struct { IsFail bool; Fail …; Success … }` | Lisible, mais deux unions équivalentes (`A \| B` déclarée à deux endroits) deviennent deux types Go **incompatibles**. Le nombre de types générés explose | ❌ |
| **D. `UnionN` générique + ordre canonique** | `Union2[T0, T1]{Tag, V0, V1}` | La taille est la **somme** des membres et non le maximum | ✅ **Retenu** |

### Pourquoi D l'emporte

- **Typage conservé** : chaque membre garde son type Go exact (`EitherSuccess[float64]`, `EitherFail`). Le compilateur Go vérifie tout.
- **Assignabilité** : comme les membres sont triés dans un ordre canonique, `Success<number> | Fail` et `Fail | Success<number>` sont **le même type Go**. Sans cela, `const other: Fail | Success<number> = result` ne compilait pas.
- **Valeur et non pointeur** : l'union reste sur la pile et se copie sans allocation (0 alloc/op mesuré).
- **Test en O(1)** : `Tag == 1`, sans inspecter la valeur.

### Le compromis assumé

La taille d'une `UnionN` est la somme de ses membres. Pour `Fail | Success<number>`, cela reste négligeable (16 octets ici, 48 avec les clés DuploJS du vrai runtime). On a aussi réordonné les champs vides (`JSNull`) en tête de struct : Go ajoute un octet de remplissage après un champ de taille nulle placé **en dernier**. `EitherSuccess[float64]` passe ainsi de 32 à 24 octets (mesuré avec `unsafe.Sizeof`).

## 3. Plusieurs chemins de retour (projet 04)

**Première approche** : `fail` n'était géré que comme **type** (projet 01, où il n'apparaît que dans la signature). Au projet 04, `return DEither.fail()` dans un `if` faisait échouer la traduction (`un-support-node`).

**Approche retenue** : `fail()` devient une expression à part entière (`EitherFailOf()`), et c'est **`placeValue`** qui l'insère dans l'union. `placeValue` compare le type de la valeur au type attendu (signature annotée **ou** type inféré par le checker) et choisit le membre. Le mécanisme fonctionne pour 2, 3 ou N membres, avec ou sans annotation, pour `return` comme pour l'initialisation d'une variable typée.

**Une seule source de vérité** : une annotation (`UnionTypeNode`) et un type calculé par le checker passent par **les mêmes** transformers de types. Une union écrite à la main et une union inférée produisent donc exactement le même type Go. C'est ce qui garantit que les étiquettes coïncident entre déclaration et `return`.

## 4. Gardes de type et rétrécissement

| Piste | Problème | Décision |
|---|---|---|
| Fonction runtime `IsRight(x any) bool` | Retour à `any`, introspection à l'exécution | ❌ |
| Cas particulier « si la fonction s'appelle `isRight` » | Fragile : ne marche que pour cette fonction | ❌ |
| Utiliser le **prédicat de type** (`input is Extract<Input, Right>`) fourni par le checker | — | ✅ |

Chaque membre de l'union est classé **une fois, à la compilation**. Si aucun membre ne correspond, la condition devient `false`. Si tous correspondent, elle devient `true`, et l'argument est quand même évalué (`_ = …`) pour garder ses effets. La méthode s'appliquera à **toute** autre garde de type, sans code spécifique.

Pour le **rétrécissement**, la variable Go garde son type union : le transformer d'identifiant compare le type déclaré au type rétréci à cet endroit et lit directement le bon champ (`result.V1`).

## 5. Vision à long terme

- **Unions volumineuses** : au-delà d'un seuil (à mesurer par benchmark), stocker les gros membres par pointeur, ou partager un même champ entre membres de même représentation, pour que la taille s'approche du *maximum* des membres plutôt que de leur somme.
- **Nommer les unions récurrentes** : émettre `type AddResult = Union2[…]` (alias, donc toujours assignable) pour améliorer la lisibilité du Go généré sans perdre la compatibilité.
- **Généraliser la conversion entre unions** : la conversion d'une sous-union vers une union plus large, et le rétrécissement vers une sous-union, sont déjà générés (`createUnionConversion` : chaque membre source est replacé dans son membre cible). L'étape suivante serait de factoriser ces conversions en fonctions nommées et réutilisées, au lieu de les générer en ligne à chaque usage.

## 6. Proposition de l'encadrant : `any` aux retours de fonction (19 novembre, mesurée)

Après le test global (projet 11), l'encadrant a suggéré de renvoyer `any` aux frontières de fonction. Son argument : la performance se joue à la **déclaration** des données (une struct plutôt qu'une map), pas au type de retour. Cela simplifierait beaucoup le transpileur, au prix d'une assertion de type à l'utilisation. Le projet 11 montre bien le coût actuel : un seul `return checkedUsername` dans `main` produit quatre types d'union et trois conversions en ligne.

Plutôt que de trancher par principe, nous avons mesuré la même fonction `add` avec quatre représentations ([`benchmark-any/`](benchmark-any/)) :

| Cas | Union étiquetée | `any` + assertion | Interface | `any` + pointeur |
|---|---|---|---|---|
| Fonction non mise en ligne | **3,1 ns, 0 alloc** | 9,1 ns, 1 alloc | 11,2 ns, 1 alloc | 7,0 ns, 1 alloc |
| Fonction appelée à travers une variable, comme dans le code généré (`callee := add`) | **3,2 ns, 0 alloc** | 9,0 ns, 1 alloc | — | — |
| Petite fonction que Go met en ligne | 1,1 ns, 0 alloc | 1,0 ns, 0 alloc | — | — |

Machine : Apple M4, macOS, Go 1.27. Une seconde mesure sur Intel Xeon 2,1 GHz (Linux, Go 1.24) donne les mêmes rapports (union environ 3 fois plus rapide hors mise en ligne), avec un écart plus marqué en faveur de `any` une fois mis en ligne (2 ns contre 10 ns). Reproduction : `go test -bench . -benchmem ./02-unions-etiquetees/benchmark-any`.

**Lecture** :

- l'encadrant a raison dans un cas : quand Go met la fonction en ligne, il voit le type réel et supprime l'allocation. `any` rattrape alors l'union (et la dépasse sur la machine Intel) ;
- mais le code généré appelle beaucoup de fonctions à travers des variables (callbacks de `pipe`, `map`, `rightPipe`). Go ne peut alors pas les mettre en ligne, et `any` coûte une allocation et environ trois fois plus de temps ;
- l'union étiquetée a un coût **stable et prévisible** dans tous les cas.

**Décision** : garder l'union étiquetée. La lourdeur relevée par l'encadrant porte sur la **taille du code généré**, pas sur la performance : la réponse est de factoriser les conversions en fonctions nommées (§ 5, « générateur d'union »), pas de revenir à `any`.
