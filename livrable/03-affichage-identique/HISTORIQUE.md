# Historique — Une sortie identique à `console.log`

## 18/11 — Le constat (exercice 01)

Le premier `print` de l'exercice 01 affiche un Either sur 6 lignes, avec des clés entre guillemets
et une indentation de 2 espaces. Décision n°4 : la fonction Go `Print` imite le format de
`console.log` de Node, caractère par caractère, pour les types manipulés.

## 18/11 — Décision n°8 : un vrai fichier `.go`, pas des appels à l'AST Go

`Print` fait environ 300 lignes. Écrit avec les fonctions de construction de l'AST Go du
transpileur, il aurait été illisible. Écrit dans un vrai fichier `.go`, il reste lisible et peut
être testé seul contre Node.

Décision validée le 18/11 : le code Go commun qui n'est pas une traduction du TS (type `Either`,
constructeurs, `Print`) est écrit dans des fichiers `.go` rangés à côté du transformer qui
l'utilise, déclarés dans le champ `goFiles` de la shared dependency, et copiés tels quels dans
`shard_dependencies/` par `build.ts`. C'est la seule exception à la règle « tout le travail dans
`transformers/` ».

## 18/11 — Reproduire l'algorithme de Node

`print.go` reprend les fonctions de `util.inspect` (`formatValue`, `reduceToSingleString`,
`groupArrayElements`, `strEscape`) avec les mêmes constantes (80 colonnes, `compact` 3,
profondeur 2, 100 éléments au plus). Deux différences entre Go et JS y sont traitées à part :

- **les longueurs** : `len()` compte des octets en Go, JS compte des unités UTF-16 (`jsLength`) ;
- **les exposants** : Go écrit `1.5e-07`, JS écrit `1.5e-7`.

## 18/11 — Le banc de test contre Node

`brouillons/print-test` affiche les mêmes valeurs en TS et en Go, puis compare les deux sorties :
136 lignes de cas limites (`-0`, `5e-324`, `2 ** 53`, `0.1 + 0.2`, guillemets mêlés, `é`, `日本`,
`😀`, tableaux de 26, 30 et 120 éléments, profondeur 4, Either dans des tableaux).

## 19/11 — Réutilisation (exercice 05)

`DString.to` réutilise `formatNumber` de `Print`. Une seule différence : `` `${-0}` `` vaut `"0"`
en JS. Un tableau vide est `nil` en Go (`var x []T`), mais `Print` l'affiche bien `[]` (vérifié).
