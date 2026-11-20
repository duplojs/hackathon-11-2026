# Historique — collections et tuples

## Les tuples

1. **Première version (Louis-Martin)** : `[][]float64`, un slice de slices. Simple et fonctionnel, mais la taille fixe du tuple est perdue, chaque tuple est une allocation séparée, et un tuple de types différents (`[number, string]`) devient impossible.
2. **Piste envisagée** : `[3]float64`, un tableau Go de taille fixe. Il garde la taille, mais seulement pour des tuples dont toutes les cases ont le même type.
3. **Piste retenue (Louis-Martin)** : une struct générique par taille, `Tuple2` à `Tuple8`, avec des champs `V0`, `V1`… Elle garde la taille **et** le type de chaque position. Une méthode `MarshalJSON` l’affiche comme un tableau JSON, identique à `JSON.stringify`.

## La déstructuration dans un paramètre

Go ne permet pas `func([one, two, divisor])`. La fonction reçoit donc un seul paramètre, le tuple, et chaque nom est lié à sa position au début du corps : `one := p.V0`. Un tableau donne `p[0]`, un objet `p.Champ`.

## `DArray.map`

Le résultat a la même taille que l’entrée : il est alloué **une seule fois** avec `make`, puis rempli dans l’ordre. Avec `append`, Go aurait réalloué et recopié le slice plusieurs fois.

## `DEither.group`

Le runtime parcourt les résultats dans l’ordre et s’arrête au premier qui n’est pas un `Right`. Notre boucle fait de même avec un `break`. Si tout réussit, la transaction est un `success` contenant les valeurs. Avec un tableau littéral de fonctions (`asyncGroup`, voir `09-asynchronisme`), chaque fonction n’est appelée que si les précédentes ont réussi.

## Limites

- Pas de tuple de plus de 8 positions.
- Les valeurs sont lues avec `GetValue().(float64)` : une assertion à l’exécution par élément.
