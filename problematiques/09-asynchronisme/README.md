# Asynchronisme

## Problématique

Le projet 10 utilise `async`, `await`, `Promise`, `DEither.rightAsyncPipe`, `DEither.asyncGroup` et `DCommon.asyncPipe`. Go n’a ni promesses ni `await`. Comment traduire ce flux sans changer l’ordre des opérations, ni le moment où un échec interrompt les calculs suivants ?

## Stratégie retenue

Une exécution **synchrone** : une fonction `async` qui renvoie `Promise<T>` devient une fonction Go qui renvoie `T`, et `await e` devient `e`. `asyncGroup` appelle chaque fonction l’une après l’autre et s’arrête au premier échec.

## Exercices concernés

10.

## Fichiers

- `HISTORIQUE.md` : pourquoi les goroutines ont été écartées.
- `exemple.ts` / `exemple.go` : un `asyncGroup` dont le deuxième calcul échoue ; le troisième n’est jamais lancé.
