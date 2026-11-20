# Historique — chaînes de caractères

## `DString.to`

- **Piste écartée : `fmt.Sprint(n)`**. Son écriture diffère de JS dans plusieurs cas (grands nombres, notation exponentielle).
- **Piste retenue : `strconv.FormatFloat(n, 'f', -1, 64)`**. `-1` signifie « le moins de chiffres possible qui redonne exactement le même nombre », comme JS : `3` donne `"3"`, `0.1` donne `"0.1"`.
- Le résultat de `DString.to` sur un `number` est typé `string & Number` (une chaîne brandée) : il a fallu apprendre au transpileur que ce type est un simple `string` (voir `01-nombres-et-types`).
- Limite : pour |x| ≥ 1e21 ou < 1e-6, JS passe en notation exponentielle et pas nous ; `Infinity` s’écrit `+Inf` en Go.

## `DString.test`

1. **Première version (Louis-Martin)** : `regexp.MustCompile("[0-9]").MatchString(s)` à chaque appel. Correct, mais l’expression régulière était recompilée à chaque passage.
2. **Version actuelle** : la regex est une variable du package, compilée une seule fois au démarrage.

## `DString.length` : un écart que nous avons trouvé

En JS, `string.length` compte des **unités UTF-16**. Un emoji comme « 😀 » en vaut 2. Le transpileur utilise `utf8.RuneCountInString`, qui compte les **caractères Unicode** : « 😀 » vaut 1. Les chaînes ordinaires, même accentuées (« été »), donnent le même résultat ; les emojis et certains caractères rares, non.

**Correction proposée** (illustrée dans `exemple.go`) : compter en UTF-16 avec `len(utf16.Encode([]rune(s)))`. Elle n’est pas encore dans le transpileur.
