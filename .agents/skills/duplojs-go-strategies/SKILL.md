---
name: duplojs-go-strategies
description: Règles de l'équipe pour traduire les constructions DuploJS/TypeScript des projets 00 à 11 en Go performant et fidèle — représentations Go, sémantique à préserver, méthode de travail par exercice, validation et documentation. À utiliser avant de concevoir ou d'implémenter un transformer pour un exercice de `projects/`, et pour rédiger sa documentation.
---

# Stratégies de traduction DuploJS → Go

Ce skill complète `typescript-to-go` (architecture du transpileur : listes, routeurs, handlers, `before`, shared dependencies), `go-ast` et `go-printer`. Il ne répète pas leurs règles : il fixe **quoi** produire en Go et **comment le justifier**. En cas de conflit sur l'architecture, `typescript-to-go` fait foi.

Chaque règle porte un statut :

- **[Décidé]** : choix validé par l'équipe, à appliquer.
- **[Proposé]** : recommandation argumentée, à confirmer en équipe avant de s'en écarter ou de la généraliser.

Quand un choix change, mettre à jour ce fichier avant le code : il sert de mémoire commune à l'équipe et à ses agents.

## 1. Principes directeurs

1. **Le comportement d'abord, mesuré contre Node.** Le programme Go doit produire les mêmes effets observables que `tsx projects/XX/index.ts` : sorties, ordre des effets, valeurs et variantes des résultats. Toute divergence est soit corrigée, soit documentée comme limite.
2. **Typer statiquement plutôt que `any`.** Le checker TypeScript connaît le type de chaque expression : s'en servir pour choisir une représentation Go concrète. `any`/`interface{}` n'est autorisé que si aucun type concret n'existe (union hétérogène ouverte, valeur réellement dynamique) et doit être justifié dans la documentation de l'exercice : il préserve le comportement mais fait perdre le bénéfice recherché (boxing, allocation, assertions à l'exécution).
3. **Valeurs plutôt que pointeurs, pile plutôt que tas.** Préférer les structs passées par valeur, les tableaux de taille fixe, les slices préallouées. Éviter ce qui fait s'échapper une valeur vers le tas (interface, closure capturante, pointeur retourné) sans raison.
4. **Résoudre la composition à la compilation.** Les combinateurs DuploJS (`pipe`, `whenIsRight`, `rightPipe`, `map`…) sont des fonctions d'ordre supérieur en JS. Quand l'appel est statiquement connu, les **déplier** en instructions Go (`if`, `for`, `switch`) plutôt que d'émettre des closures et un runtime générique. Un helper générique en shared dependency n'est utilisé que lorsque le dépliage est impossible ou que la fonction est passée comme valeur.
5. **Générique, pas spécifique à l'exemple.** Un handler traduit une *opération* DuploJS dans toutes ses formes valides (data-first / data-last, fonction en ligne / référence / fonction importée, alias d'import), pas les valeurs de l'exemple. Lister les variations étudiées dans la doc.
6. **Ordre d'évaluation et effets préservés.** Hériter de la règle `before` de `typescript-to-go`, et en plus : ne jamais sortir d'une branche conditionnelle les préparations qui n'appartiennent qu'à elle (voir §4).

## 2. Représentations des types

| TypeScript / DuploJS | Go | Statut | Justification |
|---|---|---|---|
| `number`, littéraux, unions de littéraux, nombre brandé `number & DNumber.Positive` | `float64` | [Décidé] (projet 00, `type/float.ts`) | IEEE 754 double, identique à JS. La contrainte DuploJS n'existe que dans les types. |
| `string` | `string` | [Décidé] | Chaînes immuables des deux côtés. Attention : JS compte en unités UTF-16, Go en octets ou en runes (voir `DString.length`, §11). |
| `boolean` | `bool` | [Proposé] | Pas encore de transformer de type : une fonction qui **renvoie** `boolean` n'est pas traduite (`BooleanKeyword` → `notfound-transformer`). À ajouter (`type/bool.ts`). |
| `T[]` | `[]T` | [Décidé] (`type/array.ts`, `expression/arrayLiteral.ts`) | Slice ; préallouée avec `make([]T, n)` quand la taille est connue (`map`, `group`). |
| Tuple `[A, B, C]` | `shard_dependencies.Tuple3[A, B, C]` (`Tuple2` à `TupleN`, champs `V0`, `V1`…) | [Décidé] (projet 08, `type/tuple.ts`, `type/tupleSharedDependency.ts`) | Struct générique : taille et type de chaque position conservés ; `MarshalJSON` rend un tableau JSON comme `JSON.stringify`. Construction via `Tuple3Of(…)`. |
| `null` / `undefined` | `shard_dependencies.JSNull` / `JSUndefined` | [Décidé] (boilerplate) | Types vides de taille nulle. Un champ `undefined` porte le tag `omitzero` : il est omis du JSON comme avec `JSON.stringify` (projet 04, `EitherFail.Value`). |
| Types textuels : `string`, littéral, template, string brandé `string & X`, et leurs unions | `string` | [Décidé] (projet 06, `type/string.ts`) | La marque et le littéral n'existent que dans les types ; TypeScript a déjà vérifié la valeur. |
| `Promise<T>` | `T` | [Décidé] (projet 10, `type/promise.ts`) | Exécution synchrone, voir §6. Écart à corriger : `Promise` est reconnu par son nom textuel, pas par son symbole. |
| `null` en expression, `undefined` en type | `JSNull{}`, `JSUndefined` | [Décidé] (`expression/nullLiteral.ts`, `type/null.ts`, `type/undefined.ts`) | — |
| `readonly T[]` et autres opérateurs de type | type de l'opérande | [Décidé] (`type/typeOperator.ts`) | `readonly` n'existe pas à l'exécution. |

Généricité : une fonction générique Go **doit être instanciée** lorsqu'elle est utilisée comme valeur (`EitherSuccessOf[float64]`). Les arguments de type se lisent dans le checker, jamais dans le texte source. Le projet 00 fourni ne compilait pas pour cette raison ; corrigé en appelant directement les fonctions déclarées (§4), ce qui laisse Go inférer les génériques.

## 3. Représentation de l'`Either` — décision centrale

Toutes les autres traductions en dépendent : la fixer avant les exercices 01, 04 et 06.

Faits à respecter, tirés du runtime `@duplojs/lang/dist/either` :

- Une valeur Either est un objet portant `right` **ou** `left`, une `information` (string) et une `value`. `success(v)` ajoute la marque `success` et l'information `"success"` ; `fail()` ajoute la marque `fail`, l'information `"fail"` et une valeur `undefined`. `left(info, v)` et `right(info, v)` sont les formes générales.
- Une fonction peut retourner une **union** de variantes : `Success<number> | Fail`, `Left<"negative-operand", number> | Success<number>`… Le type de retour vient du checker (union inférée si non annotée).

**[Décidé] (projet 01) Interface Go `Either`, une variante = un type concret** (shared dependencies) :

```go
type Either interface { IsRight() bool }
type EitherSuccess[T any] struct { Right JSNull; Information string; Value T; Success JSNull }
func (_ EitherSuccess[T]) IsRight() bool { return true }
```

- Variantes existantes : `EitherSuccess[T]` (`success`), `EitherFail` (`fail`, projet 04), `EitherLeft[T]` (`left(information, value)` et `left(information)`, projets 06 et 11), `EitherRight[T]` (`right(information, value)`, projet 11), `EitherError[T]` (`error(value)`, projet 11). Un type Either seul (`Success<T>`, `Fail`) garde son type concret. Une union dont **tous** les membres sont des types Either devient `shard_dependencies.Either` (routeur `duploJSEitherUnionTypeTransformer`).
- Chaque variante est un type **défini** (pas un alias, sinon pas de méthode possible), avec ses tags `json`, et implémente l'interface via `createEitherMethods` (`either/sharedDependency.ts`).
- L'interface porte trois méthodes, générées pour chaque variante par `createEitherMethods` : `IsRight() bool`, `GetInformation() string`, `GetValue() any` (projet 06).
- `isRight(x)` → `x.IsRight()` ; `isLeft(x)` → `!x.IsRight()` (`either/isLeft/`). Pour lire la valeur typée d'une union : `x.GetValue().(T)`, où `T` est le type attendu donné par le checker (par exemple le paramètre du callback). Coût : boxing de la valeur et assertion à l'exécution.
- Pourquoi : Go convertit implicitement une variante vers l'interface, donc `return EitherSuccessOf(x)` compile sans connaître l'union. C'est la solution la plus simple.
- Coût accepté et documenté : allocation sur le tas à la conversion vers l'interface, appel dynamique pour `IsRight()`.
- Alternative écartée (optimisation future) : une struct plate `Either[R, L]` sans allocation. Go n'infère pas `L` depuis le type de retour attendu, donc il faudrait calculer `R` et `L` avec le checker et instancier chaque constructeur.
- **Passage à l'échelle** : [Décidé] ne jamais générer un type Go par union, ni une struct à deux paramètres `Either[R, L]`. Toute union Either, quel que soit le nombre de variantes ou de types de valeur, devient la même interface ; un nouveau constructeur DuploJS (`right`, `error`…) = une nouvelle variante via `createEitherMethods`, rien d'autre. Vérifié avec 5 variantes de 4 types de valeur différents.
- **Détecter un type Either** : [Décidé] `isEitherType` (`either/isEitherType.ts`) résout le module (`@duplojs/lang`, `dist/either/`) ou les clés de kind `@DuplojsLangEither/*`, jamais le texte du type.
- **`unwrapRight` et rétrécissement** : [Décidé] (projet 11) `unwrapRight` est un passthrough : la variable reste un `Either`. Sa déclaration est enregistrée dans `context.file.unwrappedVariables` (un `Set` de **symboles** TypeScript, `statement/variable.ts` et `common/pipe/`). Quand l'identifiant est lu à un endroit où le checker a rétréci son type à autre chose qu'un Either (après `if (isLeft(x)) return x;`), `common/identifier.ts` émet `x.GetValue().(T)`, `T` donné par le checker.

Rendu (`print`) : voir §7.

## 4. Expressions et instructions

- **Appel de fonction** : [Décidé] (projets 00, 01) arguments évalués dans l'ordre et stockés dans des temporaires. La fonction est appelée directement (sans temporaire) si c'est une déclaration de fonction, un identifiant ou un sélecteur de package (`shared/call.ts`) : Go infère alors les génériques et le code est plus court (coût d'inlining de `add` passé de 33 à 18). Écart connu : une **variable locale** contenant une fonction et réassignée pendant l'évaluation des arguments serait lue trop tard ; cas jugé marginal.
- **`const x = e`** : [Décidé] (projet 01) `Sourced_x := e`, type inféré par Go. Une seule déclaration, nom simple.
- **`if` / `else`** : [Décidé] (projet 01) condition traduite avec ses `before` placés avant le `if` ; chaque branche est un bloc traduit indépendamment, et une instruction seule est enveloppée dans un bloc avec ses `before`.
- **Ternaire `c ? a : b`** : [Décidé] (projet 06, `expression/conditional.ts`) déclaration du résultat puis `if/else`, et non un helper `ternary(c, a, b)` qui évaluerait les deux branches :
  ```go
  var t T
  if c { /* before de a */ t = a } else { /* before de b */ t = b }
  ```
  Les `before` de `a` et `b` restent **dans** leur branche. Le type `T` vient du checker.
- **`&&` / `||`** : [Décidé] (projet 06, `expression/logical.ts`, placé avant `binary` dans la liste) si l'opérande droit n'a **aucun** `before`, l'opérateur Go natif (qui court-circuite déjà) ; sinon `t := left; if t { <before>; t = right }` (`if !t` pour `||`). Le transformer binaire fourni sortait les `before` de droite avant l'opérateur.
- **Fonction fléchée** : [Décidé] (projet 06, `expression/arrowFunction.ts`) `(p) => e` → `func(p T) R { return e }`. `T` et `R` viennent du checker (le source ne les écrit souvent pas). `async` : traité comme synchrone (§6).
- **`x as T`, `x satisfies T`, `x!`** : [Décidé] traduction de `x` seul (`expression/typeAssertion.ts`) : aucun effet à l'exécution.
- **Type absent du source** : [Décidé] utiliser `transformCheckerType(type, location, context)` (`type/fromChecker.ts`) : `typeToTypeNode` du checker puis la liste des transformers de types.
- **Plusieurs `return`** : [Décidé] (projet 04) rien de spécifique. Le type de retour (annoté ou inféré) est une union Either, donc l'interface `Either`, et Go convertit implicitement chaque variante retournée. Les `before` d'un `return` restent dans son bloc.
- **Opérateurs préfixes** : [Décidé] (projet 04) `-x`, `+x`, `!x` deviennent l'opérateur Go identique (`-1` est `-` appliqué à `1`). `~x` (int32 en JS), `++x` et `--x` sont refusés.
- **Déstructuration de paramètre** : [Décidé] (projet 08, `expression/arrowFunction.ts`) un paramètre Go unique puis des déclarations en tête de corps : `([a, b]) =>` sur un tuple → `a := p.V0`, `b := p.V1` ; sur un tableau → `a := p[0]` ; `({ x, y }) =>` → paramètre struct anonyme, `x := p.X`.
- **`await e`** : [Décidé] (`expression/await.ts`) traduit par `e` (§6). **`(e)`** : traduit par `e` (`expression/parenthesized.ts`). **Déclarations de type TS** (`type`, `interface`) : ignorées à l'émission (`transformSourceFile.ts`).

## 5. Combinateurs DuploJS (dépliage)

Les formes **data-first** `f(input, …)` et **data-last** `f(…)(input)` (curryfiée, utilisée dans `pipe`) doivent être reconnues toutes les deux. Le runtime choisit la forme selon le nombre d'arguments ; le transformer décide de la même façon, d'après la signature résolue par le checker.

| DuploJS | Go généré [Décidé] (`transformers/duplojs/`) |
|---|---|
| `pipe(x, f, g)` | Déroulé étape par étape (`common/pipe/`) : chaque étape curryfiée connue (`whenIsRight`, `whenIsRightOtherwise`, `map`, `DString.test`, `unwrapRight`) est dépliée en place ; les autres appels passent par `callable.ts`. |
| `whenIsRight(e, f)` | `var out any; if e.IsRight() { out = f(e.GetValue().(T)) } else { out = e }`. Limite : `out` est typé `any` (§11). |
| `whenIsRightOtherwise(e, f, g)` | `var out R; if e.IsRight() { out = f(e.GetValue().(T)) } else { out = g(e) }`, `R` lu dans la signature de `g`. |
| `rightPipe(x, f1, f2…)` / `rightAsyncPipe` | `var acc Either = x; if acc.IsRight() { acc = f1(acc.GetValue().(T)); if acc.IsRight() { … } }` : `if` imbriqués, arrêt au premier Left. Les étapes en ligne sont des fonctions anonymes appelées sur place (inlining par Go non vérifié). |
| `matchInformation(e, {k: f})` | [Décidé] (projet 06) entrée et callbacks évalués dans l'ordre, puis `var out T; switch e.GetInformation() { case "k": out = f(e.GetValue().(P)) }` ; l'argument n'est passé que si le callback a un paramètre. |
| `group([e1, e2…])` / `asyncGroup` | Déroulé séquentiel (`either/group/`) : slice préalloué `make([]T, n)`, chaque élément évalué seulement si les précédents ont réussi, arrêt au **premier Left**. |
| `DArray.map(xs, f)` | `ArrayMap(xs, f)` en shared dependency : `make([]R, len(xs))` puis boucle, sans `append`. |
| `DArray.coalescing(v)` | `ArrayCoalescing(v)` (`array/coalescing/`) : `[]T{v}`. |
| `DString.test(s, /re/)` | `var re = regexp.MustCompile("…")` **au niveau du package**, puis `re.MatchString(s)`. |
| `DString.includes(s, x)` | `strings.Contains(s, x)`. |
| `DString.length(s)` | `float64(utf8.RuneCountInString(s))`. Écart : JS compte en unités UTF-16 (un emoji vaut 2 en JS, 1 ici) ; à corriger. |
| `DString.to(n)` pour un `number` | [Décidé] (projet 06) `NumberToString(n)` = `strconv.FormatFloat(n, 'f', -1, 64)`. Passé comme valeur → référence à `NumberToString`. Écarts : notation exponentielle de JS (≥ 1e21, < 1e-6), `Infinity`. |

Quand une fonction DuploJS est passée **comme valeur** (par exemple `DString.to` donné à `map`), émettre une référence à un helper Go **instancié** sur le type concret, ou l'inliner dans la boucle si le handler de `map` sait le faire.

## 6. Asynchronisme (projet 10)

Faits du runtime : `rightAsyncPipe` attend chaque étape **dans l'ordre** ; `asyncGroup` appelle les thunks **un par un** et s'arrête au premier Left, sans appeler les suivants ; `asyncPipe` attend chaque étape.

**[Décidé] (projet 10)** Traduire `async`/`await` par une exécution **synchrone** : une fonction `async` qui retourne `Promise<T>` devient une fonction Go qui retourne `T`, et `await e` devient `e`. Justification : l'ordre des effets et l'arrêt au premier échec sont exactement préservés, sans goroutine ni channel. Lancer les calculs de `asyncGroup` en goroutines **changerait le comportement**, puisque des calculs seraient exécutés après un échec. Limites à documenter : une vraie concurrence (I/O, `Promise.all`), un `await` dans une boucle avec des effets entrelacés, l'ordre micro-tâches / macro-tâches et le `await` au top-level à traduire dans `init`/`main`.

## 7. Sortie observable (`DCommon.print`)

`print(x)` appelle `console.info(x)` côté Node : format `util.inspect`, pas du JSON. Pour l'Either, Node affiche les clés `'@duplojs/lang/kind/@DuplojsLangEither/…'`.

**[Décidé] (projets 01, 06)** `shard_dependencies.Print[T](v) T` affiche une chaîne brute (`fmt.Println`, comme `console.info`), et toute autre valeur en JSON indenté (`json.NewEncoder(os.Stdout)`, `SetEscapeHTML(false)`, `SetIndent("", "  ")`) puis la retourne, comme `DCommon.print`. On s'appuie sur les tags `json` des variantes et sur les `MarshalJSON` de `JSNull`/`JSUndefined`, prévus par le boilerplate. On compare donc avec Node **sur la structure** (clés, valeurs, ordre) ; l'écart de format (`util.inspect` contre JSON) est une limite documentée. Reproduire `util.inspect` demanderait un formateur Go complet écrit avec les factories de l'AST, qui n'a pas de nœud « Go brut ».

## 8. Méthode de travail par exercice

1. **Lire** `projects/XX/README.md` (problématique), `index.ts` et les fichiers importés.
2. **Exécuter la référence Node** et garder la sortie :
   `node_modules/.bin/tsx projects/XX/index.ts > projects/XX/expected.txt`
3. **Analyser les variations** de chaque construction (formes d'appel, alias, types, fonction en ligne ou par référence) : la doc doit montrer que la stratégie ne se limite pas à l'exemple.
4. **Prototyper le Go à la main** dans le scratchpad, puis le compiler et l'exécuter. Décider de la forme cible *avant* d'écrire le transformer.
5. **Implémenter** les routeurs et handlers selon `typescript-to-go` : un dossier par opération dans `transformers/duplojs/<domaine>/<opération>/`, avec les shared dependencies memoïsées.
6. **Valider** :
   ```sh
   pnpm build --tsconfig projects/XX/tsconfig.json --input projects/XX/index.ts --output projects/XX/dist
   cd projects/XX/dist && go vet ./... && go run . > ../actual.txt
   diff projects/XX/expected.txt projects/XX/actual.txt
   pnpm test:types && pnpm test:lint
   ```
   Re-builder **tous** les exercices déjà faits après un changement dans un transformer partagé (non-régression).
7. **Observer la performance** quand c'est pertinent : `go build -gcflags=-m` pour les échappements vers le tas, et `go test -bench . -benchmem` sur un prototype. Distinguer ce qui a été mesuré de ce qui est supposé.
8. **Documenter** dans `projects/XX/README.md`, sous la problématique existante (§9).

Ajouter un script `build:XX` dans `package.json` pour chaque exercice traité.

## 9. Gabarit de documentation (README de l'exercice)

Garder la section « Problématique » fournie, puis ajouter :

```markdown
## Solution

### <Problème n>
Go produit (extrait réel de dist/) puis explication : représentation choisie, pourquoi, alternatives écartées et raison.

## Variations étudiées
Formes de l'opération prises en charge / refusées (data-first, data-last, référence, alias…).

## Résultats observés
Sortie Node vs sortie Go (identiques ? écarts ?). Observations mémoire/perf mesurées (commande + chiffres) ou « non mesuré ».

## Limites
Ce qui n'est pas pris en charge, pourquoi, et piste éventuelle.
```

Le README racine résume : membres (noms, prénoms, classes), stratégies transverses (renvoi à ce skill), tableau d'avancement par exercice et étapes de reproduction.

## 10. Environnement (pièges connus)

- **Windows** : le build échoue avec `missingProject`, car les chemins `DPath` sont de la forme `/C:/…` alors que l'API TypeScript attend `C:/…`. Il faut un correctif **local, non versionné** : convertir les chemins à chaque échange avec l'API TypeScript (`createTypescriptInstance.ts`, `build.ts`, `context/file.ts`, `resolvedReference.ts`), disponible en patch (`windows-paths-fix.patch`, à appliquer avec `git apply`, jamais à commiter). Linux et macOS ne sont pas concernés.
- **Lint sous Windows** : `pnpm test:lint` échoue (`tsgolint.js` n'est pas un exécutable Win32, puis le plugin `@stylistic` n'est pas résolu). Lancer le lint sous Linux, macOS ou WSL avant de fusionner.
- **pnpm 12 sous Windows** : si `pnpm` échoue avec « …\node_modules\pnpm\pnpm n'est pas reconnu », les shims `.CMD` de `%LOCALAPPDATA%\pnpm\.tools\pnpm\12.18.0\bin` doivent appeler `node_modules\@pnpm\exe.win32-x64\pnpm.exe`.
- `go.mod` généré déclare `go 1.27.4` : au premier `go run`, Go télécharge cette toolchain (lent la première fois).

## 11. État vérifié et limites connues

État de `main` après fusion de la PR n°1 :

- **Fidélité** : les 12 projets (00 à 11) compilent, passent `go vet` et produisent une sortie **identique octet pour octet** à Node. Méthode : précharger côté Node un module qui remplace `console.info` et `console.log` par `JSON.stringify(v, null, 2)` (chaînes affichées brutes), lancer `node --import tsx --import <module> projects/XX/index.ts`, puis `diff` avec la sortie de `go run .`.
- **Performance mesurée** (`go test -bench -benchmem`, Go 1.27.4 ; Node 22.19, 5 millions d'appels, médiane de 3 runs, une machine) : `add` qui renvoie un type concret, 0,49 ns et 0 allocation (Node : 464 ns) ; `add` qui renvoie une union `Either`, 18 à 21,5 ns et **1 allocation** de 24 à 32 octets (Node : 171 à 485 ns). `go build -gcflags=-m` confirme l'échappement vers le tas à la conversion vers l'interface. Coût d'inlining de `add` : 18.

Limites connues, à garder dans la documentation et la soutenance :

| Limite | Conséquence | Piste |
|---|---|---|
| Union → interface | 1 allocation par valeur d'union | Struct plate sur les chemins chauds |
| Résultat de `whenIsRight` | typé `any`, le type précis est perdu | Calculer l'union avec le checker |
| `DString.length` | runes au lieu d'unités UTF-16 | Compter en UTF-16 |
| `print` | JSON au lieu du format `util.inspect` | Formateur Go dédié |
| `boolean` en retour de fonction | non traduit | Transformer de type `bool` |
| Concurrence réelle | `Promise.all`, I/O en parallèle non couverts | Goroutines quand l'ordre ne compte pas |
| `Promise` | reconnu par son nom textuel | Résoudre le symbole |
| Windows | correctif de chemins local requis | Intégrer la conversion dans le dépôt |
| Étape de `rightPipe` qui renvoie une valeur brute | le Go ne compile pas (DuploJS l’enveloppe dans `success`) | Envelopper avec `EitherSuccessOf` quand le checker dit que l’étape ne renvoie pas un Either |
| `left("…")` sans valeur | `print` affiche `"value": null`, Node omet la propriété | `MarshalJSON` sur `EitherLeft` qui omet un `JSUndefined` |
