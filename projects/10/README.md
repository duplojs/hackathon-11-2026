# Projet 10

## Problématique

### Composer des résultats asynchrones

Dans `index.ts`, les calculs asynchrones produisent des résultats `Either`. `DEither.rightAsyncPipe` enchaîne les étapes d’un calcul, `DEither.asyncGroup` regroupe plusieurs calculs, puis `DCommon.asyncPipe` compose le traitement final. Comment traduire ces compositions en préservant l’ordre d’exécution asynchrone, la propagation des échecs et le résultat final attendu ?

### Représenter l’asynchronisme TypeScript en Go

TypeScript exprime ici l’asynchronisme avec des fonctions `async`, des valeurs `Promise` et `await`. Go ne possède pas ces constructions ni le même modèle de promesse. Comment traduire ce flux asynchrone en Go sans modifier l’ordre des opérations ni le moment où les résultats deviennent disponibles ?
