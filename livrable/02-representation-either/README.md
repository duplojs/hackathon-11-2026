# 02 — Représenter un Either en Go

**Exercices concernés** : 00 à 07. **État** : traité.

## La problématique

En DuploJS, un Either est un objet JS marqué par des clés « kind » :

```
{ '@duplojs/lang/kind/@DuplojsLangEither/right': null,
  '@duplojs/lang/kind/@DuplojsLangEither/information': 'success',
  '@duplojs/lang/kind/@DuplojsLangEither/value': 3,
  '@duplojs/lang/kind/@DuplojsLangEither/success': null }
```

Une fonction renvoie une **union** de variantes (`Success<number> | Fail`,
`Left<"negative-operand", number> | Success<number>`). Go n'a pas d'unions. Il faut une
représentation qui garde le type des valeurs, coûte peu, et s'affiche exactement comme Node.

## Stratégie de l'équipe : un struct générique, passé par valeur (décision n°1)

```go
type Either[L any, R any] struct {
	IsRight     bool
	Information string // "success", "negative-operand"…
	Kind        string // "success", "fail"… ; "" pour left() / right()
	Left        L      // valeur si IsRight == false
	Right       R      // valeur si IsRight == true
}
```

| TypeScript | Go |
|---|---|
| `Success<number> \| Fail` | `Either[JSUndefined, float64]` |
| `Left<"negative-operand", number> \| Success<number>` | `Either[float64, float64]` |
| `DEither.success(x)` | `EitherSuccessOf[L, R](x)` |
| `DEither.fail()` | `EitherFailOf[L, R]()` |
| `DEither.left("info", x)` | `EitherLeftOf[L, R]("info", x)` |
| `DEither.isRight(e)` | `e.IsRight` (lecture d'un champ) |

- `L` réunit les valeurs des variantes Left, `R` celles des variantes Right. Un côté sans valeur
  prend `JSUndefined`, un struct vide (0 octet) que `Print` affiche `undefined`.
- **`Kind`** : `DEither.success(3)` affiche une clé `success: null` que `DEither.right("success", 3)`
  n'a pas. Sans ce champ, la sortie ne peut pas être identique.
- **`[L, R]` toujours écrits** : Go ne peut pas deviner `L` à partir de `success(x)`, et Go 1.27.4
  refuse de ranger une fonction générique non instanciée dans une variable. `L` et `R` viennent du
  type TS attendu (par exemple le type de retour de la fonction).
- **Un seul handler pour les constructeurs** (`either/constructor`) : `success`, `fail` et `left`
  ne diffèrent que par la fonction Go appelée.

## Pourquoi pas `any`

Mesures de l'équipe (`brouillons/BENCHMARKS.md`, `brouillons/benchmark-either`) : créer l'Either
de `add(1, 2)` puis lire sa valeur coûte ~13 ns et **0 allocation** avec le struct typé, contre
~26 ns et **1 allocation** (8 octets) quand la valeur est rangée dans un champ `any`. Sur
l'exemple de l'encadrant (`brouillons/prof/go`), la version typée fait 0 allocation par appel,
contre 2 à 11 pour une version en `any`.

Avec le struct typé, rien n'est « emballé » en mémoire, et c'est le compilateur Go qui vérifie le
type des valeurs.

## Résultat

- `./scripts/compare.sh 00` à `07` : sorties identiques.
- `exemples/struct-generique` : la stratégie écrite à la main donne la même sortie que la
  référence TS (22 lignes).

## Limites

- **Deux variantes d'un même côté avec des valeurs de types Go différents**
  (`Fail | Left<"x", number>`) : un seul `L` ne suffit pas. Le build s'arrête avec l'erreur
  `either-side-with-several-go-types` (`brouillons/variations-01/erreur-left.ts`). Aucun exercice de
  00 à 10 ne le fait. L'exemple de l'encadrant le fait (`undefined` et `null`).
- Une même information des deux côtés (`Left<"x"> | Right<"x">`) est refusée.
- La variante `Right` n'est pas dans la table des types (`erreur-variante.ts`). Dans l'exemple,
  `DEither.right(...)` est écrit à la main.
- `Information` est une `string`. Des constantes entières seraient une optimisation, documentée
  mais pas faite (décision n°2).
- Un constructeur passé comme valeur (`DCommon.pipe(x, DEither.success)`) est refusé
  (`either-constructor-used-as-value`).

Voir aussi : [HISTORIQUE.md](HISTORIQUE.md).
