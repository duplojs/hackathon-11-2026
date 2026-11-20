# Historique — contrôle de flux

## Une notion qui guide tout : les « préparations »

Une expression TypeScript ne devient pas toujours une seule expression Go. Un ternaire, par exemple, devient plusieurs instructions. Le transpileur renvoie donc, pour chaque expression, sa valeur **et** les instructions à exécuter avant (`before`). Tout le problème du contrôle de flux est de placer ces préparations au bon endroit.

## `if/else`

Les préparations de la condition vont **avant** le `if` : la condition est toujours évaluée. Celles d’une branche restent **dans** la branche. Pour un `else if`, la seconde condition est préparée dans le `else` : elle n’est calculée que si la première est fausse, comme en JS.

## Le ternaire

- **Piste écartée : un helper `ternary(c, a, b)`.** Court à écrire, mais en Go les arguments sont évalués avant l’appel : les deux branches seraient calculées. Si une branche appelle une fonction, le comportement change.
- **Piste retenue :** une variable dont le type est donné par le checker, puis un `if/else`. Seule la branche choisie est évaluée.

## `&&` et `||` : un bug du boilerplate

Le transformer binaire fourni calculait les deux opérandes dans des variables temporaires **avant** d’appliquer l’opérateur. Pour `a || f()`, `f()` aurait été appelée même quand `a` est vrai.

1. **Première correction (Aziz, projet 06)** : un transformer dédié qui produit toujours `t := a; if !t { t = b }`. Correct, mais verbeux.
2. **Affinage (Louis-Martin)** : le `||` de Go court-circuite déjà. Quand le côté droit n’a aucune préparation, on garde l’opérateur natif ; la forme `if` ne sert que lorsqu’il en a (un ternaire à droite, par exemple). Nous avons vérifié qu’une fonction à droite d’un `||` n’est pas appelée quand le côté gauche est vrai.

## Retours multiples

Aucune règle n’a été nécessaire : le type de retour est l’interface `Either` (voir `02-representation-either`).
