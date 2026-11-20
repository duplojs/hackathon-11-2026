# Historique des réflexions · 09 Asynchronisme

## 1. Comprendre ce qu'il faut préserver

En JavaScript, une fonction `async` s'exécute **de façon synchrone jusqu'à son premier `await`**. Ensuite, sa suite est placée dans la file des microtâches. Les effets observables sont donc :

- l'ordre des effets **dans** une tâche ;
- l'**entrelacement** entre tâches, qui a lieu seulement aux `await` ;
- pour DuploJS, l'ordre d'appel des getters et l'arrêt au premier échec.

Nous avons lu `dist/either/right/asyncGroup.mjs` : il s'agit d'un `asyncReduce` séquentiel, et non d'un `Promise.all`. **Les getters ne s'exécutent jamais en parallèle.**

## 2. Pistes explorées

| Piste | Principe | Fidélité | Complexité | Décision |
|---|---|---|---|---|
| **A. Aplatissement** | `Promise<T>` → `T`, `await e` → `e` | ✅ quand chaque promesse est attendue avant la suite (cas du projet 10). ❌ en cas d'entrelacement | Faible | ✅ **Retenu pour le projet 10** |
| **B. Goroutine par promesse** | `Promise[T]` = canal, `await` = réception | ❌ Parallélisme réel : ordre non déterministe. Dans `asyncGroup`, tous les getters sont exécutés (mesuré : 3 au lieu de 2) | Moyenne | ❌ Change la sémantique |
| **C. Boucle d'événements + machine à états** | Chaque `await` coupe la fonction, et la suite va dans une file de microtâches | ✅ Reproduit l'entrelacement exact (démontré dans `alternatives.go`) | Élevée : transformation CPS de tout corps `async` (boucles, `try`, variables vivantes) | 🔭 **Vision long terme** |

### Pourquoi A pour l'instant

- C'est la seule piste qui donne un Go **lisible** et sans runtime.
- Elle est **exacte** pour le projet 10 : vérifié octet par octet avec la sortie de `tsx`.
- Nous connaissons et documentons sa limite (exemple 2 du dossier) au lieu de la cacher.

### Pourquoi pas B, malgré l'attrait du parallélisme

Le parallélisme est une **optimisation**, pas une traduction. Lancer tous les getters de `asyncGroup` en goroutines exécuterait des calculs que DuploJS n'aurait jamais lancés (après un échec), dans un ordre aléatoire. Pour un calcul pur, c'est sans conséquence visible ; pour un appel réseau ou une écriture en base, c'est un **changement de comportement**.

## 3. Ce qui a été ajouté au transpileur

- `await expr` → `expr`, et `Promise<T>` est remplacé par son type résolu (via le checker) ;
- `rightAsyncPipe`, `asyncGroup` et `asyncPipe` réutilisent les traductions synchrones ;
- `asyncGroup` sur un **tuple** de getters a fait apparaître le bug du conteneur fixe `[3]float64` (problématique 08).

## 4. Vision à long terme

1. **Analyse d'échappement des promesses** : à la compilation, détecter qu'une promesse est stockée sans être attendue immédiatement (`const first = task("A")`, puis une autre tâche). Si ce n'est jamais le cas, appliquer A. Sinon, refuser explicitement ou basculer sur C. Ainsi, A ne serait plus jamais utilisée hors de ses conditions de validité.
2. **Stratégie C** pour les fonctions concernées uniquement : machine à états générée, avec un runtime `eventLoop` minimal comme dans `alternatives.go`.
3. **Vraies entrées-sorties** : une goroutine par opération d'E/S, dont le résultat est **remis dans la boucle d'événements** (canal vers la file de microtâches). C'est le modèle de Node.js (libuv) : le parallélisme reste dans les E/S, et le code utilisateur garde l'ordre JavaScript.
4. **Parallélisme opt-in** : proposer B seulement pour les fonctions DuploJS documentées comme parallèles (un éventuel `Promise.all`), ou sur annotation explicite.
