# Historique — affichage et vérification

## Reproduire le format de Node ? (écarté)

`print` appelle `console.info`, qui affiche avec `util.inspect` : quotes simples, `undefined` visible, retours à la ligne selon la longueur. Le reproduire demandait un formateur Go complet. Or le transpileur ne produit du Go que par un arbre syntaxique (AST), sans possibilité d’insérer du Go écrit à la main : ce formateur aurait représenté des centaines de nœuds à construire un par un.

## Le JSON (retenu)

Le boilerplate avait déjà mis des tags `json` sur `EitherSuccess` et une méthode `MarshalJSON` sur `JSNull` et `JSUndefined`. Nous avons donc choisi `encoding/json` :

- une chaîne seule est affichée brute, comme `console.info("texte")` ;
- une valeur `undefined` est omise grâce au tag `omitzero`, comme avec `JSON.stringify` ;
- les données affichées (clés, valeurs, ordre) sont les mêmes que dans Node ; seul le format diffère.

## Comment nous prouvons que le comportement est conservé

1. Côté Node, un petit module chargé avant le programme remplace `console.info` et `console.log` par `JSON.stringify(valeur, null, 2)`.
2. On compare cette sortie à celle de `go run .` avec `diff`, octet par octet.
3. Chaque programme Go doit aussi passer `go vet`.

Résultat : **les 12 projets donnent une sortie identique.** Cette méthode a aussi permis de trouver des écarts que les exercices ne montraient pas : `left("…")` sans valeur, et `DString.length` sur un emoji.

## Limites

- Le format d’affichage reste différent de la console Node.
- `-0` : le JSON de Go affiche `-0`, `JSON.stringify` affiche `0`.
- `encoding/json` utilise la réflexion : l’affichage n’est pas optimisé, ce qui est acceptable pour un `print`.
