# Option A contre option B pour l'asynchronisme (ADR-5)

Prototype Go **écrit à la main** de la logique de l'exercice 10 : 3 calculs (`rightAsyncPipe` : `add`, `divide`, ×2), regroupés par `asyncGroup` avec arrêt au premier gauche, puis affichés (`whenIsRightOtherwise`). Les types reprennent la représentation du transpileur : `Either[float64]` par valeur (ADR-1), `Either2[float64, []float64]` pour le résultat du groupe (ADR-12).

| Version | Modèle | Statut |
|---|---|---|
| `RunA` | Exécution **synchrone séquentielle** : ce que produit le transpileur (option A) | décision de l'ADR-5 |
| `RunB` | Un **future** par calcul (goroutine et channel `chan Either` de capacité 1), attendu avant de démarrer le suivant | fidèle à la sémantique Q1, comparaison de coût |
| `RunBParallel` | Toutes les fabriques démarrent d'emblée, comme un `Promise.all` | **interdit par la sémantique** (Q1) : montré pour la différence observable |

## Comportement [observé]

`go test -v -run Test ./...` :
- `TestSameOutputAAndB` : A et B donnent la même sortie sur les entrées de l'ex. 10 (`[transaction annulée]`), sur un échec au 1er calcul, et sur un succès complet (`[6 6 10]`).
- `TestCallsMatchQ1` : sur un échec au **1er** calcul, A et B n'appellent qu'**une** fabrique, comme DuploJS ; `RunBParallel` en appelle **3**. C'est la différence observable qui interdit la version parallèle (avec des effets dans les fabriques, l'ordre et le nombre d'affichages changeraient).

## Mesures [observé]

Apple M4 (10 cœurs), macOS 15.6.1, go1.27.4 darwin/arm64. Commande : `go test -run '^$' -bench . -benchmem -count 5 ./...`. Médiane de 5 passes [min..max] ; B/op, allocs/op et goroutines/op sont identiques sur les 5 passes. Détail : [`results.txt`](results.txt).

| Scénario | Version | ns/op médian [min..max] | B/op | allocs/op | goroutines/op |
|---|---|---:|---:|---:|---:|
| Entrées de l'ex. 10 (3e calcul en échec) | **A** | **13,7** [13,5..14,6] | 16 | 1 | 0 |
| | B séquentielle | 759,9 [755,8..761,7] | 592 | 10 | 3 |
| | B parallèle (interdite) | 937,0 [932,7..940,5] | 592 | 10 | 3 |
| Tout succès | **A** | **91,5** [91,4..92,0] | 50 | 2 | 0 |
| | B séquentielle | 886,8 [883,7..888,5] | 626 | 11 | 3 |
| | B parallèle (interdite) | 1 034,0 [1 032,0..1 042,0] | 626 | 11 | 3 |

## Lecture

- Sur ce scénario, B séquentielle coûte environ **55 fois** le temps de A sur les entrées de l'ex. 10, et environ **10 fois** en cas de succès complet. Elle ajoute 9 allocations et 3 goroutines par exécution. Le calcul lui-même est trivial : on mesure **le coût du mécanisme** (création de goroutine, channel, synchronisation).
- B parallèle n'est pas plus rapide ici : le travail de chaque calcul est trop petit pour compenser la création des goroutines. Surtout, elle **change le comportement** (fabriques appelées après un échec).
- Ce que l'on n'en conclut pas : le coût d'un vrai programme asynchrone avec des E/S (attentes réseau, fichiers), où des futures ou des goroutines retrouvent leur intérêt. Dans les exercices, il n'y a aucune E/S : l'asynchronisme de DuploJS est séquentiel et purement « de forme ».

## Reproduire

```bash
cd research/async
go test -v -run Test ./...
go test -run '^$' -bench . -benchmem -count 5 ./...
```
