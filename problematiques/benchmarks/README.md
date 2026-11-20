# Benchmarks (bonus)

## Ce que nous mesurons

Le coût de notre représentation des Either (voir `02-representation-either`) : une fonction `add` qui renvoie

1. un type concret (`Success<number>` seul) ;
2. une union, donc l’interface `Either`, dans le cas succès ;
3. la même union, dans le cas `left`.

Le Go mesuré est réécrit à la main dans `add_test.go`, à l’identique de ce que produit le transpileur. La référence Node exécute le TypeScript d’origine avec `@duplojs/lang` (`bench.ts`).

## Résultats

Une machine, Go 1.27.4 et Node 22.19, médiane de 3 runs. Côté Node, 5 millions d’appels après chauffe.

**Code de ce dossier** (`add_test.go` et `bench.ts`) :

| Appel de `add` | Node | Go | Allocations Go |
|---|---|---|---|
| Renvoie `Success<number>` (type concret) | 394 ns | 0,45 ns | 0 |
| Renvoie une union, cas succès | 415 ns | 19,8 ns | 1 (24 octets) |
| Renvoie une union, cas `left` | 144 ns | 19,5 ns | 1 (24 octets) |

**Code réellement généré par le transpileur** (projets 00 et 06), mesuré de la même façon : 0,49 ns sans allocation pour le type concret ; 21,5 ns et 32 octets pour l’union en succès ; 18,1 ns et 24 octets pour l’union en `left`.

## Lecture

- **Type concret** : `add` est entièrement inlinée par Go (coût 18 sur un seuil de 80 dans le code généré) et ne fait aucune allocation.
- **Union** : la conversion vers l’interface `Either` alloue sur le tas, ce que confirme `go build -gcflags=-m` (`escapes to heap`). C’est le prix d’une représentation qui fonctionne avec n’importe quel nombre de variantes.
- **32 octets au lieu de 24** dans le code généré : la struct `EitherSuccess` générée se termine par un champ marqueur vide (`Success JSNull`). En Go, un champ de taille nulle placé en dernier ajoute du remplissage pour que son adresse reste valide. Placer les champs marqueurs en premier ramènerait l’allocation à 24 octets : une optimisation simple, pas encore faite.
- Le Go reste de 7 à plus de 800 fois plus rapide que Node sur ces mesures.

Ce sont des microbenchmarks sur une seule machine : un ordre de grandeur, pas une promesse. Nous n’avons pas mesuré de programme complet.

## Reproduire

```sh
cd problematiques/benchmarks
go test -bench . -benchmem -count 3
go build -gcflags=-m ./... 2>&1 | grep heap

cd ../..
node_modules/.bin/tsx problematiques/benchmarks/bench.ts
```
