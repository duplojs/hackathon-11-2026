# ADR-5 : traduction de l'asynchronisme

- **Statut :** accepté — option A
- **Portée :** exercice 10 et API `rightAsyncPipe`, `asyncGroup`, `asyncPipe`
- **Dépend :** P2 (`async`/`await`) et P4 (`Promise<T>`)

## Contexte

L'exercice 10 combine des fonctions `async`, `await`, `rightAsyncPipe`,
`asyncGroup` et `DCommon.asyncPipe`. Le choix doit préserver l'ordre observable
des calculs et l'arrêt au premier `Left`, sans introduire une concurrence que
JavaScript n'exécute pas.

## Sémantique observée

- **[observé]** `asyncGroup` traite les fabriques dans l'ordre et attend chacune
  avant d'appeler la suivante. La troisième fabrique n'est pas appelée après un
  `Left`. Source : `node_modules/@duplojs/lang/dist/either/right/asyncGroup.mjs`
  et son `asyncReduce`.
- **[observé]** `rightAsyncPipe` attend l'entrée, propage un `Left`, puis appelle
  séquentiellement les étapes et s'arrête au premier `Left`. Une valeur finale
  nue est enveloppée une seule fois dans `Success`.
  Source : `node_modules/@duplojs/lang/dist/either/right/asyncPipe.mjs`.
- **[observé]** `DCommon.asyncPipe` attend l'entrée puis chaque étape, dans
  l'ordre. Source : `node_modules/@duplojs/lang/dist/common/asyncPipe.mjs`.
- **[observé]** dans `variations/10-sync-between`, le code synchrone qui suit la
  création du combinateur s'affiche avant les fabriques, qui ne démarrent qu'au
  `await`.
- **[observé]** le corps d'une fonction `async` démarre dès son appel ; son
  résultat est ensuite une `Promise`.

La sortie TypeScript brute de l'exercice 10 est :

```text
[ 'transaction annulée' ]
```

## Options

1. **A — appels synchrones séquentiels.** Les fonctions `async` deviennent des
   fonctions Go ordinaires ; chaque pipeline appelle ses étapes dans l'ordre.
2. **B — futures séquentielles** avec goroutines et channels : la sémantique
   pourrait être conservée en attendant chaque future, au prix d'une mécanique
   et d'allocations supplémentaires. Les mesures comparatives sont confiées à P4
   et ne sont pas disponibles sur cette branche.
3. **C — file de microtâches** pour simuler l'ordonnanceur JavaScript : modèle
   plus complexe, sans bénéfice pour les API séquentielles de l'exercice.

## Décision

Retenir **A**. L'implémentation réutilise les handlers séquentiels existants :
`rightAsyncPipe` reprend `rightPipe`, `asyncGroup` traite chaque fabrique dans
la boucle de groupement, et `DCommon.asyncPipe` reprend `pipe`. Aucun
parallélisme, goroutine ou channel n'est généré.

## Mesures de l'option B [observé]

Prototype Go écrit à la main de la logique de l'exercice 10 :
[`research/async/`](../../research/async/) ([`results.txt`](../../research/async/results.txt)).
Apple M4 (10 cœurs), macOS 15.6.1, go1.27.4 darwin/arm64, 17/11/2026.
Commande : `go test -run '^$' -bench . -benchmem -count 5 ./...` (depuis `research/async`).
Médiane de 5 passes [min..max] ; B/op, allocs/op et goroutines/op sont identiques
sur les 5 passes.

| Scénario | Version | ns/op médian [min..max] | B/op | allocs/op | goroutines/op |
|---|---|---:|---:|---:|---:|
| Entrées de l'ex. 10 (3e calcul en échec) | **A** (synchrone) | **13,7** [13,5..14,6] | 16 | 1 | 0 |
| | B séquentielle (futures) | 759,9 [755,8..761,7] | 592 | 10 | 3 |
| | B parallèle (interdite par la sémantique) | 937,0 [932,7..940,5] | 592 | 10 | 3 |
| Tout succès | **A** | **91,5** [91,4..92,0] | 50 | 2 | 0 |
| | B séquentielle | 886,8 [883,7..888,5] | 626 | 11 | 3 |
| | B parallèle (interdite) | 1 034,0 [1 032,0..1 042,0] | 626 | 11 | 3 |

Les tests du prototype vérifient que A et B donnent la même sortie. Après un
échec au 1er calcul, A et B n'appellent qu'**une** fabrique, comme DuploJS ;
la version parallèle en appelle **trois**, d'où son interdiction.

**Ce qu'on en conclut :** sur cette logique, B séquentielle coûte environ
**55 fois** le temps de A sur les entrées de l'exercice, et environ **10 fois**
en cas de succès complet, avec 9 allocations et 3 goroutines de plus par
exécution. C'est le coût du **mécanisme** (goroutine, channel,
synchronisation) sur un calcul trivial, que B n'apporte rien à compenser
puisque la sémantique est séquentielle.

**Ce qu'on n'en conclut pas :** le coût de futures dans un programme qui fait
de vraies entrées-sorties (réseau, fichiers), où le parallélisme peut
redevenir utile. Les exercices n'en contiennent aucune.

## Conséquences et limites

- Les chemins sans effet synchrone intercalé conservent les valeurs, l'ordre et
  l'arrêt au premier `Left`.
- **Écart assumé :** une fabrique d'`asyncGroup` peut s'exécuter dans le Go
  inliné avant un effet synchrone placé entre la création du combinateur et son
  `await`. La variante `10-sync-between` conserve cet écart comme test
  intentionnel ; elle ne doit pas être retirée.
- La forme objet d'`asyncGroup`, bien qu'acceptée par DuploJS, est refusée par le
  transpileur ; seule la forme tableau est prise en charge.
- Les véritables E/S asynchrones et leur ordonnancement ne sont pas représentés
  par l'option A.

## Go produit et validation

Le Go final de l'exercice 10 ne peut pas encore être observé sur cette branche :
`pnpm build:10` s'arrête avant la transformation des API async avec
`notfound-transformer` sur le type `DisplayError`. Le transformer
`Promise<T>` de P4 et les handlers `await` de P2 ne sont pas intégrés ici. Aucun
extrait Go ni résultat de comparaison n'est donc présenté comme vérifié.

Les cinq variantes 10 passent `tsc --noEmit` puis `tsx`. `projects/09` passe
toujours la transpilation, `go vet`, l'exécution Go et la comparaison de sortie.
La validation Go de 10 et la comparaison complète doivent être répétées après
intégration de P2 et P4. Voir [la fiche 10](../exercises/10.md).
