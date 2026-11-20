# ADR-3 : fonctions en valeur et curryfication

- **Statut :** accepté (décision du PLAN §0.5), implémenté au Sprint 2 (Personne 3)
- **Date :** 2026-11-17
- **Code :** [`duplojs/application.ts`](../../src/transpiler/transformers/duplojs/application.ts) (`createFunctionValue`), [`either/whenIsRight/`](../../src/transpiler/transformers/duplojs/either/whenIsRight/index.ts), [`common/pipe/`](../../src/transpiler/transformers/duplojs/common/pipe/index.ts)
- **Scénario de mesure :** [`research/functions/pipe-whenisright/`](../../research/functions/pipe-whenisright/)

> Légende : **[observé]** = exécuté ou mesuré, la preuve est citée ; **[à vérifier]** = raisonnement non encore vérifié.

---

## 1. Contexte

À partir de l'exercice 02, DuploJS manipule des fonctions comme des valeurs :

| Ex. | Construction | Difficulté côté Go |
|---|---|---|
| 02 | `DEither.whenIsRight(result, DArray.coalescing)` | une fonction **générique** passée en valeur |
| 03 | `DCommon.pipe(result, DEither.whenIsRight(DArray.coalescing))` | une forme **curryfiée** (`whenIsRight(f)` renvoie une fonction) |
| 05+ | `DArray.map(fn)`, `matchInformation`, `whenIsRightOtherwise` dans des `pipe` | le même mécanisme, généralisé |

Go n'a pas de curryfication, refuse une fonction générique non instanciée comme valeur (leçon de D1), et une closure qui s'échappe coûte une allocation. Il faut donc décider **quand** produire une fonction Go, et **laquelle**.

## 2. Options

| Option | Forme Go | + | − |
|---|---|---|---|
| A. **Closures** partout | `whenIsRight(f)` renvoie `func(e) R`, `pipe` appelle chaque étape | simple, uniforme | un appel indirect par étape ; risque d'allocation si la closure s'échappe |
| B. **Inlining** au site d'appel | `whenIsRight(e, f)` devient un `if` ; `pipe` devient des appels séquentiels | aucun appel indirect, types connus statiquement | plus de code généré ; demande une forme de repli pour les fonctions curryfiées |
| C. **Helpers génériques** dans `shard_dependencies` | `func WhenIsRight[I, O any](e Either[I], f func(I) O) …` | peu de code généré | les types de sortie (ADR-2 : `Fail \| readonly [number]`) ne s'expriment pas comme un seul paramètre générique ; appel indirect pour `f` |

## 3. Décision (PLAN §0.5)

**B, avec A comme forme de repli quand une fonction doit exister comme valeur.**

1. `whenIsRight(e, f)` (forme directe) est **inlinée** : `var r T; if e.IsRight() { r = coerce(f(e.Value)) } else { r = coerce(e) }`. `e` est évalué une seule fois (temporaire), puis `f`, dans l'ordre de JS. `f` est appelée directement : une référence de fonction (identifiant) ne crée pas de `func` literal.
2. `whenIsRight(f)` (forme curryfiée) donne un **`func` literal** construit par `createFunctionValue` d'après le **type attendu** (première signature d'appel du type du site, sinon du type contextuel), dont le corps est le même code inliné.
3. `pipe(x, s1, …, sn)` donne `t0 := x; t1 := s1(t0); …`. `pipe` ne connaît pas la forme de ses étapes : il les transforme comme des expressions ordinaires et les appelle. Un `func` literal produit par une étape est donc **appelé immédiatement**. Zéro étape renvoie `x`.
4. Une fonction DuploJS générique passée en valeur (`DArray.coalescing`) devra être un `func` literal **instancié** via `createFunctionValue`, jamais une fonction générique nue (D1). C'est le point de contact avec P2 (routeur `array`).

`createFunctionValue` ne lit jamais le corps d'une arrow TypeScript : il fabrique une fonction **à partir d'un type**. Les arrows (ex. 05) relèvent d'un transformer d'expression à part.

## 4. Mesures

Les exercices 02 et 03 ne transpilent pas encore (voir §6). La mesure a donc été faite sur un scénario de même forme qui ne dépend que du code de ce sprint : [`research/functions/pipe-whenisright/`](../../research/functions/pipe-whenisright/index.ts). Il contient une forme directe (`whenIsRight(result, double)`) et un `pipe` à deux étapes curryfiées (`whenIsRight(increment)`, `whenIsRight(double)`). Tous les types valent `Either[float64]`, donc la coercition est l'identité.

**Comportement [observé]** : `./scripts/check.sh research/functions/pipe-whenisright` donne ✅ IDENTIQUE (sortie Go égale à `tsx`).

**Go produit [observé]** (extrait de `dist/index.ts/index.ts.go`, chemins de package abrégés) :

```go
Generated_8 := Sourced_result
Generated_11 := func(Generated_9 shard_dependencies.Either[float64]) (shard_dependencies.Either[float64]) {
	var Generated_10 shard_dependencies.Either[float64]
	if Generated_9.IsRight() {
		Generated_10 = add.Sourced_increment(Generated_9.Value)
	} else {
		Generated_10 = Generated_9
	}
	return Generated_10
}(Generated_8)
Generated_14 := func(Generated_12 shard_dependencies.Either[float64]) (shard_dependencies.Either[float64]) { … }(Generated_11)
Sourced_piped = Generated_14
```

**Escape analysis [observé]** : `go1.27.4 linux/amd64`, commande lancée dans `research/functions/pipe-whenisright/dist` après le `check.sh` ci-dessus : `GOWORK=off go build -gcflags=-m ./index.ts/`. Lignes concernant les `func` literals du `pipe` (sortie complète non filtrée sur le paquet `index.ts`) :

```
index.ts/index.ts.go:29:18: can inline init.0.func1
index.ts/index.ts.go:38:18: can inline init.0.func2
index.ts/index.ts.go:37:3: inlining call to init.0.func1
index.ts/index.ts.go:46:3: inlining call to init.0.func2
index.ts/index.ts.go:29:23: leaking param: Generated_9 to result ~r0 level=0
index.ts/index.ts.go:38:23: leaking param: Generated_12 to result ~r0 level=0
```

Lecture :
- les deux `func` literals du `pipe` sont **inlinés** à leur site d'appel ;
- **aucune ligne « func literal escapes to heap »** : la closure n'est pas allouée sur le tas ;
- `leaking param … to result` signifie seulement que le paramètre est renvoyé (branche gauche `r = e`). Ce n'est pas une allocation.

Les seules allocations signalées sont dans `shard_dependencies` (`Print`, `InspectEntries`). Elles sont sur le chemin d'affichage, déjà assumé par l'ADR-1 et la fiche 01.

**Conclusion** : le risque « closures et performance » du §13 du plan est levé pour `pipe` + forme curryfiée. Aucun inlining manuel de secours n'est nécessaire.

## 5. Conséquences pour le Sprint 3

- **`map(fn)` / `map(arr, fn)`** : même découpage. La forme directe donne une boucle `for` inlinée ; la forme curryfiée, `createFunctionValue` avec la boucle comme corps. `pipe` n'a pas à changer.
- **`whenIsRightOtherwise`** : `buildBranches` de `whenIsRight` est le modèle (deux branches coercées vers T) ; seule la branche gauche change (`r = coerce(g(e.Value))` au lieu de `r = coerce(e)`).
- **`matchInformation`** : forme directe en `switch e.Information`, forme curryfiée via `createFunctionValue`, mêmes règles de coercition par branche.

## 6. Limites et dépendances ouvertes

| Limite | Statut |
|---|---|
| **02 et 03 ne transpilent pas encore** : le premier échec est maintenant `DArray.coalescing` (P2, routeur `array`), alors qu'avant ce sprint c'était `whenIsRight` / `pipe`. Il faudra ensuite les types tableau (D12) et la forme `Plain` de l'ADR-2 (P4). | Dépend de P2 et P4 |
| **Bouchons locaux** : `goTypeOf` (P4) est remplacé par `typeToTypeNode` + `typeTransformers` (la recette de `print`), et `coerceExpression` (P4) par l'identité seule (refus explicite `duplojs-either-whenisright-heterogeneous-union-not-supported` sinon). Ils sont privés à `application.ts` et `whenIsRight/`, et doivent être remplacés par les appels au contrat §8 dès le merge de P4. | À retirer au merge de P4 |
| **Forme curryfiée stockée puis réutilisée** (`const g = whenIsRight(f); g(a); g(b)`) : le `func` literal est rangé dans une variable, il n'est plus inliné et peut s'échapper. Hors des exercices 01 à 10. | Non mesuré **[à vérifier]** |
| **Fonction générique utilisateur passée en valeur** (`function id<T>(x: T)` puis `whenIsRight(e, id)`) : l'identifiant Go désignerait une fonction générique non instanciée (D1). Il faudrait passer par `createFunctionValue` comme pour `coalescing`. | Non pris en charge |
| **Signature surchargée** : `createFunctionValue` prend la première signature d'appel. | Hors périmètre |
| **`print` d'une valeur Plain** : `Print` teste maintenant `interface{ InspectPlain() (any, bool) }` avant `Inspectable` ([`defaults/inspect.ts`](../../src/transpiler/sharedDependency/defaults/inspect.ts)). L'AST ne représente pas `a, b := f()` : le Go déclare les deux variables puis les affecte (`a, b = f()`). Vérifié par [`research/either/plain/`](../../research/either/plain/plain_test.go) (`[ 3 ]` pour un Plain de `[]float64{3}`). Il faut encore que P4 ajoute la méthode `InspectPlain` sur `Either[V]`. | Attend P4 |

## 7. Reproduire

```bash
./scripts/check.sh research/functions/pipe-whenisright
cd research/functions/pipe-whenisright/dist && GOWORK=off go build -gcflags=-m ./index.ts/
cd research/either && go test ./plain/...
```
