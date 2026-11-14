# Projet 00

## Problématique

### Traduire une addition

Comment traduire l’expression `one + two` en Go, alors que les paramètres sont déclarés comme des `number` en TypeScript ? Il faut choisir une représentation Go pour ces nombres et conserver l’opération d’addition.

### Appeler une fonction d’un module DuploJS

Dans `add.ts`, le résultat de l’addition est transmis à `DEither.success`, une fonction importée depuis `@duplojs/lang/either`. Comment traduire cet appel et représenter son résultat dans le programme Go ?

### Préparer un appel de fonction

Un appel comprend la fonction appelée et ses arguments. Certains de ces éléments peuvent demander des instructions avant que leur valeur soit disponible. Comment organiser la traduction pour permettre ces préparations et préserver l’ordre d’évaluation ?

## Solution

### Traduire une addition

```go
one := float64(1)
two := float64(2)
sum := one + two
```

Les valeurs TypeScript de type `number` sont représentées par des `float64` en Go parce que le type `number` suit la représentation IEEE 754 double précision, comme le type Go `float64`. Ce choix conserve la représentation numérique du langage source pendant la traduction. Les opérandes sont calculés avant l’addition et stockés dans `one` et `two`. La variable `sum` contient ensuite le résultat de l’opération. Si un opérande demande des instructions de préparation, elles peuvent être émises avant son affectation.

### Appeler une fonction d’un module DuploJS

```go
success := shard_dependencies.EitherSuccessOf[float64]
result := success(sum)
```

La référence à `DEither.success` est traduite vers une fonction de la dépendance Go partagée. Cette fonction construit le résultat `EitherSuccess` attendu par le programme source, au lieu de perdre l’information indiquant que la valeur est une réussite. La variable `success` prépare cette fonction avant l’appel. `sum`, calculé dans la solution précédente, lui est transmis pour construire le résultat Go correspondant.

### Préparer un appel de fonction

```go
callable := functionExpression
firstArgument := firstArgumentExpression
secondArgument := secondArgumentExpression
result := callable(firstArgument, secondArgument)
```

La fonction et chacun de ses arguments sont d’abord évalués dans leur ordre d’apparition, puis stockés dans des variables temporaires. L’appel n’a lieu qu’après ces évaluations. Une expression plus complexe peut produire des instructions de préparation avant de fournir sa valeur. Ce découpage conserve l’ordre d’évaluation quel que soit l’endroit où la fonction est définie ou la complexité de ses arguments.
