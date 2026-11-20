# ADR-7 : fonctions fléchées et fonctions génériques en valeur

- **Statut :** accepté (PLAN §0.6), implémenté au Sprint 3
- **Date :** 2026-11-17
- **Code :** [`duplojs/application.ts`](../../src/transpiler/transformers/duplojs/application.ts) (`resolveExpectedSignature`, `createFunctionValue`, `resolveCallback`), [`expression/arrowFunction.ts`](../../src/transpiler/transformers/expression/arrowFunction.ts), [`array/coalescing.ts`](../../src/transpiler/transformers/duplojs/array/coalescing.ts), [`string/to.ts`](../../src/transpiler/transformers/duplojs/string/to.ts)
- **Corrige :** D15 (02, 03 et 04 bloqués sur `DArray.coalescing` passé en valeur)

> Légende : **[observé]** = exécuté ou mesuré, la preuve est citée ; **[à vérifier]** = raisonnement non encore vérifié.

---

## 1. Contexte

L'ADR-3 a décidé d'inliner les combinateurs et de construire un `func` literal pour les formes curryfiées. Il restait deux trous :

1. **Fonction générique en valeur (D15).** `DArray.coalescing` a pour type `<V>(value: V) => Coalescing<V>`. Passé en valeur (`whenIsRight(result, DArray.coalescing)`), son type propre reste générique : `GenericValue`, puis `Coalescing<GenericValue>`, que l'on parte du type propre, du type contextuel ou de la signature générique. Go refuse une fonction générique non instanciée comme valeur (D1).
2. **Fonctions fléchées** (ex. 05 et 06) : `() => [-12]`, `(value) => DString.to(value)`.

## 2. Constat déterminant [observé]

La **signature résolue de l'appel englobant** (`checker.getResolvedSignature(appel)`, puis le type du paramètre au rang de l'argument) est **instanciée** par TypeScript. Sonde dans une copie de travail, sur `pipe(…)` de l'exercice 05 et de la variante `03-pipe-two-steps` :

| Argument | Type propre | Type au rang de l'argument, signature résolue de `pipe` |
|---|---|---|
| `DArray.coalescing` | `<GenericValue …>(value: GenericValue) => Coalescing<GenericValue>` | `(input: number) => readonly [number]` |
| `whenIsRightOtherwise(coalescing, () => [-12])` | `(input: Fail \| Success<number>) => [-12] \| readonly [number]` | identique |
| `DArray.map(DString.to)` | `(array: …) => readonly (string & Number)[] & LengthEqual<1>` | identique |

## 3. Décision

### 3.1 Un « callback » est résolu une fois, puis appliqué

`resolveCallback(node)` renvoie `{ before, arity, apply(arguments) }` :

| Forme du callback | Traduction | Exemple |
|---|---|---|
| Fonction **générique DuploJS connue** (`DArray.coalescing`, `DString.to`) | **inlinée** au point d'application, d'après le **type Go** de l'argument | `coalescing(v)` avec `v float64` donne `[]float64{v}` ; avec un slice, `v` |
| Toute autre expression (fonction utilisateur, fonction fléchée, forme curryfiée) | traduite en **valeur Go** puis **appelée** | `Sourced_double(e.Value)`, `func() []float64 {…}()` |

- `arity` est le nombre de paramètres **déclarés** : `() => [-12]` n'en reçoit aucun, même si `whenIsRightOtherwise` lui passe l'Either (JS ignore les arguments en trop).
- Chaque argument est converti vers le type Go du paramètre (`coerceGoExpression`). Une incompatibilité donne une erreur explicite (`callback-argument-type-mismatch`), jamais du Go invalide.
- Les handlers `whenIsRight`, `whenIsRightOtherwise`, `matchInformation` et `map` partagent ce mécanisme.

### 3.2 Types : la signature attendue

`resolveExpectedSignature(site)` essaie, dans l'ordre, et retient le premier candidat dont **tous les paramètres ont un type Go** :
1. la signature résolue de l'appel englobant, au rang de l'argument ;
2. le type propre de `site` ;
3. son type contextuel.

### 3.3 Le type de retour : celui que produit le handler

Quand TypeScript ne fournit pas un type traduisible (fonction générique, intersection), le type Go du résultat est celui que le **handler produit** : `[]T` pour `coalescing`, `string` pour `to`, `[]R` pour `map`. La coercition s'appuie alors sur les types Go (`coerceGoExpression`). `EitherRetype` n'est émis que si le type TS de la valeur prouve que ses variantes gauches sont sans valeur.

### 3.4 Fonctions fléchées

`(value) => expr` et `() => { … }` deviennent un `func` literal :
- **paramètres** : la signature propre de la fonction fléchée, déjà instanciée par le contexte en TypeScript ;
- **retour** : son type de retour, traduit en Go ;
- un corps-expression devient `return expr` ; un corps-bloc devient ses instructions.

Les closures JS et Go capturent toutes deux **par référence** : la sémantique des variables capturées est conservée (variante `05-map-closure`).

### 3.5 Fonction générique en valeur hors d'un handler

Un `DArray.coalescing` qui doit vraiment exister comme valeur Go est **eta-expansé** : `func(p T) R { return <inline>(p) }`, avec T tiré de la signature attendue (`createInlineFunctionValue`).

## 4. Résultats [observé]

`./scripts/check-all.sh` sur `main` + ce sprint : **00 à 06 ✅** (02, 03 et 04 étaient bloqués par D15). Go produit pour l'exercice 03 :

```go
Generated_9 := func(Generated_7 shard_dependencies.Either[float64]) (shard_dependencies.Either[[]float64]) {
	var Generated_8 shard_dependencies.Either[[]float64]
	if Generated_7.IsRight() {
		Generated_8 = shard_dependencies.EitherPlainOf[[]float64](([]float64{Generated_7.Value}))
	} else {
		Generated_8 = shard_dependencies.EitherRetype[[]float64, float64](Generated_7)
	}
	return Generated_8
}(Generated_6)
```

**Coût [observé]**, `go build -gcflags=-m` sur `projects/03`, `05` et `06` (`dist`) : chaque `func` literal est inliné (`can inline init.0.func1`, puis `inlining call to init.0.func1`) et **aucune closure ne s'échappe**. Seuls les slices s'échappent (`[]float64{...} escapes to heap`, `make([]string, …) escapes to heap`), parce qu'ils sont rangés dans des variables de package. C'est le coût déjà accepté par l'ADR-2 (tuples en slices).

## 5. Limites

- **Forme curryfiée stockée sans contexte** (`const step = whenIsRight(coalescing)`, variante `03-curried-stored`) : TypeScript type lui-même `step` en `(input: unknown) => unknown` [observé, sonde du checker]. Aucun type Go n'est déductible. Erreur explicite `function-value-without-instantiated-signature`. Inférer le type à partir des usages sortirait du rôle du checker.
- Une fonction générique **inconnue** (utilisateur, ou DuploJS hors de la liste des fonctions inlinables) passée en valeur : non couverte.
- Fonction fléchée `async` ou génératrice, paramètres déstructurés, à valeur par défaut ou variadiques : `notSupport` (déstructuration prévue à l'ex. 08).
- Callback de `map` qui lit son 2e paramètre (`{ index, self }`) : `notSupport`.
