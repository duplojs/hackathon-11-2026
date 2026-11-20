# Historique — rétrécissement de type

## Le problème

Go n’a pas de types union. Une variable déclarée `Either` reste un `Either`, même après un test qui, en TypeScript, la rétrécit en `string`.

## Pistes explorées

### Piste A — une variable `any` (proposée par Aziz, écartée)

Déclarer la variable en `any`, puis la convertir (`x.(string)` ou `x.(Either)`) à chaque lecture selon le type que le checker donne à cet endroit. Correct, mais chaque lecture, y compris le test `isLeft`, demande une conversion, et une valeur brute serait boxée.

### Piste B — la variable reste un `Either` (retenue, implémentée par Louis-Martin)

`unwrapRight` est traduit comme un passage direct : la variable garde l’Either. Le test `isLeft` est un simple appel de méthode. Ce n’est qu’aux lectures où le checker a rétréci le type à autre chose qu’un Either que le transpileur insère `GetValue().(string)`.

## Suivre les variables concernées

- **Première version** : les variables issues de `unwrapRight` étaient retenues par leur **nom**. Deux variables de même nom dans deux fonctions différentes pouvaient être confondues.
- **Version actuelle (Louis-Martin)** : elles sont retenues par leur **symbole** TypeScript, unique pour chaque déclaration.

## Limites

- Chaque lecture rétrécie fait une conversion à l’exécution.
- Le principe est général, mais il n’est appliqué aujourd’hui qu’aux variables issues de `unwrapRight`.
