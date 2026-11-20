# 09 · Asynchronisme : `async`, `await`, `Promise`

**Projet concerné** : 10.

## Problématique

Le projet 10 utilise des fonctions `async`, `await`, `DEither.rightAsyncPipe`, `DEither.asyncGroup` et `DCommon.asyncPipe`. Go n'a ni `Promise` ni `await`, et son modèle de concurrence (goroutines, parallélisme réel) est **différent** de celui de JavaScript (un seul fil, boucle d'événements, entrelacement aux `await`).

Comment traduire ce flux **sans changer l'ordre des opérations** ni le moment où les résultats deviennent disponibles ?

## Stratégie retenue : l'aplatissement, avec ses conditions de validité

- `Promise<T>` → `T` ;
- `async function f()` → fonction Go synchrone ;
- `await expr` → `expr` ;
- `rightAsyncPipe` / `asyncGroup` / `asyncPipe` → mêmes traductions que leurs versions synchrones (problématiques 06 et 08).

**Pourquoi c'est juste ici** : nous avons vérifié dans le code de DuploJS que `asyncGroup` est **séquentiel** (`asyncReduce` : chaque getter est attendu avant d'appeler le suivant) et **paresseux** (arrêt au premier échec). Sans entrées-sorties réelles et avec chaque promesse attendue avant la suite, l'ordre observable est **identique**.

## Exemple : ce qui marche, et la limite

```bash
pnpm exec tsx problematiques/analyse-detaillee/09-asynchronisme/exemples/exemple.ts
cd problematiques/analyse-detaillee && go run ./09-asynchronisme/exemples
```

| Cas | JavaScript | Go aplati | Go boucle d'événements | Go goroutines |
|---|---|---|---|---|
| `asyncGroup` (projet 10) | 2 calculs, `annulée` | ✅ identique | ✅ | ⚠️ 3 calculs (sémantique changée) |
| Deux tâches lancées puis attendues | `A1 B1 A2 B2` | ❌ `A1 A2 B1 B2` | ✅ `A1 B1 A2 B2` | ❌ non déterministe |

L'exemple Go contient les **trois** stratégies, toutes exécutables ([`alternatives.go`](exemples/alternatives.go)).

Voir [HISTORIQUE.md](HISTORIQUE.md).
