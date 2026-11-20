# ADR-9 : `matchInformation`

- **Statut :** accepté (PLAN §0.6), implémenté au Sprint 3
- **Date :** 2026-11-17
- **Code :** [`either/matchInformation/index.ts`](../../src/transpiler/transformers/duplojs/either/matchInformation/index.ts)

> Légende : **[observé]** = exécuté ou mesuré, la preuve est citée ; **[à vérifier]** = raisonnement non encore vérifié.

---

## 1. Contexte

Exercice 06 :

```ts
const message = DEither.matchInformation(result, {
	"negative-operand": () => "un opérande est négatif",
	success: (value) => DString.to(value),
});
```

Sémantique d'exécution (`dist/either/matchInformation.mjs`, lue dans `node_modules`) : si l'entrée n'a ni information ni valeur, elle est renvoyée telle quelle. Sinon, on appelle `matcher[information](value)`, **sans garde-fou** : une information absente du matcher lève un `TypeError`. L'exhaustivité est garantie par TypeScript.

## 2. Options

| Option | Forme Go | − |
|---|---|---|
| A. `map[string]func(V) R` | table construite à l'exécution | allocation, appel indirect, types de handlers hétérogènes (arité 0 ou 1) |
| B. **`switch` sur `Information`** | un cas par clé, lue à la transpilation | aucun |

## 3. Décision : B

```go
var r T
switch e.Information {
case "negative-operand": r = coerce(h1(e.Value))
case "success":          r = coerce(h2(e.Value))
default: panic("matchInformation : information non gérée")
}
```

- Les **clés** de l'objet littéral sont lues à la transpilation (identifiant ou chaîne). Un matcher qui n'est pas un objet littéral est refusé.
- Chaque handler est un **callback** (ADR-7) : fonction fléchée ou référence de fonction, appelée avec la **valeur déballée**, et seulement dans son cas.
- T est le type de l'appel donné par TypeScript, regroupé par type Go (ADR-2). Dans l'ex. 06, `"un opérande est négatif" | string` donne `string`. Sinon, c'est l'union des types Go produits par les handlers.
- Le `default` qui panique reproduit le `TypeError` de JS.
- La forme curryfiée (`matchInformation({ … })` dans un `pipe`) devient un `func` literal (ADR-3, ADR-7).

## 4. Résultats [observé]

- Exercice **06 ✅**. Go produit :

```go
var Generated_17 string
switch Generated_16.Information {
	case "negative-operand":
		Generated_17 = func() (string) {
			return "un opérande est négatif"
		}()
	case "success":
		Generated_17 = func(Sourced_value float64) (string) {
			return shard_dependencies.JSNumberToString(Sourced_value)
		}(Generated_16.Value)
	default:
		panic("matchInformation : information non gérée")
}
```

- `go build -gcflags=-m` : les deux `func` literal sont inlinés (`can inline init.0.func3`, `init.0.func4`).
- Variante `06-match-curried` ✅ : forme curryfiée dans un `pipe`, handler qui lit la valeur d'un `Left`.

## 5. Limites

- **Entrée de forme `Plain`** (valeur nue, ADR-2) : JS la renvoie telle quelle ; ici, elle tomberait dans le `default` et paniquerait. Aucun exercice ne passe de valeur nue à `matchInformation`.
- **Handler avec paramètre sur une variante sans valeur** (`fail: (v) => …`) : JS passe `undefined`, alors que Go transmettrait la valeur zéro de V. Ce cas est refusé par la coercition des arguments (`callback-argument-type-mismatch`).
- `matchInformationOtherwise` et les combinaisons : non pris en charge.
