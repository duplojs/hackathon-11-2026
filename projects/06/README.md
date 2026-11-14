# Projet 06

## Problématique

### Représenter et traiter des erreurs identifiées

Dans `add.ts`, un échec contient une information, `negative-operand`, ainsi que la valeur de l’opérande concerné. Dans `index.ts`, `DEither.matchInformation` choisit ensuite un traitement selon que le résultat porte cette information ou l’information `success`. Comment représenter des erreurs identifiées avec leur contexte, puis distinguer les variantes d’un résultat pour appliquer le traitement associé à chacune ?

### Traduire une expression ternaire

Dans `add.ts`, l’expression `one < 0 ? one : two` choisit une valeur selon une condition. TypeScript permet d’écrire cette sélection directement dans une expression, alors que Go ne possède pas d’opérateur ternaire. Comment traduire cette expression tout en conservant le choix de la branche et en produisant une valeur utilisable dans l’appel à `DEither.left` ?
