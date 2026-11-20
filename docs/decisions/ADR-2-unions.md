# ADR-2 : unions qui ne sont pas que des Either

- **Statut :** proposé (Sprint 2, Personne 4)
- **Date :** 2026-11-17
- **Dépend de :** [ADR-1](ADR-1-either.md) (représentation `Either[V]`)

> Légende : **[observé]** = exécuté ou mesuré ; **[à vérifier]** = non vérifié.

## 1. Contexte

L'exercice 02 appelle `DEither.whenIsRight(result, DArray.coalescing)`. Le checker donne à ce résultat le type **`Fail | readonly [number]`** **[observé]** (typeToTypeNode : `UnionType` → `TypeReference DEither.Fail` + `TypeOperator readonly` → `TupleType` → `NumberKeyword`).

C'est une union d'un **Either** (`Fail`) et d'une **valeur nue** (le tableau renvoyé par `coalescing`). À l'exécution, la valeur est soit l'objet `Fail`, soit le tableau `[3]`, affiché `[ 3 ]` par `DCommon.print`. L'ADR-1 ne couvrait que des unions d'Either.

## 2. Options

| Option | Forme Go | Coût | Couvre |
|---|---|---|---|
| **A+ Plain** (retenue) | Même struct `Either[V]`, nouvelle variante `EitherKindPlain` qui porte la valeur nue dans `Value` | Struct par valeur, 0 allocation (§4) | Valeurs nues dont le type Go est celui des variantes Either |
| Union fermée générée | `struct{ Kind; A []float64; B Either[...] }` par union | Pas de boxing, mais un type par union, plus de code généré et une struct plus grosse | Toutes les unions bornées |
| `any` | `interface{}` + assertions | Boxing, une allocation par valeur (ADR-1 : 5 à 10 fois plus lent) | Tout |

## 3. Décision

1. **A+ Plain.** `EitherKindPlain = 4`, `EitherPlainOf[V](value V) Either[V]`. Un Plain n'a ni côté ni information : `IsRight()` et `IsLeft()` renvoient **faux**, comme `DEither.isRight`/`isLeft` sur une valeur non Either à l'exécution. `InspectPlain() (any, bool)` renvoie `(Value, true)` pour un Plain : **Print (P3) teste `InspectPlain` avant `InspectEntries`**, si bien qu'un Plain s'affiche comme sa valeur nue et que son `InspectEntries` n'est jamais appelé.
2. **Règle de regroupement des unions** (`type/union.ts`, en tête de `typeTransformers`). Chaque membre est traduit en type Go, puis les membres sont **comparés par rendu Go** :
   - que des membres nus de même type `T` : `T` (`"a" | "b"` → `string`, `true | false` → `bool`) ;
   - des variantes Either de valeur `V` (ou sans valeur : `Fail` = `Either[JSUndefined]`), plus des membres nus de type `V` : `Either[V]`. Cas cible : `Fail | readonly [number]` → **`Either[[]float64]`** ;
   - sinon : `notSupport` (les replis A' et l'union fermée de l'ADR-1 ne sont pas implémentés ici).
3. **Tuples : slices.** Un tuple **homogène** (`[T]`, `readonly [T, T]`) devient `[]T`, de même que `T[]`, `readonly T[]`, `Array<T>` et `ReadonlyArray<T>`. `readonly` est déballé, puisqu'il n'a pas de représentation à l'exécution. Le `[N]T` sans allocation est reporté à l'exercice 08, où la taille compte (tableaux de tuples). Un tuple hétérogène, vide, nommé, optionnel ou variadique donne `notSupport`.
4. **`Array<T>` est reconnu par le checker** (`isArrayType`), pas par son nom, pour ne pas confondre avec un type utilisateur `Array`. Les types inférés n'utilisent que `T[]` **[observé]**, donc ce chemin ne concerne que les annotations (nœuds réels).
5. **Coercition explicite** (`coerceExpression`, §5) : c'est elle qui fait passer une valeur nue ou un Either vers l'union attendue.

## 4. Coût mesuré [observé]

Machine : Intel i7-1185G7, Go 1.27.4 linux/amd64 (`golang:1.27.4-bookworm`, Docker Desktop, WSL2). Le test est écrit à la main dans le package `shard_dependencies` **généré**. Les fonctions sont marquées `//go:noinline` pour forcer un vrai retour de fonction :

```go
//go:noinline
func wrapPlain(v []float64) Either[[]float64] { return EitherPlainOf[[]float64](v) }
//go:noinline
func retypeFail(e Either[float64]) Either[[]float64] { return EitherRetype[[]float64, float64](e) }
```

`go test -bench . -benchmem -count 5` :

| Benchmark | ns/op (5 passes) | B/op | allocs/op |
|---|---|---|---|
| `wrapPlain` | 4,9 / 5,5 / 6,3 / 7,6 / 9,2 | **0** | **0** |
| `retypeFail` | 4,0 / 4,2 / 4,7 / 5,3 / 6,6 | **0** | **0** |

`go test -c -gcflags=-m` :

```
shard_dependencies.go:206:6: can inline EitherPlainOf[go.shape.[]float64]
shard_dependencies.go:213:6: can inline EitherRetype[go.shape.[]float64,go.shape.float64]
shard_dependencies.go:228:6: can inline Either[go.shape.[]float64].InspectPlain
p4_test.go:31:21: []float64{...} does not escape
```

La forme Plain reste **la même struct par valeur** : aucun boxing, aucune allocation, des helpers inlinables. Les temps varient de ±40 % sur ce portable (cf. ADR-1) ; les allocations sont déterministes.

Comportement **[observé]** (même test) : `EitherPlainOf([]float64{3})` a `IsRight() == IsLeft() == false` et `InspectPlain() == ([3], true)` ; `Success.InspectPlain()` renvoie `false` ; `EitherRetype(EitherFailOf[float64]())` garde `Kind == Fail` et `Information == "fail"`, avec `Value == nil`.

## 5. Contrat livré (Sprint 2, P4)

Le §8 du plan à jour n'étant disponible nulle part (ni sur `main`, ni localement), **ce contrat est défini ici**. P2 et P3 s'y alignent.

### Go (`shard_dependencies`, noms figés)

```go
const EitherKindPlain EitherKind = 4
func EitherPlainOf[V any](value V) Either[V]
func EitherRetype[To any, From any](e Either[From]) Either[To] // garde Kind et Information, abandonne Value
func (e Either[V]) InspectPlain() (any, bool)
```

### TypeScript

```ts
// src/transpiler/transformers/type/goTypeOf.ts (réexporté par type/index.ts)
export type GoType = GoAST.Type | GoAST.TypeReference;
export function goTypeOf(type: Type, site: TsAST.Node, context: BuildContext):
	Promise<TransformationSuccess<GoType> | TransformationError | NotfoundTransformer>;
// usage : DCommon.asyncPipe(goTypeOf(type, site, context), DEither.unwrapRight) -> { before: [], result } | Left

// src/transpiler/transformers/duplojs/either/coerce.ts
export interface CoerceExpressionParams {
	readonly expression: GoAST.Expression; // valeur Go déjà évaluée
	readonly from: Type;                   // type TS de la valeur
	readonly to: Type;                     // type TS attendu
	readonly site: TsAST.Node;
}
export function coerceExpression(params: CoerceExpressionParams, context: BuildContext):
	Promise<TransformationSuccess<GoAST.Expression> | TransformationError | NotfoundTransformer | TransformationNotSupported>;
```

Règles de `coerceExpression`, avec instanciation toujours explicite (D1) et aucun `before` :

| `from` (Go) | `to` (Go) | Résultat |
|---|---|---|
| T | T | `x` (identité) |
| T (nu) | `Either[T]` | `EitherPlainOf[T](x)` |
| `Either[A]` | `Either[B]` | `EitherRetype[B, A](e)` **seulement** si toutes les variantes gauches de `from` sont sans valeur (`Fail`) ; sinon `notSupport` |
| autre | autre | `notSupport` |

`EitherRetype` abandonne `Value`. Il n'est correct que sur une valeur **déjà restreinte à son côté gauche** (branche `else` de `whenIsRight`). C'est à l'appelant de le garantir.

Les variantes gauches sont reconnues **par symbole résolu** (`resolveReferenceModule` sur le symbole de chaque membre du `Type`), et non par le texte.

## 6. Limites

- **Union hétérogène** (`string | number`, `Success<string> | Left<"e", number>`) : `notSupport` **[observé]**, avec l'erreur `notfound-transformer` sur le nœud `UnionType`. Les replis A' et l'union fermée sont à faire selon les besoins (exercice 09).
- **Tuple hétérogène** (`[string, number]`) : `notSupport` **[observé]**, struct prévue à l'exercice 08.
- **`Left<"e">` sans valeur** (`Left<"e", undefined>`) : pas de transformer pour `undefined`, donc refusé.
- **`EitherRetype` vers un côté droit valué** : refusé par la règle. Une coercition `Success<A>` → `Success<B>` demanderait une conversion de valeur, hors périmètre.
- **Alias de type local** (`type R = …`) : non pris en charge (cf. notes P4 du Sprint 1).
- **`goTypeOf` sur un type dont typeToTypeNode échoue** : erreur `unable-to-create-type-node`.

## 7. Vérifications [observé]

Les vérifications portent sur une copie jetable de la branche, sur laquelle les 4 étapes de I1 ont été appliquées (P3, non mergé au moment de l'écriture) :

| Cible | Avant (main) | Après (P4 + I1) |
|---|---|---|
| 00 | ✅ | ✅ |
| 01 | ❌ (isRight non branché) | ✅ |
| 02, 03 | ❌ | ❌ à `whenIsRight` / `pipe` (P3) |
| 04 | ❌ `-1` | ❌ `-1` (P2) |
| Variantes 01 | 0/9 | 4/9 ; les 5 autres passent les **types** et s'arrêtent aux **littéraux d'expression** chaîne (P2) |
| Types cibles (`Fail \| readonly [number]`, `"a" \| "b"`, `true \| false`, `Array<number>`, `ReadonlyArray<string>`, `[number, number]`, `readonly [string]`) | – | `Either[[]float64]`, `string`, `bool`, `[]float64`, `[]string`… : `go vet` et `go run` ✅ |
| `fail()` passé en argument de type `Fail \| readonly [number]` | – | `EitherFailOf[[]float64]()` |
