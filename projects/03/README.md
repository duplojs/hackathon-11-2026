# Projet 03

## Problématique

### Composer des transformations dans un pipe

Dans `index.ts`, `result` est transmis à `DCommon.pipe`, puis à `DEither.whenIsRight` configuré avec `DArray.coalescing`. Comment traduire une composition où chaque étape reçoit le résultat de l’étape précédente, en respectant l’ordre du pipe et le comportement conditionnel de la transformation ?
