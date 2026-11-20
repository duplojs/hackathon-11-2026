# Collections et tuples

## Problématique

Comment représenter un tableau de tuples `[number, number, number][]`, déstructurer un tuple dans un paramètre (`([one, two, divisor]) => …`, impossible en Go), appliquer une transformation à chaque élément (`DArray.map`) et regrouper plusieurs résultats en une transaction (`DEither.group`), en gardant la taille, l’ordre et le type de chaque élément ?

## Stratégie retenue

- **Tuple** → struct générique `Tuple3[T0, T1, T2]` (de `Tuple2` à `Tuple8`).
- **Déstructuration** → un seul paramètre, puis une variable par position en tête de fonction.
- **`map`** → slice alloué une fois à la bonne taille, puis une boucle.
- **`group`** → une boucle qui s’arrête au premier échec.

## Exercices concernés

05, 08, 09, 10.

## Fichiers

- `HISTORIQUE.md` : de `[][]float64` à `Tuple3`, et la sémantique de `group`.
- `exemple.ts` / `exemple.go` : trois calculs sur des tuples, regroupés en transaction.
