# Projet 08

## Problématique

### Traiter une collection de calculs

Dans `index.ts`, chaque entrée de `inputs` décrit un calcul distinct. `DArray.map` produit un résultat pour chaque entrée, puis un autre `map` transforme ces résultats en valeurs affichables selon leur issue. Comment appliquer une transformation à chaque élément d’une collection tout en conservant le résultat propre à chaque calcul, y compris lorsqu’il s’agit d’un échec ?

### Représenter un tableau de tuples

`inputs` est typé comme un tableau de tuples `[number, number, number]`. Chaque tuple contient un nombre fixe de valeurs dont la position donne le rôle. Comment représenter cette structure en Go sans perdre sa cardinalité ni l’association entre chaque position et sa signification ?

### Déconstruire une entrée structurée dans un paramètre

La fonction passée au premier `DArray.map` reçoit un tuple et le décompose directement dans son paramètre avec `([one, two, divisor])`. Comment traduire cette déconstruction positionnelle en Go, qui ne permet pas cette forme de liaison dans les paramètres d’une fonction, tout en associant chaque valeur à la bonne variable ?

La décision ADR-11 conserve `[][]float64` pour ces tuples homogènes. Le paramètre
déstructuré devient un slice Go et les liaisons utiles sont lues par indice ;
les noms jamais utilisés ne sont pas déclarés. Le benchmark comparatif avec
`[][3]float64` est documenté dans
[research/tuples](../../research/tuples/README.md).

La même règle s'applique à `const [a, b] = expr` : la source est évaluée une
fois avant les lectures d'indices. Voir
[docs/exercises/08.md](../../docs/exercises/08.md).
