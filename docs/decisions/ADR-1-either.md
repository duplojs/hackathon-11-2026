# ADR-1 : représentation Go des valeurs `Either`

- **Statut :** proposé (Sprint 0, Personne 4), à valider au point d'équipe
- **Date :** 2026-11-17
- **Prototype et mesures :** [`research/either/`](../../research/either/)
- **Reproduire :** `./research/either/run.sh` (sortie brute : [`research/either/results.txt`](../../research/either/results.txt))

> Légende : **[observé]** = exécuté ou mesuré, la preuve est citée ; **[à vérifier]** = raisonnement non encore vérifié.

---

## 1. Contexte

Les 10 exercices manipulent des `Either` DuploJS : `Success<T>`, `Fail`, `Left<"information", T>` et leurs unions, inférées par TypeScript (`add` de l'exercice 06 renvoie `Left<"negative-operand", number> | Success<number>`). Go n'a pas d'union : il faut une représentation qui
1. conserve le comportement, y compris l'affichage exact de `DCommon.print` ;
2. coûte peu en temps et en mémoire (critère explicite du jury) ;
3. reste simple à générer pour les transformers.

### Ce qu'est réellement un Either DuploJS [observé]

Exécution de `research/either/reference/scenario.ts` avec `tsx` (sortie dans `reference/expected.txt`) :

| Constructeur | Clés de l'objet (préfixe `@duplojs/lang/kind/@DuplojsLangEither/`) |
|---|---|
| `success(v)` | `right`, `information` = `"success"`, `value`, `success` |
| `fail()` | `left`, `information` = `"fail"`, `value` = `undefined`, `fail` |
| `left(info, v)` | `left`, `information`, `value` |
| `right(info, v)` | `right`, `information`, `value` |

Trois constats changent la donne :

1. **`DCommon.print` n'affiche pas du JSON** mais le format `util.inspect` de Node : clés entre quotes simples, `value: undefined` pour `fail`, tableaux `[ 3, 3 ]`. Les tags JSON du struct `EitherSuccess` de l'époque (`either/success/sharedDependency.ts`, remplacé depuis par [`either/sharedDependency.ts`](../../src/transpiler/transformers/duplojs/either/sharedDependency.ts)) **ne servent pas pour `print`**. Il faut un formateur dédié (prototype : [`inspect/inspect.go`](../../research/either/inspect/inspect.go)).
2. Pour afficher fidèlement, il faut distinguer **4 formes** (right, left, success, fail). Un `Right bool` ne suffit pas ; un `Kind uint8` suffit, pour la même taille.
3. **`DEither.group` renvoie le premier `left` tel quel** (même objet), sinon `success([...valeurs])`. Le type du résultat de l'exercice 09 est donc `Left<…, number> | Success<number[]>` : **les deux côtés portent des types de valeur différents**.

Le struct actuel `EitherSuccess[T]` (champs `JSNull` `Right` et `Success`) **ne peut représenter ni `left` ni `fail`** : un champ de type struct vide est toujours « présent ». Il devra être remplacé.

## 2. Options étudiées

Chaque option est écrite à la main dans son propre package, avec la logique des exercices 04, 06, 07, 08 et 09 telle que le transpileur devrait la produire (`pipe` et `rightPipe` inlinés en retours anticipés, `matchInformation` traduit en `switch`).

| | Forme Go | Package |
|---|---|---|
| **A** | `type Either[V any] struct { Kind Kind; Information string; Value V }` | [`a/`](../../research/either/a/) |
| **A'** | `type Either2[L, R any] struct { Kind; Information; Left L; Right R }`, uniquement quand les côtés diffèrent | [`aprime/`](../../research/either/aprime/) |
| **B** | `type Either interface{…}` + `Right[V]`, `Left[V]` + type switch | [`b/`](../../research/either/b/) |
| **C** | `struct { Kind; Information string; Value any }` | [`c/`](../../research/either/c/) |

**Comportement [observé] :** pour chaque option, `TestBehaviourMatchesTypeScript` reconstruit les 14 affichages du scénario et les compare **caractère par caractère** à `reference/expected.txt` produit par `tsx`. Les 4 tests passent (`results.txt`, section « tests de comportement »). Pour A, le scénario `group` passe par A' (voir §5).

## 3. Mesures [observé]

**Contexte :** Intel Core i7-1185G7 (8 threads), Go 1.27.1 linux/amd64 dans le conteneur `golang:1.27.1-bookworm` (Docker Desktop, WSL2, Windows 11). Commande : `go test -run '^$' -bench . -benchmem -count 5 ./a ./aprime ./b ./c`. Valeur = **médiane de 5 itérations** de `results.txt`, entre crochets [min..max]. Les colonnes B/op et allocs/op sont déterministes : elles étaient **identiques sur les 4 passes complètes** exécutées. Les temps absolus de B et C ont varié jusqu'à +40 % d'une passe à l'autre sur ce portable, alors que A et A' sont restés stables. Les **ratios** sont donnés en plage sur les 4 passes.

### Appel unitaire : `add` puis `matchInformation` (exercice 06), 25 % de gauches

| | Inliné : ns/op | B/op | allocs | **Non inliné** (`//go:noinline`) : ns/op | B/op | allocs |
|---|---|---|---|---|---|---|
| **A** | **4,32** [3,84..9,35] | 0 | 0 | **5,44** [4,90..6,19] | **0** | **0** |
| B | 6,08 [5,02..6,25] | 0 | 0 | 75,2 [60,3..82,4] | 32 | 1 |
| C | 31,1 [25,2..31,7] | 0 | 0 | 57,3 [51,6..63,3] | 8 | 1 |

Quand tout est inliné, le compilateur dévirtualise B et rend son interface gratuite. Dès qu'une fonction n'est pas inlinée (le cas normal pour du code généré non trivial : `Calculate` dépasse déjà le budget d'inlining, coût 120 > 80), **B et C allouent à chaque retour et deviennent 8 à 14 fois plus lents que A** selon la passe (jusqu'à 23 fois pour B dans la passe la plus bruitée).

### Collection de 1000 calculs (exercice 08 : `map` + `rightPipe`) puis `group` (exercice 09)

| | `Map1000` ns/op | B/op | allocs | `MapGroup1000` ns/op | B/op | allocs |
|---|---|---|---|---|---|---|
| **A** (+ A' pour `group`) | **20 577** [19 742..21 155] | **32 768** | **1** | **26 800** [25 286..27 799] | **40 960** | **2** |
| B | 150 078 [144 596..156 264] | 80 384 | 2 001 | 150 600 [145 903..174 634] | 88 624 | 2 003 |
| C | 163 603 [156 860..212 773] | 56 960 | 2 001 | 199 083 [191 575..201 505] | 65 176 | 2 003 |
| A' uniforme (`Either2[float64, float64]` partout) | 72 172 [69 690..76 389] | 40 960 | 1 | | | |

Sur les 4 passes, `Map1000` est **5 à 8 fois plus lent** avec B ou C qu'avec A. A' uniforme est **environ 3,5 fois plus lent** que A (3 à 4 fois sur 3 séries dont une isolée, et 7 fois dans la passe la plus bruitée).

### Taille d'une valeur (`unsafe.Sizeof`, test `TestSizes`)

| Représentation | Taille |
|---|---|
| A `Either[float64]` | 32 octets |
| A' `Either2[float64, []float64]` | 56 octets |
| A' `LimitUnion` (2 gauches de types différents + droite) | 72 octets |
| B `Either` (interface) | 16 octets **+ 32 octets boxés sur le tas** (`Right[float64]`) |
| C `Either` (`Value any`) | 40 octets **+ 8 octets boxés sur le tas** (le `float64`) |

## 4. Analyse mémoire : escape analysis [observé]

`go build -gcflags='-m' ./a ./aprime ./b ./c` (extraits de `results.txt`) :

- **A / A'** : les seules allocations sur le tas sont les slices de résultat, inévitables :
  `a/scenario.go:80:17: make([]Either[float64], len(inputs)) escapes to heap`
  `aprime/either.go:42:16: make([]float64, len(items)) escapes to heap`
  Aucun `Either` ne s'échappe : ils sont passés et renvoyés par valeur.
- **B** : **chaque construction** d'une variante s'échappe, parce que la convertir en interface la boxe :
  `b/scenario.go:22:16: Right[go.shape.float64]{...} escapes to heap`
  `b/scenario.go:20:17: Left[go.shape.float64]{...} escapes to heap`
  Les 2 001 allocations de `Map1000` viennent de là : un box pour `add` et un pour `divide`, × 1000, + le slice.
- **C** : **chaque valeur** placée dans `Value any` s'échappe :
  `c/scenario.go:22:21: one + two escapes to heap`
  `c/scenario.go:34:23: value / divisor escapes to heap`

### Pourquoi A' uniforme est environ 3,5 fois plus lent que A [observé + à vérifier]

L'inlining est identique (`-gcflags=-m=2`). En revanche, `go tool objdump` de `MapCalculate` montre que le struct de 32 octets de A est stocké dans le slice avec la barrière rapide `runtime.gcWriteBarrier2`, alors que le struct de 40 octets d'A' passe par **`runtime.wbMove`**, une copie générique avec barrière d'écriture **[observé]**. Notre explication est que le compilateur a des chemins spécialisés pour les petits structs, et qu'au-delà il bascule sur une copie générique plus lente **[hypothèse : à confirmer avec un profil CPU]**.
Conséquence pratique : **il ne faut pas élargir le struct « au cas où »**. On génère la forme la plus petite qui suffit.

## 5. Où A cesse de suffire (A') [observé]

`Either[V]` exige **un seul type de valeur pour toutes les variantes**. Pour chaque exercice :

| Exercice | Type TS | Types de valeur | Représentation |
|---|---|---|---|
| 01, 03 | `Success<number> \| Fail` | `float64` (`fail` n'en porte pas) | A `Either[float64]` |
| 04 | `Fail \| Success<number>` | `float64` | A |
| 06, 07 | `Left<"negative-operand", number> \| Left<"division-by-zero", number> \| Success<number>` | `float64` | A |
| 08 | `[]` de l'union précédente | `float64` | `[]Either[float64]` |
| **09** | `group` : `Left<…, number> \| Success<number[]>` | **gauche `float64`, droite `[]float64`** | **A' `Either2[float64, []float64]`** |
| **02** | `whenIsRight(result, coalescing)` : `number[] \| Fail` | **pas un Either, union tableau \| Either** | hors ADR-1, voir ADR-2 |
| Limite | `Left<"a", string> \| Left<"b", number> \| Success<…>` | **deux types différents du même côté** | union fermée générée (`LimitUnion`, 72 octets) ou repli C |

Le passage de A vers A' est une **coercition explicite**, c'est-à-dire une copie de champs sans allocation (`aprime.FromLeft`). C'est le seul endroit où la coercition du §4.2 du plan reste nécessaire pour les Either.

## 6. Décision

1. **Représentation par défaut : A, struct générique par valeur.**
   ```go
   type EitherKind uint8 // Right, Left, Success, Fail
   type Either[V any] struct { Kind EitherKind; Information string; Value V }
   ```
   `Success<T>`, `Fail`, `Left<I, T>` et **toutes leurs unions** dont les valeurs partagent un type deviennent **le même type Go**. Dans 01, 04, 06, 07 et 08, aucun `return` n'a donc besoin de coercition.
2. **Repli n°1 : A' `Either2[L, R]`**, seulement quand le côté gauche et le côté droit ont des types différents (exercice 09, `group`). Le coût est d'environ 24 octets de plus par valeur, sans allocation.
3. **Repli n°2 : union fermée générée** (un champ par type distinct), quand un même côté mélange plusieurs types. On l'**évite autant que possible** et on la documente comme limite.
4. **Repli ultime : C (`Value any`)**, seulement si l'union n'est pas bornée. Le surcoût mesuré est de 1 allocation de 8 octets par valeur, et le temps est 5 à 10 fois celui de A selon le scénario et la passe. Il doit être justifié dans la fiche de l'exercice.
5. **B est écarté** : il est fidèle mais coûte le plus de mémoire (80 Ko contre 32 Ko pour 1000 valeurs) et alloue à chaque retour non inliné. Il n'apporte rien que A' et C ne couvrent.
6. **`Information`** reste une `string`, puisque les littéraux Go n'allouent pas. Un `switch` sur une `string` constante suffit pour `matchInformation`.

## 7. Conséquences pour les transformers

- **Type d'un Either (transformer de type, Personne 4 au Sprint 1)** : à partir du type TS résolu par le checker, on parcourt les membres de l'union et on regroupe les types de valeur par côté (`fail` ne compte pas).
  - un seul type T pour toutes les variantes : `Either[T]` ;
  - un type L à gauche et un type R à droite : `Either2[L, R]` ;
  - sinon : repli (§6.3 ou §6.4) avec un `context.notSupport()` explicite tant que ce n'est pas implémenté.
- **Constructeurs** : `DEither.success(x)` devient `EitherSuccessOf[T](x)`, `left("i", x)` devient `EitherLeftOf[T]("i", x)`, et `fail()` devient `EitherFailOf[T]()`. **T est pris dans le type attendu au site d'appel** (type de retour de la fonction englobante), pas seulement dans l'argument : `fail()` n'a pas d'argument et doit quand même recevoir `[float64]`. On reste compatible avec le correctif D1 de la Personne 2 (instanciation explicite).
- **`isRight(e)`** : `e.Kind == Right || e.Kind == Success`, inliné. **`isLeft`** est son complément.
- **`rightPipe`** : retours anticipés ; aucune conversion tant que les étapes partagent `Either[T]`.
- **`group`** : boucle, premier gauche renvoyé via une coercition `FromLeft`, slice pré-alloué à `len(items)`.
- **`print`** : formateur `util.inspect` dans `shard_dependencies`. Le format exact (multi-ligne au-delà de 72 caractères, tableaux longs, chaînes avec quotes) dépend de la fiche sémantique de la Personne 3. Le prototype isole tout le formatage dans `inspect/` pour pouvoir l'ajuster.
- **Dépendance partagée existante** : `EitherSuccess[T]` (champs `JSNull`) est remplacé par `Either[V]` + `EitherKind`. Le README du projet 00 cite `EitherSuccessOf[float64]` : le nom de la fonction est conservé.

## 8. Limites et points restant à vérifier

| Point | Statut |
|---|---|
| Cause exacte de la lenteur d'A' uniforme (`wbMove`) | **[à vérifier]**, faire un profil CPU. Changer l'ordre des champs pourrait aussi aider. |
| Coût d'`Either2` pour l'exercice 09 | **[observé]** `group` ne renvoie qu'**un** `Either2` (inclus dans `MapGroup1000`, +6 µs et +8 Ko pour le `[]float64`). Un **slice** d'`Either2` (cas A' uniforme) coûte 3,5 fois le temps, raison de plus pour le réserver aux unions hétérogènes. |
| Format `util.inspect` complet (objets courts sur une ligne, tableaux > 6 éléments, échappement des chaînes) | **[à vérifier]** avec la Personne 3, seuls les cas du scénario sont couverts |
| `DString.to(-0)`, exposants, `NaN` | **[à vérifier]** : `inspect.ToString` imite `String(n)`, à confirmer par la fiche sémantique (Q4) |
| Variabilité des temps | **[observé]** Sur 4 passes complètes, les temps de B et C ont varié jusqu'à +40 % (portable, VM Docker), et ceux de A de moins de 10 %. Les allocations sont identiques à chaque passe. La décision repose sur les **allocations** et sur des **ratios** qui sont restés d'au moins 5 fois en faveur de A. **Choix du Sprint 6 :** ces mesures ne sont pas relancées. Les temps absolus sont indicatifs (jusqu'à +40 % d'une passe à l'autre) ; seuls les allocations et les ratios d'au moins 5 fois sont cités en soutenance. |
| Mesures hors VM (Go natif Windows) | Impossibles sur nos postes : Smart App Control bloque `go.exe` et les binaires de test non signés (journal CodeIntegrity, événement 3077). D'où Docker. |
| `right(info, v)` (droite avec information autre que `success`) | Supporté par la représentation (`KindRight`), non utilisé par les exercices |
