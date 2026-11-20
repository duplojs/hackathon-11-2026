# Historique des réflexions · 03 Fonctions en valeur et `pipe`

## 1. Première version : un runtime dynamique

La première traduction de `pipe` et `map` (projet 07, puis fusionnée) reposait sur un runtime Go générique **au sens dynamique** :

```go
func Pipe(input any, functions ...any) any // chaque étape appelée via Apply
func Apply(function any, arguments ...any) any // reflect.ValueOf(function).Call(...)
```

**Pourquoi c'était tentant** : une seule fonction couvre n'importe quel nombre d'étapes et n'importe quels types. Le transpileur n'a presque rien à calculer.

**Pourquoi on l'a abandonnée** :

- **Typage perdu** : le Go généré compile même si les types ne s'enchaînent pas. L'erreur n'apparaît qu'à l'exécution, sous forme de panique `reflect`.
- **Performance** : ≈ 10× plus lent et 3,5× plus d'allocations sur un pipe de deux étapes (benchmark du dossier).
- **Contagion** : un résultat `any` force les étapes suivantes (`print`, `whenIsRight`…) à tester le type à l'exécution, alors que TypeScript le connaît déjà.

C'est l'idée directrice de tout le projet : **TypeScript a déjà fait le travail de typage, le transpileur doit l'exploiter au lieu de le refaire à l'exécution.**

## 2. Fonctions génériques passées en valeur

| Piste | Problème | Décision |
|---|---|---|
| Passer `NumberToString` directement | Impossible si la fonction Go est générique (`EitherSuccessOf[T]`, `Coalescing[T]`) : Go exige l'instanciation | ❌ |
| Instancier avec le type **déclaré** de la fonction | Le type déclaré est générique (`<T>(value: T) => …`), il n'y a donc rien à instancier | ❌ |
| Instancier avec le type **attendu** à cet endroit (`getContextualType`) | Demande une fonction du transpileur pour chaque fonction DuploJS passée en valeur | ✅ **Retenu** (`createFunctionValue`) |

Exemple : dans `DArray.map(values, DString.to)`, le checker sait que `map` attend `(value: number) => string`. On génère `func(value float64) string { return NumberToString(value) }`. Le même `DString.to` passé ailleurs, sur des chaînes, produit une autre fonction littérale, chacune parfaitement typée.

Ce mécanisme a aussi corrigé un bug de l'exemple de départ fourni avec le transpileur : `EitherSuccessOf` était utilisé sans instanciation, et le Go ne compilait pas.

## 3. `pipe` : runtime ou déroulage ?

| Piste | Problème | Décision |
|---|---|---|
| `Pipe` dynamique (V1) | Voir §1 | ❌ |
| `Pipe2[A, B, C]`, `Pipe3[A, B, C, D]`… générés par arité | Typé, mais ajoute une couche d'appel et un runtime par arité | ❌ Inutile |
| **Déroulage** : `step2(step1(input))` | Aucun | ✅ **Retenu** |

Le pipe n'existe plus à l'exécution. Le Go généré est celui qu'un développeur aurait écrit à la main.

## 4. Formes curryfiées

`DEither.whenIsRight(fn)`, `DArray.map(fn)` ou `DEither.whenIsRightOtherwise(f, g)` appelés avec une partie des arguments deviennent une **fermeture Go** typée qui capture les fonctions et attend l'entrée. Le type de cette entrée est donné par le contexte (l'étape précédente du pipe).

**Limite rencontrée** : `const matcher = DEither.matchInformation({...})` rangé seul dans une variable. TypeScript type alors son entrée `unknown`, sans représentation Go possible. On le traduit quand il est utilisé directement (dans un `pipe` ou un `map`), et on émet une erreur explicite sinon. On préfère refuser plutôt que de générer du `any`.

## 5. Callbacks écrits sur place

- Les types des paramètres viennent du checker (paramètre non annoté : type déduit du contexte).
- Un callback garde son **nombre réel de paramètres** : `() => "échec"` est appelé sans argument, même si DuploJS lui en fournirait un.
- Les captures (`(value) => divide(value, divisor)`) deviennent des fermetures Go, avec la même sémantique qu'en JavaScript.

## 6. Vision à long terme

- **Inlining** : pour un callback littéral utilisé une seule fois, émettre son corps directement à la place de la fermeture. Le compilateur Go le fait souvent déjà ; à vérifier avec `-gcflags=-m`.
- **Mise en cache des instanciations** : générer une seule fonction littérale par couple (fonction DuploJS, type attendu) au niveau du paquet, au lieu d'une par usage.
- **Fonctions génériques de l'utilisateur** : appliquer le même principe (instanciation par type contextuel) aux fonctions génériques écrites dans le projet source, pas seulement à celles de DuploJS.
