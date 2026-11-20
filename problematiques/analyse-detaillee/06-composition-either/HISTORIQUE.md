# Historique des réflexions · 06 Composition d'`Either`

## 1. `rightPipe` : comment s'arrêter au premier échec ?

| Piste | Problème | Décision |
|---|---|---|
| **`if` imbriqués** : `if ok1 { r2 := f2(); if ok2 { … } }` | Pyramide qui s'approfondit à chaque étape. Le résultat doit être affecté à chaque niveau | ❌ |
| **Runtime `RightPipe(input any, steps ...any)`** | Même problème que le `Pipe` dynamique (problématique 03) : `any` et `reflect` | ❌ Première version |
| **`goto` vers une étiquette de sortie** | Correct, mais un `goto` ne peut pas sauter par-dessus une déclaration de variable en Go, et le code devient peu lisible | ❌ |
| **Fonction anonyme appelée immédiatement + `return` anticipé** | Un appel de fonction en plus, supprimé par l'inlining du compilateur (vérifié, voir §4) | ✅ **Retenu** |

Le Go obtenu est plat et ressemble à ce qu'un développeur Go écrirait (`if err != nil { return err }`). Le même schéma sert à `group` (problématique 08) et aux variantes asynchrones (problématique 09).

**Détails de sémantique vérifiés** :

- l'entrée et **toutes** les fonctions sont évaluées **avant** le pipe, comme les arguments d'un appel JavaScript ;
- l'étape reçoit la **valeur** du `Success` et non le `Success` entier ;
- une étape qui retourne une valeur simple (`(q) => q * 10`) est enveloppée dans un `Success`. Si la dernière étape a déjà le type du résultat, elle est retournée telle quelle.

## 2. `whenIsRightOtherwise` : une première version trop spécifique

Au projet 05, les deux branches (`DArray.coalescing` et `() => [-12]`) produisent **par hasard** le même type, un tuple `[1]float64`. Une version naïve qui supposerait ce type commun passerait l'exemple, mais échouerait dès qu'une branche renvoie une chaîne et l'autre un nombre.

**Approche retenue** : on demande au checker le type de l'expression entière.

- Si les deux branches ont la même représentation Go, on garde ce type directement (sans union inutile).
- Sinon, le checker donne une union (`number | string`), traduite en `Union2`. Chaque branche y est placée par `placeValue` (projet 09 : `[]string | [1]string`).

## 3. Une seule représentation de `Right`

Pour savoir quoi transmettre à `f`, le transpileur doit trouver **la** représentation Go du `Right` dans l'union d'entrée. Si l'entrée contient deux `Success` de types Go différents (`Success<number> | Success<string>`), `f` devrait accepter les deux. On émet alors une **erreur explicite** plutôt que du code approximatif.

## 4. Vision à long terme

- **Plusieurs représentations de `Right`** : générer un appel de `f` par membre `Right`, ce qui n'est possible que si `f` est elle-même générique ou surchargée côté TypeScript.
- **Fusion des pipes successifs** : `pipe(rightPipe(...), whenIsRight(...))` pourrait être généré comme une seule fonction avec retours anticipés, au lieu de deux.
- **Coût de la fonction anonyme, vérifié** : `go build -gcflags=-m ./06-composition-either/exemples` affiche `inlining call to calculate.func3` (le pipe) ainsi que pour ses deux étapes. Sur cet exemple, la fonction anonyme et les fermetures **disparaissent donc à la compilation**. Il reste à mesurer le comportement sur un pipe long, où le budget d'inlining du compilateur peut être dépassé.
