# Mesure des tuples homogènes

Compare deux représentations des 1000 triplets de l'exercice 08 :

- `[][]float64` : tableau de slices, chaque triplet étant une slice séparée ;
- `[][3]float64` : tableau de tableaux de taille fixe.

Chaque itération construit les entrées, lit les trois positions et calcule
`(one + two) / divisor`, comme dans l'exercice. Les mesures incluent donc la
construction de la représentation et le calcul.

## Reproduire

Depuis ce dossier :

```powershell
go test -run TestRepresentationsMatch
go test -bench . -benchmem -count 5
go test -run '^$' -gcflags=-m
```

Le relevé observé sur Windows 11 / amd64, Intel Core i7-9750H, Go 1.24.4 est
dans [`results.txt`](results.txt). Le test vérifie que les deux représentations
produisent le même total.
