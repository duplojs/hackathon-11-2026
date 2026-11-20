# ADR-13 : passage à l'échelle (unions, cycles, diagnostics)

- **Statut :** proposé (Sprint 7), implémenté sur la branche `sprint7/scale`
- **Date :** 2026-11-18
- **Dépend :** ADR-1 (Either par valeur), ADR-2 (regroupement par type Go), ADR-12 (`Either2`)
- **Code :** [`type/taggedUnion.ts`](../../src/transpiler/transformers/type/taggedUnion.ts), [`either/coerce.ts`](../../src/transpiler/transformers/duplojs/either/coerce.ts), [`either/conversionDependency.ts`](../../src/transpiler/transformers/duplojs/either/conversionDependency.ts), [`either/constructor.ts`](../../src/transpiler/transformers/duplojs/either/constructor.ts), [`expression/union.ts`](../../src/transpiler/transformers/expression/union.ts), [`moduleGraph.ts`](../../src/transpiler/moduleGraph.ts)

> Légende : **[observé]** = exécuté ou mesuré, la preuve est citée ; **[à vérifier]** = raisonnement non encore vérifié.

---

## 1. Contexte [observé]

Les 11 exercices passent, mais des sondes hors exercices (18/11, `main` `2886c41`) ont montré que des situations courantes dans un vrai projet échouaient :

| Situation | Avant |
|---|---|
| `x > 0 ? "pos" : x` (`string \| number`) | refus (`UnionType`) |
| deux `left` de types de valeur différents | refus |
| `rightPipe` entre deux fonctions aux erreurs de types différents | refus |
| `left` à valeur `string` avec `success` à valeur `number` | Go **invalide** (`EitherLeftOf[float64]("neg", "message")`) |
| `number \| undefined`, `null` | refus (`UndefinedKeyword`) |
| `a.ts` et `b.ts` qui s'importent mutuellement | transpilation « réussie », puis Go **invalide** (`import cycle not allowed`) |
| `import { add as plus }` | Go invalide (`Sourced_add.Sourced_plus`) |
| `type Order = [number, number]`, `interface` | refus |
| fonction `void`, `return;`, `%` | refus |
| `print` d'un `[]bool` ou d'un `[][]float64` | panique à l'exécution |
| message d'erreur sur un type inféré | `text: 'DisplayError'`, sans position |

La règle de l'ADR-2 (un seul type Go par union, sinon refus) ne tient pas au-delà des exercices.

## 2. Décisions

### 2.1 Union fermée étiquetée, par valeur

`string | number` devient `shard_dependencies.Union2[float64, string]` :

```go
type Union2[T0 any, T1 any] struct {
	Tag uint8
	V0 T0
	V1 T1
}
```

- Les membres sont **dédoublonnés et triés par rendu Go** : `string | number` et `number | string` donnent le même type, dans tous les fichiers.
- Le type est **générique, déclaré une fois par arité** dans `shard_dependencies` : aucun nom inventé, aucun conflit.
- Passage **par valeur** : aucune allocation. L'alternative `any` avec type switch alloue, et l'ADR-1 l'a mesurée 5 à 8 fois plus lente.
- `undefined` et `null` deviennent des membres (`JSUndefined`, `JSNull`) : `T | undefined` est une union comme les autres.
- Côté `Either` : plusieurs types de gauche donnent une gauche en union (`Either2[Union2[float64, string], float64]`), de même pour la droite. Quand les deux côtés ont le même type Go, on garde `Either[V]` (ADR-2).

### 2.2 Coercition compositionnelle, d'après les types Go

`coerceGoExpression` garde **d'abord** les règles historiques (ADR-2, ADR-7), dont le Go ne change pas. Les nouvelles règles ne servent que là où ces règles renvoyaient `notSupport` :

| De → vers | Go produit |
|---|---|
| membre → union | `Union2[…]{Tag: i, Vi: x}` |
| union → membre rétréci par TS | `x.Vi` |
| union → sous-union ou union plus large | conversion par étiquette (`func` literal) |
| `Either[V]` → `Either2[L, R]` | `Either2FromEither(e, convL, convR)` |
| `Either2` → `Either2` | `Either2Map(e, convL, convR)` |
| `Either[A]` → `Either[B]` | `EitherMap(e, conv)` |
| valeur nue → `Either2` | `Either2PlainOf` (forme Plain, ADR-2) |

Chaque convertisseur est construit **récursivement** par la même fonction. Un côté que le type TS source rend impossible (pas de `Success`, ou seulement des gauches sans valeur) reçoit une conversion vers la valeur zéro, qui n'est jamais appelée sur une vraie valeur.

La coercition s'applique aux frontières où TypeScript convertit implicitement et Go non :
- valeur renvoyée par une fonction déclarée ;
- argument d'une fonction du projet ;
- initialiseur d'une variable ;
- élément d'un tableau littéral ;
- valeurs d'un `group`.

Si la conversion est impossible, le Go reste celui d'avant (comportement antérieur).

### 2.3 Constructeurs construits dans le type attendu

`success`, `fail` et `left` produisent directement le type attendu au site (C11) :
- `Either[V]` : inchangé ;
- `Either2[L, R]` : `Either2LeftOf`, `Either2SuccessOf`, `Either2FailOf`.

L'argument valeur est converti vers son côté. Comme ils prennent déjà le type attendu, ils sont exclus de la coercition des frontières.

### 2.4 Rétrécissement, `typeof`, `===`, `??`

- Une variable de type union lue là où TypeScript l'a rétrécie devient `x.Vi`. Le même calcul sert au transformer d'identifiant et à `goTypeOfExpression` (cohérence). Les variables `Either` ne sont pas concernées (D16).
- `typeof x === "string"` sur une union donne `x.Tag == 1` (aucune chaîne construite). `typeof x` seul lit un tableau de noms indexé par l'étiquette.
- `x === undefined` donne `x.Tag == i`. `x === "a"` donne `x.Tag == i && x.Vi == "a"`. Une valeur nulle comparée à un autre type donne `false`.
- `a ?? b` : `b` n'est évalué que si l'étiquette est nulle, comme en JS.
- `matchInformation` sur un `Either2` : chaque information lit `Left` ou `Right`. Le côté vient du type TS (`Left<"negative", …>`).

### 2.5 Cycles d'imports : un package par composante fortement connexe

Le graphe des modules est calculé avant la transpilation (Tarjan). Les fichiers d'un même cycle sont émis dans **un seul package Go** :
- leurs noms de premier niveau portent la clé du fichier (`Sourced_label__even`) ;
- chaque fichier a sa fonction `init__<clé>` ;
- un `init` unique les appelle dans **l'ordre d'évaluation ES**.

Un fichier hors cycle garde son propre package : **un projet sans cycle produit exactement le même Go**.

### 2.6 Diagnostics

- Un nœud synthétique n'est plus lu comme du texte source.
- Une traduction de type qui échoue est rapportée sur le **site réel** : `location: index.ts:10:7`, avec `type: 'Order[]'` et le nœud non pris en charge.

### 2.7 Autres trous comblés

- Alias de types locaux (non génériques) traduits par leur définition.
- `type`, `interface` et `declare` ignorés : ils n'émettent rien.
- Fonction `void` et `return;`.
- `%` traduit par `math.Mod` (même sémantique que JS).
- `print` de tout tableau, par réflexion. Ce chemin ne sert qu'à l'affichage ; `[]float64` et `[]string` restent directs.
- `print` d'une union au premier niveau : la valeur elle-même (une chaîne sans guillemets).

### 2.8 Vitesse du transpileur

- **T1** : cache du type Go par type TS et par fichier, et par nœud pour les expressions.
- **T2** : dédoublonnage des unions en temps linéaire.

## 3. Résultats [observé]

Apple M4, macOS 15.6.1, Node v22.19.0, go1.27.4, 18/11/2026, branche `sprint7/scale` sur `origin/main` `2886c41`.

- `./scripts/check-all.sh` : **11/11**. Le Go des 11 exercices est **identique** à celui de `main` (`diff -r`), hors `shard_dependencies.go`, qui gagne la forme Plain de `Either2`, l'affichage par réflexion et le déballage d'une union au premier niveau.
- `./scripts/check-all.sh --variations` : seuls les deux échecs connus restent (`03-curried-stored`, `10-sync-between`). Les 10 variantes `11-*` passent ([variations/README.md](../../variations/README.md)).
- `go build -gcflags=-m` sur `11-union-plain`, `11-either-two-lefts`, `11-either-pipe-errors` et `11-real-orders` : **aucune union, aucun convertisseur ni aucun `Either` sur le tas**. Seuls s'échappent les chaînes concaténées et les slices, comme avant (ADR-1, ADR-7).
- Transpileur, projet synthétique de 60 modules (1 982 lignes) : **3 474 ms → 2 695 ms** (médiane de 3), sortie Go identique à `tsx` ([research/scale](../../research/scale/README.md)).

Go produit pour deux `left` de types différents (variante `11-either-two-lefts`) :

```go
func Sourced_check(Sourced_value float64) (shard_dependencies.Either2[shard_dependencies.Union2[float64, string], float64]) {
	…
		return shard_dependencies.Either2LeftOf[shard_dependencies.Union2[float64, string], float64](Generated_3, (shard_dependencies.Union2[float64, string]{
			Tag: 1,
			V1: Generated_4,
		}))
	…
	return shard_dependencies.Either2SuccessOf[shard_dependencies.Union2[float64, string], float64](Generated_11)
}
```

## 4. Limites

- Objets, interfaces, alias génériques, affectations et boucles : levés par l'[ADR-14](ADR-14-objects-loops.md).
- L'information d'un `Left` d'un type inféré est lue dans le texte du type (`typeToString`), car l'API tsgo ne rend pas les arguments d'alias de ces types. **[à vérifier]** : une information qui contient un guillemet échappé.
- `Information` reste une `string` (16 octets par Either). Passer à un entier connu à la transpilation est la prochaine optimisation du runtime **[à vérifier : non mesuré]**.
- Transpilation des fichiers en parallèle (T3) : non faite, car la numérotation `Generated_N` deviendrait non déterministe.
