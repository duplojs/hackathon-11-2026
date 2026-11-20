# Chaînes de caractères

## Problématique

Comment traduire les fonctions de chaînes de DuploJS (`DString.to`, `DString.test`, `DString.includes`, `DString.length`) pour qu’elles donnent exactement le même résultat qu’en JS, alors que JS et Go ne représentent pas le texte de la même façon (UTF-16 contre UTF-8) ?

## Stratégie retenue

| DuploJS | Go | Remarque |
|---|---|---|
| `DString.to(n)` | `strconv.FormatFloat(n, 'f', -1, 64)` | Même écriture que JS pour les nombres usuels. |
| `DString.test(s, /re/)` | `re.MatchString(s)`, avec `re` compilée **une seule fois** au niveau du package | |
| `DString.includes(s, x)` | `strings.Contains(s, x)` | |
| `DString.length(s)` | **à corriger** : compter en unités UTF-16 | Le transpileur compte aujourd’hui les runes. |

## Exercices concernés

05 à 11.

## Fichiers

- `HISTORIQUE.md` : la regex recompilée à chaque appel, et l’écart de `length`.
- `exemple.ts` / `exemple.go` : les quatre fonctions, avec un emoji. Le Go illustre la **correction proposée** pour `length`.
