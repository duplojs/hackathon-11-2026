# ADR-14 : objets, génériques, affectations et boucles

- **Statut :** proposé (Sprint 7), implémenté sur la branche `sprint7/objects`
- **Date :** 2026-11-18
- **Dépend :** ADR-13 (unions étiquetées, coercition compositionnelle)
- **Code :** [`type/object.ts`](../../src/transpiler/transformers/type/object.ts), [`type/typeAlias.ts`](../../src/transpiler/transformers/type/typeAlias.ts), [`expression/object.ts`](../../src/transpiler/transformers/expression/object.ts), [`statement/loop.ts`](../../src/transpiler/transformers/statement/loop.ts), [`statement/assignment.ts`](../../src/transpiler/transformers/statement/assignment.ts)

> Légende : **[observé]** = exécuté ou mesuré, la preuve est citée ; **[à vérifier]** = raisonnement non encore vérifié.

---

## 1. Contexte [observé]

Après l'ADR-13, des sondes (18/11, `main` `e03a675`) refusaient encore des constructions présentes dans presque tout projet réel :
- objet littéral `{ name: "a" }`, interface, union d'objets (`{ name: string } | { age: number }`) ;
- alias générique `Box<T>` ;
- parenthèses `(a + 1)` ;
- `for…of`, `while`, `for` ;
- `x = …`, `x += …` ;
- tuple hétérogène `[string, number]`.

## 2. Décisions

### 2.1 Objet : struct anonyme Go, par valeur

```go
struct {
	P_name string "js:\"name\""
	P_email shard_dependencies.Union2[shard_dependencies.JSUndefined, string] "js:\"email,optional\""
}
```

- Les champs suivent l'**ordre des propriétés du type TS** : c'est l'ordre d'affichage de `print`.
- Le nom Go est `P_<nom>` (exporté) ; le **tag** porte le nom JS exact.
- Deux structs anonymes de mêmes champs sont **le même type Go** : le typage structurel de TS est conservé sans inventer de noms de types.
- Une propriété optionnelle est une union avec `undefined` (ADR-13). Absente, elle n'est pas affichée, comme en JS.
- **Struct → struct** (coercition) : champ par champ, récursivement. Un champ absent de la source doit être optionnel dans la cible ; un champ en trop est ignoré, comme l'autorise TypeScript.
- **Union d'objets** : union étiquetée de structs.
  - Un champ commun (`shape.kind`) est lu par étiquette.
  - `shape.kind === "circle"` rétrécit `shape` (ADR-13), et `shape.radius` lit alors le bon membre.
  - `"name" in value` teste l'étiquette des membres qui déclarent le champ.
- **Littéral `{ … }`** : valeurs évaluées dans l'ordre du littéral (ordre JS), spread compris. La struct est construite dans le propre type du littéral, puis les frontières (ADR-13) la convertissent vers le type attendu.
- **`print`** : les structs sont parcourues par réflexion (affichage seulement) ; la clé vient du tag.

### 2.2 Alias et interfaces génériques

`type Box<T>`, `interface Page<T> extends Meta`, paramètres par défaut : la définition est traduite en **substituant** chaque paramètre par l'argument du site. Les substitutions forment une pile de portées : un argument se traduit dans la portée extérieure, ce qui permet `Box<Box<string>>`. Pour les interfaces, les champs hérités (`extends`) viennent en premier, et les déclarations fusionnées sont réunies.

### 2.3 Tuple hétérogène

`[string, number]` devient `[]Union2[float64, string]` : un tableau en JS (affichage, `length`, itération). La lecture d'une position connue (`t[0]`, `const [a, b] = t`) est **rétrécie** vers le type que TypeScript connaît à cette position. Le tuple homogène reste `[]T` (ADR-11).

### 2.4 Accès

- `a.b` et `a["b"]` : champ de struct.
- `a.length` : `float64(len(a))` pour un slice. Pour une chaîne, on compte les unités UTF-16, comme JS.
- `a[i]` : `a[int(i)]`. Si le type est `T | undefined` (`noUncheckedIndexedAccess`), l'accès est **borné** et rend `undefined` hors limites ou pour un index non entier, comme JS.
- `x!`, `x as T`, `x satisfies T` : rétrécissement ou conversion vers le type annoncé.
- `(e)` : la valeur de `e`. Un résultat composé est rangé dans une variable, pour que la priorité des opérateurs Go ne change pas le sens.

### 2.5 Affectations et `let`

- `x = e` (valeur convertie vers le type **déclaré** de `x`), `+=`, `-=`, `*=`, `/=`, `%=` (`math.Mod`), `++` et `--`.
- Les lectures suivantes suivent le rétrécissement de TypeScript (ADR-13). C'est sûr parce que TS rétrécit d'après la dernière affectation.
- `let x: T;` sans valeur : si `T` contient `undefined`, la variable Go est initialisée à ce membre (valeur JS initiale), sinon à la valeur zéro.

### 2.6 Boucles

| TS | Go |
|---|---|
| `for (const x of a)` | `for _, x := range a` (variable omise si elle n'est pas lue ; destructuration acceptée) |
| `while (c)` | `for c { … }`, ou `for { before(c); if !c { break }; … }` si la condition a des préparations |
| `for (init; c; post)` | `for init; ; post { before(c); if !c { break }; … }` : `continue` passe par `post`, puis par la condition. Une variable par tour (Go 1.22), comme `let` |
| `do { … } while (c)` | `for { …; before(c); if !c { break } }` (refusé si le corps contient `continue`) |
| `break`, `continue` | identiques |

## 3. Résultats [observé]

Apple M4, macOS 15.6.1, go1.27.4, Node v22.19.0, 18/11/2026, branche `sprint7/objects` sur `main` `e03a675`.

- `./scripts/check-all.sh` : **11/11**. Le Go des 11 exercices est **identique** à celui de `e03a675` (`diff -r`), hors `shard_dependencies.go`, qui gagne l'affichage des structs.
- `./scripts/check-all.sh --variations` : **55/57**. Seuls les deux échecs connus restent (`03-curried-stored`, `10-sync-between`). Les 4 variantes `12-*` et les 10 `11-*` passent ([variations/README.md](../../variations/README.md)).
- `go build -gcflags=-m` sur `12-object-basic`, `12-object-union` et `12-generic-alias` : **aucune struct sur le tas**. Seuls s'échappent les chaînes concaténées et les slices.

Go produit pour `area(shape: Shape)` (union discriminée, variante `12-object-union`), en tête :

```go
func Sourced_area(Sourced_shape shard_dependencies.Union2[struct {
	P_kind string "js:\"kind\""
	P_radius float64 "js:\"radius\""
}, struct {
	P_kind string "js:\"kind\""
	P_width float64 "js:\"width\""
	P_height float64 "js:\"height\""
}]) (float64) {
```

## 4. Limites

- **Modifier un objet** (`user.name = …`, `a[i] = …`) : refusé explicitement (`object-mutation-not-supported`). Un objet JS est une référence partagée, une struct Go une valeur copiée : la modification ne serait pas vue par les autres références. Il faudrait des pointeurs, avec un coût d'allocation.
- **Ordre d'affichage** : celui du type. Si un littéral liste ses propriétés dans un autre ordre que son type annoncé, `print` diffère de JS **[à vérifier : non couvert par une variante]**.
- **Méthodes, classes, `this`, getters**, signatures d'index (`Record<string, T>`), `Map` et `Set` : non pris en charge.
- **Autres syntaxes** :
  - `?.` (chaînage optionnel), étiquettes (`break label`), `for…in`, `switch` ;
  - `continue` dans un `do…while` : refusé explicitement (`do-while-with-continue-not-supported`), car il doit passer par la condition ;
  - affectation utilisée comme expression (`a = b = 1`, `f(i++)`).
- **Génériques** : les fonctions génériques de l'utilisateur (`function id<T>(x: T)`) ne sont pas monomorphisées.
- `===` entre deux objets (égalité de référence en JS) : non pris en charge.
