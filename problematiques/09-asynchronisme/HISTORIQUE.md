# Historique — asynchronisme

## La piste naturelle : des goroutines (écartée)

Traduire chaque promesse par une goroutine et un canal, avec un `Promise[T]` et une méthode `Await()`. C’est l’équivalent Go le plus proche d’une promesse, et il permet le parallélisme.

```go
// Piste écartée
p1 := NewPromise(func() Either { return calculate("1", 1) })
p2 := NewPromise(func() Either { return calculate("2", 0) })
p3 := NewPromise(func() Either { return calculate("3", 3) }) // lancé quand même
```

## Ce que dit le runtime DuploJS

Avant de choisir, nous avons lu le code de `@duplojs/lang` :

- `asyncGroup` appelle les fonctions **une par une**, attend chaque résultat, et **s’arrête au premier échec** : les suivantes ne sont jamais appelées ;
- `rightAsyncPipe` et `asyncPipe` attendent chaque étape dans l’ordre.

Avec des goroutines, les trois calculs démarreraient ensemble, y compris après un échec. Si un calcul a un effet (écriture, appel réseau, affichage), **le comportement change**. L’exemple de ce dossier le rend visible : en Node, `calcul 3` n’est jamais affiché.

## Choix retenu

L’exécution synchrone reproduit exactement l’ordre et l’arrêt au premier échec. Elle est aussi la plus simple : pas de canal, pas de synchronisation. Ici, le synchrone ne fait perdre aucun parallélisme, puisque DuploJS lui-même exécute ces calculs l’un après l’autre.

## Limites et vision à long terme

- Un programme qui a besoin d’une **vraie concurrence** (plusieurs appels réseau indépendants, `Promise.all`) serait exécuté séquentiellement : plus lent, mais avec le même résultat.
- Piste : utiliser des goroutines uniquement là où l’ordre ne compte pas (`Promise.all` sur des opérations sans effet partagé). Cela demande une analyse des effets que nous n’avons pas faite.
- `Promise` est reconnu par son nom dans le type, et non par son symbole TypeScript.
