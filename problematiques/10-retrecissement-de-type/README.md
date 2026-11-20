# Rétrécissement de type

## Problématique

`DEither.unwrapRight` renvoie la valeur d’un `Right`, ou l’Either lui-même sinon : son type est une union **mixte**, `string | Left<…> | Error<null>`. Après `if (DEither.isLeft(checked)) return checked;`, TypeScript sait que `checked` est un `string` : c’est le rétrécissement de type. En Go, une variable garde le même type du début à la fin. Comment traduire ce raisonnement ?

## Stratégie retenue

- `unwrapRight` ne change rien à l’exécution : la variable reste un `Either`.
- `isLeft(x)` devient `!x.IsRight()`.
- Aux endroits où TypeScript a rétréci le type, et seulement là, la valeur est lue avec `x.GetValue().(string)`. Le type vient du checker.

## Exercices concernés

11 (exemple présenté pendant le hackathon).

## Fichiers

- `HISTORIQUE.md` : les deux représentations envisagées et le suivi des variables.
- `exemple.ts` / `exemple.go` : la longueur d’un nom d’utilisateur validé, ou la raison du refus.
